import { supabase } from '../../lib/supabase.js'
import { withAuth } from '../../lib/auth.js'
import { sendTelegramMessage } from '../../lib/telegram.js'

const MINI_APP_URL = process.env.MINI_APP_URL || ''

export default withAuth(async (req, res) => {
  const tgUser = req.telegramUser
  const { id } = req.query

  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })

  const { action, goal_ton, winner_count, weighted, tiers } = req.body

  // Fetch request and verify ownership
  const { data: request } = await supabase
    .from('mission_requests')
    .select('*, requester:users!requester_id(id, username, first_name)')
    .eq('id', id)
    .single()

  if (!request) return res.status(404).json({ error: 'Request not found' })
  if (String(request.creator_id) !== String(tgUser.id)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  if (request.status !== 'pending') {
    return res.status(400).json({ error: 'Request already handled' })
  }

  // REJECT
  if (action === 'reject') {
    await supabase
      .from('mission_requests')
      .update({ status: 'rejected' })
      .eq('id', id)

    const requesterName = request.requester?.username
      ? `@${request.requester.username}`
      : request.requester?.first_name

    await sendTelegramMessage(
      request.requester_id,
      `😔 <b>Mission Request Update</b>\n\n` +
      `Your request was not accepted this time:\n` +
      `"${request.content}"\n\n` +
      `Don't give up — try requesting something else!`
    )

    return res.status(200).json({ status: 'rejected' })
  }

  // ACCEPT — create mission from request
  if (action === 'accept') {
    if (!goal_ton || parseFloat(goal_ton) <= 0) {
      return res.status(400).json({ error: 'goal_ton required to accept' })
    }

    // Create mission
    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .insert({
        creator_id: tgUser.id,
        title: request.content.slice(0, 80),
        description: request.content,
        goal_ton: parseFloat(goal_ton),
        winner_count: winner_count === undefined ? 1 : parseInt(winner_count),
        weighted: weighted !== false
      })
      .select()
      .single()

    if (missionError) return res.status(500).json({ error: missionError.message })

    // Insert tiers if provided
    if (tiers && tiers.length > 0) {
      const tierRows = tiers
        .filter(t => t.name && t.amount_ton)
        .map((t, i) => ({
          mission_id: mission.id,
          name: t.name,
          amount_ton: parseFloat(t.amount_ton),
          sort_order: i
        }))
      if (tierRows.length > 0) await supabase.from('tiers').insert(tierRows)
    }

    // Mark request as accepted
    await supabase
      .from('mission_requests')
      .update({ status: 'accepted', mission_id: mission.id })
      .eq('id', id)

    // Notify requester
    const requesterName = request.requester?.username
      ? `@${request.requester.username}`
      : request.requester?.first_name

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
    await sendTelegramMessage(
      request.requester_id,
      `🎉 <b>Mission Request Accepted!</b>\n\n` +
      `Your request was accepted:\n"${request.content}"\n\n` +
      `Goal: <b>${goal_ton} TON</b>\n\n` +
      `Be the first to support it!`
    )

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: request.requester_id,
        text: '👇 Support the mission now',
        reply_markup: {
          inline_keyboard: [[{
            text: '💜 Support Mission',
            web_app: { url: `${MINI_APP_URL}/mission/${mission.id}` }
          }]]
        }
      })
    })

    return res.status(200).json({ status: 'accepted', mission })
  }

  return res.status(400).json({ error: 'Invalid action' })
})
