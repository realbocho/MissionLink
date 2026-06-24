import { supabase } from '../../lib/supabase.js'
import { withCronAuth } from '../../lib/auth.js'
import { verifyTransaction, tonToNano } from '../../lib/ton.js'
import { sendTelegramMessage } from '../../lib/telegram.js'

export default withCronAuth(async (req, res) => {
  const results = { verified: 0, failed: 0, missions_completed: 0 }

  // Include creator's ton_wallet via the mission → creator join so we can
  // verify against the correct per-mission address instead of a shared env var.
  const { data: pending } = await supabase
    .from('donations')
    .select(`
      *,
      mission:missions(
        id, goal_ton, current_ton, status, creator_id, title, winner_count, weighted,
        creator:users!creator_id(ton_wallet)
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(50)

  if (!pending || pending.length === 0) {
    return res.status(200).json({ message: 'No pending donations', ...results })
  }

  for (const donation of pending) {
    // Bug fix 1 – use THIS mission's creator wallet, not a single shared env var.
    const creatorWallet = donation.mission?.creator?.ton_wallet || ''

    if (!creatorWallet) {
      // Can't verify without a destination address; skip and wait.
      continue
    }

    // Bug fix 2 – verify against creator_amount_ton (90 %), which is the actual
    // value that lands in the creator's wallet, not the full 100 % amount_ton.
    const amountToVerify = donation.creator_amount_ton ?? donation.amount_ton
    const expectedNano = tonToNano(amountToVerify)

    const verification = await verifyTransaction(
      donation.tx_hash,
      creatorWallet,
      expectedNano,
      donation.created_at   // passed to ton.js for time-window fallback matching
    )

    if (verification && verification.valid) {
      await supabase.from('donations').update({ status: 'confirmed' }).eq('id', donation.id)
      results.verified++

      const newTotal = parseFloat(donation.mission.current_ton) + parseFloat(donation.amount_ton)
      if (donation.mission.status === 'active' && newTotal >= parseFloat(donation.mission.goal_ton)) {
        await completeMission(donation.mission)
        results.missions_completed++
      }
    } else if (verification === null) {
      // null = tx not found yet; only expire after 1 hour
      const ageMs = Date.now() - new Date(donation.created_at).getTime()
      if (ageMs > 60 * 60 * 1000) {
        await supabase.from('donations').update({ status: 'failed' }).eq('id', donation.id)
        results.failed++
      }
    } else {
      // valid: false = tx found but amount/address mismatch → mark failed immediately
      await supabase.from('donations').update({ status: 'failed' }).eq('id', donation.id)
      results.failed++
    }
  }

  return res.status(200).json(results)
})

async function completeMission(mission) {
  await supabase
    .from('missions')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', mission.id)

  const { data: donations } = await supabase
    .from('donations')
    .select('donor_id, amount_ton, donor:users!donor_id(id, username, first_name)')
    .eq('mission_id', mission.id)
    .eq('status', 'confirmed')

  if (!donations || donations.length === 0) return

  // Deduplicate donors
  const donorMap = {}
  for (const d of donations) {
    donorMap[d.donor_id] = d.donor
  }
  const uniqueDonorIds = Object.keys(donorMap)

  // ── Case A: Everyone gets rewarded (winner_count === 0) ──────────────────
  if (mission.winner_count === 0) {
    // DM every unique donor the creator's reward message
    for (const donorId of uniqueDonorIds) {
      await supabase.from('winners').insert({ mission_id: mission.id, donor_id: parseInt(donorId) })

      await sendTelegramMessage(
        donorId,
        `🎉 <b>Mission Achieved!</b>\n\n` +
        `<b>${mission.title}</b> has been fully funded!\n\n` +
        `${mission.description}\n\n` +
        `Thank you for your support! 💜`
      )
    }

    // Notify creator — goal reached, no raffle needed
    await sendTelegramMessage(
      mission.creator_id,
      `🚀 <b>Mission Complete!</b>\n\n` +
      `<b>${mission.title}</b> has been fully funded by ${uniqueDonorIds.length} supporter${uniqueDonorIds.length !== 1 ? 's' : ''}!\n\n` +
      `All supporters have been notified automatically.`
    )
    return
  }

  // ── Case B: Raffle among supporters ──────────────────────────────────────
  const ticketPool = []
  for (const d of donations) {
    const tickets = mission.weighted ? Math.max(1, Math.floor(parseFloat(d.amount_ton))) : 1
    for (let i = 0; i < tickets; i++) ticketPool.push(d.donor_id)
  }

  const winnerCount = Math.min(mission.winner_count, uniqueDonorIds.length)
  const winners = []
  const usedIds = new Set()
  for (const id of [...ticketPool].sort(() => Math.random() - 0.5)) {
    if (!usedIds.has(id)) {
      usedIds.add(id)
      winners.push(id)
      if (winners.length >= winnerCount) break
    }
  }

  // DM winners
  for (const winnerId of winners) {
    await supabase.from('winners').insert({ mission_id: mission.id, donor_id: winnerId })

    await sendTelegramMessage(
      winnerId,
      `🎉 <b>You won!</b>\n\n` +
      `You've been selected as a winner for:\n<b>${mission.title}</b>\n\n` +
      `The creator will contact you shortly. Keep an eye on your DMs! 🎊`
    )
  }

  // Notify creator with winner list
  const winnerNames = winners
    .map(id => donorMap[id])
    .map(u => u.username ? `@${u.username}` : u.first_name)
    .join(', ')

  await sendTelegramMessage(
    mission.creator_id,
    `🚀 <b>Mission Complete!</b>\n\n` +
    `<b>${mission.title}</b> has been fully funded!\n\n` +
    `🏆 Winner${winners.length > 1 ? 's' : ''}: ${winnerNames}\n\n` +
    `Reach out to them via Telegram DM to deliver the reward!`
  )
}
