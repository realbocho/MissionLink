import { validateTelegramInitData } from './telegram.js'

export function withAuth(handler) {
  return async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end()
    }

    const initData = req.headers['x-telegram-init-data']
    if (!initData) {
      return res.status(401).json({ error: 'Missing Telegram auth' })
    }

    const user = validateTelegramInitData(initData)
    if (!user) {
      return res.status(401).json({ error: 'Invalid Telegram auth' })
    }

    req.telegramUser = user
    return handler(req, res)
  }
}

// For cron endpoints - validate secret
export function withCronAuth(handler) {
  return async (req, res) => {
    const secret = req.headers['x-cron-secret']
    if (secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    return handler(req, res)
  }
}
