import { setWebhook } from '../../lib/telegram.js'

export default async function handler(req, res) {
  // Simple GET to trigger webhook setup - protect with token check
  const token = req.query.token
  if (token !== process.env.CRON_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' })
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const host = req.headers.host || process.env.MINI_APP_URL?.replace('https://', '')
  const webhookUrl = `https://${host}/api/webhook/telegram?token=${botToken.split(':')[1]}`

  const result = await setWebhook(webhookUrl)
  return res.status(200).json(result)
}
