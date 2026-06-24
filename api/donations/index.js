import { supabase } from '../../lib/supabase.js'
import { withAuth } from '../../lib/auth.js'

const PLATFORM_FEE = 0.10  // 10%

export default withAuth(async (req, res) => {
  const tgUser = req.telegramUser

  if (req.method === 'POST') {
    const { mission_id, amount_ton, tx_hash, message } = req.body

    if (!mission_id || !amount_ton || !tx_hash) {
      return res.status(400).json({ error: 'mission_id, amount_ton, tx_hash required' })
    }

    const { data: mission } = await supabase
      .from('missions')
      .select('id, status, goal_ton, current_ton')
      .eq('id', mission_id)
      .single()

    if (!mission) return res.status(404).json({ error: 'Mission not found' })
    if (mission.status !== 'active') return res.status(400).json({ error: 'Mission is not active' })

    const { data: existing } = await supabase
      .from('donations')
      .select('id')
      .eq('tx_hash', tx_hash)
      .single()

    if (existing) return res.status(409).json({ error: 'Transaction already registered' })

    // Upsert donor
    await supabase.from('users').upsert({
      id: tgUser.id,
      username: tgUser.username || null,
      first_name: tgUser.first_name,
      last_name: tgUser.last_name || null
    }, { onConflict: 'id' })

    const total = parseFloat(amount_ton)
    const fee = Math.round(total * PLATFORM_FEE * 1e9) / 1e9
    const creatorAmount = Math.round((total - fee) * 1e9) / 1e9

    const { data: donation, error } = await supabase
      .from('donations')
      .insert({
        mission_id,
        donor_id: tgUser.id,
        amount_ton: total,
        creator_amount_ton: creatorAmount,
        fee_amount_ton: fee,
        tx_hash,
        message: message || null,
        status: 'pending'
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(donation)
  }

  return res.status(405).json({ error: 'Method not allowed' })
})
