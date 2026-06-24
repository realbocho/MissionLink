import { supabase } from '../../lib/supabase.js'
import { withAuth } from '../../lib/auth.js'

export default withAuth(async (req, res) => {
  const tgUser = req.telegramUser

  // GET - list missions (by creator or all active)
  if (req.method === 'GET') {
    const { creator_id, status = 'active' } = req.query

    let query = supabase
      .from('missions')
      .select(`
        *,
        creator:users!creator_id(id, username, first_name, photo_url),
        tiers(*),
        donations(count)
      `)
      .order('created_at', { ascending: false })

    if (creator_id) query = query.eq('creator_id', creator_id)
    else query = query.eq('status', status)

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // POST - create mission
  if (req.method === 'POST') {
    const { title, description, goal_ton, winner_count, weighted, tiers } = req.body

    if (!title || !description || !goal_ton) {
      return res.status(400).json({ error: 'title, description, goal_ton required' })
    }

    // Upsert user first
    await supabase.from('users').upsert({
      id: tgUser.id,
      username: tgUser.username || null,
      first_name: tgUser.first_name,
      last_name: tgUser.last_name || null
    }, { onConflict: 'id' })

    // Create mission
    const { data: mission, error } = await supabase
      .from('missions')
      .insert({
        creator_id: tgUser.id,
        title,
        description,
        goal_ton: parseFloat(goal_ton),
        winner_count: parseInt(winner_count) || 1,
        weighted: weighted !== false
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })

    // Insert tiers if provided
    if (tiers && tiers.length > 0) {
      const tierRows = tiers.map((t, i) => ({
        mission_id: mission.id,
        name: t.name,
        amount_ton: parseFloat(t.amount_ton),
        sort_order: i
      }))
      await supabase.from('tiers').insert(tierRows)
    }

    return res.status(201).json(mission)
  }

  return res.status(405).json({ error: 'Method not allowed' })
})
