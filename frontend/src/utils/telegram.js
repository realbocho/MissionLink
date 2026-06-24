export const tg = window.Telegram?.WebApp

export function initTelegram() {
  if (!tg) return
  tg.ready()
  tg.expand()
  tg.enableClosingConfirmation()
}

export function getTgUser() {
  return tg?.initDataUnsafe?.user || null
}

export function haptic(type = 'light') {
  try {
    const impact = ['light', 'medium', 'heavy', 'rigid', 'soft']
    const notification = ['success', 'error', 'warning']
    if (impact.includes(type)) {
      tg?.HapticFeedback?.impactOccurred(type)
    } else if (notification.includes(type)) {
      tg?.HapticFeedback?.notificationOccurred(type)
    }
  } catch {}
}

export function showAlert(msg) {
  if (tg) {
    tg.showAlert(msg)
  } else {
    alert(msg)
  }
}

export function showConfirm(msg) {
  return new Promise(resolve => {
    if (tg) {
      tg.showConfirm(msg, resolve)
    } else {
      resolve(window.confirm(msg))
    }
  })
}

export function setMainButton(text, onClick, opts = {}) {
  if (!tg) return
  tg.MainButton.setText(text)
  tg.MainButton.onClick(onClick)
  if (opts.color) tg.MainButton.color = opts.color
  tg.MainButton.show()
  return () => {
    tg.MainButton.offClick(onClick)
    tg.MainButton.hide()
  }
}

export function setBackButton(onClick) {
  if (!tg) return
  tg.BackButton.onClick(onClick)
  tg.BackButton.show()
  return () => {
    tg.BackButton.offClick(onClick)
    tg.BackButton.hide()
  }
}

export function getMissionDeepLink(missionId) {
  const botUsername = import.meta.env.VITE_BOT_USERNAME || 'MissionLinkBot'
  return `https://t.me/${botUsername}?startapp=mission_${missionId}`
}

export function getCreatorDeepLink(creatorId) {
  const botUsername = import.meta.env.VITE_BOT_USERNAME || 'MissionLinkBot'
  return `https://t.me/${botUsername}?startapp=creator_${creatorId}`
}

export function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text)
  } else {
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }
}
