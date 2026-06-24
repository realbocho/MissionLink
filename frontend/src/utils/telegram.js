export const tg = window.Telegram?.WebApp

export function initTelegram() {
  if (!tg) return
  tg.ready()
  tg.expand()
  tg.enableClosingConfirmation()
}

// startapp=... 으로 들어온 딥링크 파라미터를 가져온다.
// 텔레그램은 https://t.me/Bot/App?startapp=XXX 로 열었을 때
// initDataUnsafe.start_param 에 XXX 를 넣어준다.
// (일반 브라우저 테스트용으로 ?tgWebAppStartParam= / ?startapp= 쿼리도 fallback으로 지원)
export function getStartParam() {
  if (tg?.initDataUnsafe?.start_param) {
    return tg.initDataUnsafe.start_param
  }
  const params = new URLSearchParams(window.location.search)
  return params.get('tgWebAppStartParam') || params.get('startapp') || null
}

// start_param 을 실제 라우트 경로로 변환한다.
// mission_<id>  -> /mission/<id>
// creator_<id>  -> /creator/<id>
export function resolveStartParamPath(startParam) {
  if (!startParam) return null

  const missionMatch = startParam.match(/^mission_(.+)$/)
  if (missionMatch) return `/mission/${missionMatch[1]}`

  const creatorMatch = startParam.match(/^creator_(.+)$/)
  if (creatorMatch) return `/creator/${creatorMatch[1]}`

  return null
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
  const botUsername = import.meta.env.VITE_BOT_USERNAME || 'MissionLink_Bot'
  const appName = import.meta.env.VITE_APP_NAME || 'MissionLink'
  return `https://t.me/${botUsername}/${appName}?startapp=mission_${missionId}`
}

export function getCreatorDeepLink(creatorId) {
  const botUsername = import.meta.env.VITE_BOT_USERNAME || 'MissionLink_Bot'
  const appName = import.meta.env.VITE_APP_NAME || 'MissionLink'
  return `https://t.me/${botUsername}/${appName}?startapp=creator_${creatorId}`
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
