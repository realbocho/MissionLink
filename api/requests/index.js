import { supabase } from '../../lib/supabase.js'
import { withAuth } from '../../lib/auth.js'
import { sendTelegramMessage } from '../../lib/telegram.js'

const MINI_APP_URL = process.env.MINI_APP_URL || ''
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

export default withAuth(async (req, res) => {
  const tgUser = req.telegramUser

  // GET - creator fetches their incoming requests
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('mission_requests')
      .select(`*, requester:users!requester_id(id, username, first_name, photo_url)`)
      .eq('creator_id', tgUser.id)
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // POST - fan submits a request
  if (req.method === 'POST') {
    const { creator_id, content } = req.body

    if (!creator_id || !content?.trim()) {
      return res.status(400).json({ error: 'creator_id and content required' })
    }
    if (String(creator_id) === String(tgUser.id)) {
      return res.status(400).json({ error: 'Cannot request from yourself' })
    }
    if (content.trim().length > 300) {
      return res.status(400).json({ error: 'Content too long (max 300 chars)' })
    }

    await supabase.from('users').upsert({
      id: tgUser.id,
      username: tgUser.username || null,
      first_name: tgUser.first_name,
      last_name: tgUser.last_name || null
    }, { onConflict: 'id' })

    const { data, error } = await supabase
      .from('mission_requests')
      .insert({ creator_id, requester_id: tgUser.id, content: content.trim() })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })

    const requesterName = tgUser.username ? `@${tgUser.username}` : tgUser.first_name
    await sendTelegramMessage(
      creator_id,
      `📬 <b>New Mission Request!</b>\n\n` +
      `<b>${requesterName}</b> wants you to do:\n\n` +
      `"${content.trim()}"\n\n` +
      `Open your missions to accept or reject it.`
    )

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: creator_id,
        text: '👇 Review the request',
        reply_markup: {
          inline_keyboard: [[{
            text: '📋 View Requests',
            web_app: { url: `${MINI_APP_URL}/my` }
          }]]
        }
      })
    })

    return res.status(201).json(data)
  }

  return res.status(405).json({ error: 'Method not allowed' })
})
