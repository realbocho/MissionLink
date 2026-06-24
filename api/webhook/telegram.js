import { supabase } from '../../lib/supabase.js'
import { sendTelegramMessage } from '../../lib/telegram.js'

const MINI_APP_URL = process.env.MINI_APP_URL || 'https://missionlink.vercel.app'
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = req.query.token
  if (token !== BOT_TOKEN.split(':')[1]) return res.status(403).end()

  const update = req.body
  const msg = update.message
  if (!msg || !msg.text) return res.status(200).end()

  const chatId = msg.chat.id
  const text = msg.text.trim()

  if (text === '/start' || text.startsWith('/start ')) {
    const param = text.split(' ')[1]

    if (param && param.startsWith('mission_')) {
      const missionId = param.replace('mission_', '')
      const { data: mission } = await supabase
        .from('missions')
        .select('id, title, description, goal_ton, current_ton, status')
        .eq('id', missionId)
        .single()

      if (mission) {
        const pct = Math.min(100, Math.round((mission.current_ton / mission.goal_ton) * 100))
        await sendTelegramMessage(
          chatId,
          `🎯 <b>${mission.title}</b>\n\n` +
          `${mission.description}\n\n` +
          `💰 ${mission.current_ton} / ${mission.goal_ton} TON (${pct}%)\n` +
          `Status: ${mission.status === 'active' ? '🟢 Live' : '✅ Achieved'}`
        )
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: 'Tap below to support this mission 👇',
            reply_markup: {
              inline_keyboard: [[{
                text: '💜 Support this Mission',
                web_app: { url: `${MINI_APP_URL}/mission/${missionId}` }
              }]]
            }
          })
        })
        return res.status(200).end()
      }
    }

    if (param && param.startsWith('creator_')) {
      const creatorId = param.replace('creator_', '')
      const { data: missions } = await supabase
        .from('missions')
        .select('id, title, current_ton, goal_ton, status, creator:users!creator_id(id, username, first_name)')
        .eq('creator_id', creatorId)
        .in('status', ['active', 'completed'])
        .order('created_at', { ascending: false })
        .limit(10)

      const creator = missions?.[0]?.creator
      const active = missions?.filter(m => m.status === 'active') || []

      if (creator) {
        const name = creator.username ? `@${creator.username}` : creator.first_name
        const missionLines = active.map(m => {
          const pct = Math.min(100, Math.round((m.current_ton / m.goal_ton) * 100))
          return `• <b>${m.title}</b> — ${pct}%`
        }).join('\n')

        await sendTelegramMessage(
          chatId,
          `👤 <b>${name}</b>\n\n` +
          (active.length > 0
            ? `🎯 ${active.length} live mission${active.length > 1 ? 's' : ''}:\n${missionLines}`
            : 'No live missions right now.')
        )
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: 'View full profile 👇',
            reply_markup: {
              inline_keyboard: [[{
                text: `🔍 All missions by ${name}`,
                web_app: { url: `${MINI_APP_URL}/creator/${creatorId}` }
              }]]
            }
          })
        })
        return res.status(200).end()
      }
    }

    // Default welcome
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: '👋 <b>Welcome to MissionLink!</b>\n\nCreate a mission, share the link, and let your fans fund your next adventure.',
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: '✨ Create Mission', web_app: { url: `${MINI_APP_URL}/create` } },
            { text: '👤 My Missions', web_app: { url: `${MINI_APP_URL}/my` } }
          ]]
        }
      })
    })
    return res.status(200).end()
  }

  return res.status(200).end()
}
