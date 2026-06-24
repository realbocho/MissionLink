import { supabase } from '../../lib/supabase.js'
import { withAuth } from '../../lib/auth.js'

export default withAuth(async (req, res) => {
  const tgUser = req.telegramUser

  // GET — fetch current user
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', tgUser.id)
      .single()

    if (error) {
      // First visit — upsert and return
      const { data: created } = await supabase
        .from('users')
        .upsert({
          id: tgUser.id,
          username: tgUser.username || null,
          first_name: tgUser.first_name,
          last_name: tgUser.last_name || null,
          photo_url: tgUser.photo_url || null
        }, { onConflict: 'id' })
        .select()
        .single()
      return res.status(200).json(created)
    }

    // Sync latest Telegram profile info
    await supabase.from('users').update({
      username: tgUser.username || null,
      first_name: tgUser.first_name,
      last_name: tgUser.last_name || null,
      photo_url: tgUser.photo_url || null
    }).eq('id', tgUser.id)

    return res.status(200).json(data)
  }

  // PATCH — update wallet address
  if (req.method === 'PATCH') {
    const { ton_wallet } = req.body

    // Basic TON address validation (UQ... or EQ... 48 chars)
    if (ton_wallet !== null && ton_wallet !== '') {
      const isValid = /^[UE]Q[A-Za-z0-9_-]{46}$/.test(ton_wallet)
      if (!isValid) return res.status(400).json({ error: 'Invalid TON wallet address' })
    }

    const { data, error } = await supabase
      .from('users')
      .update({ ton_wallet: ton_wallet || null })
      .eq('id', tgUser.id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  return res.status(405).json({ error: 'Method not allowed' })
})
