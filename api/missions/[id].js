import { supabase } from '../../lib/supabase.js'
import { withAuth } from '../../lib/auth.js'
import { validateTelegramInitData } from '../../lib/telegram.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { id } = req.query

  // GET - public, no auth required
  if (req.method === 'GET') {
    const { data: mission, error } = await supabase
      .from('missions')
      .select(`
        *,
        creator:users!creator_id(id, username, first_name, photo_url, ton_wallet),
        tiers(*),
        donations(
          id, amount_ton, message, status, created_at,
          donor:users!donor_id(id, username, first_name, photo_url)
        )
      `)
      .eq('id', id)
      .single()

    if (error) return res.status(404).json({ error: 'Mission not found' })

    mission.donations = (mission.donations || [])
      .filter(d => d.status === 'confirmed')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    return res.status(200).json(mission)
  }

  // PATCH - auth required
  if (req.method === 'PATCH') {
    const initData = req.headers['x-telegram-init-data']
    if (!initData) return res.status(401).json({ error: 'Unauthorized' })
    const tgUser = validateTelegramInitData(initData)
    if (!tgUser) return res.status(401).json({ error: 'Invalid auth' })

    const { data: mission } = await supabase
      .from('missions')
      .select('creator_id')
      .eq('id', id)
      .single()

    if (!mission) return res.status(404).json({ error: 'Not found' })
    if (String(mission.creator_id) !== String(tgUser.id)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const { title, description, status } = req.body
    const updates = {}
    if (title) updates.title = title
    if (description) updates.description = description
    if (status === 'cancelled') updates.status = 'cancelled'

    const { data, error } = await supabase
      .from('missions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
