const PREF_KEY = 'nexgn-notif-prefs'

const DEFAULT_PREFS = {
  sound: true,
  snoozeUntil: 0,
}

let audioCtx = null
let customAudio = null
let unlockBound = false

function readPrefs() {
  try {
    const raw = JSON.parse(localStorage.getItem(PREF_KEY) || '{}')
    return {
      sound: typeof raw.sound === 'boolean' ? raw.sound : DEFAULT_PREFS.sound,
      snoozeUntil: Number(raw.snoozeUntil) || 0,
    }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function syncNotificationPrefs({ sound, snoozed, snoozeMinutes, snoozeUntil, preserveActiveSnooze = false } = {}) {
  const prev = readPrefs()
  const next = { ...prev }

  if (typeof sound === 'boolean') next.sound = sound

  if (typeof snoozeUntil === 'number' && Number.isFinite(snoozeUntil)) {
    next.snoozeUntil = snoozeUntil
  } else if (typeof snoozed === 'boolean') {
    if (!snoozed) {
      next.snoozeUntil = 0
    } else if (!preserveActiveSnooze || prev.snoozeUntil <= Date.now()) {
      next.snoozeUntil = Date.now() + (Number(snoozeMinutes) || 15) * 60 * 1000
    }
  }

  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(next))
  } catch {
    /* ignore storage errors */
  }
  return next
}

export function isNotificationSnoozed() {
  return readPrefs().snoozeUntil > Date.now()
}

export function isNotificationSoundEnabled() {
  return readPrefs().sound && !isNotificationSnoozed()
}

function getAudioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  if (!audioCtx) audioCtx = new Ctx()
  return audioCtx
}

// Unlocks Web Audio on the first user tap/click/keypress (required by browser autoplay policies)
export function initNotificationSound() {
  if (unlockBound || typeof window === 'undefined') return
  unlockBound = true

  const unlock = () => {
    const ctx = getAudioContext()
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }
    window.removeEventListener('pointerdown', unlock, true)
    window.removeEventListener('keydown', unlock, true)
  }

  window.addEventListener('pointerdown', unlock, { capture: true, passive: true })
  window.addEventListener('keydown', unlock, { capture: true, passive: true })
}

// Soft two-note chime (C6 -> E6)
function playChime() {
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }

  const now = ctx.currentTime
  const notes = [
    { freq: 1046.5, start: 0, duration: 0.14, gain: 0.12 },
    { freq: 1318.5, start: 0.09, duration: 0.24, gain: 0.1 },
  ]

  notes.forEach(({ freq, start, duration, gain }) => {
    const osc = ctx.createOscillator()
    const amp = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, now + start)

    amp.gain.setValueAtTime(0.0001, now + start)
    amp.gain.exponentialRampToValueAtTime(gain, now + start + 0.015)
    amp.gain.exponentialRampToValueAtTime(0.0001, now + start + duration)

    osc.connect(amp)
    amp.connect(ctx.destination)

    osc.start(now + start)
    osc.stop(now + start + duration + 0.02)
  })
}

/**
 * Plays the notification chime if sound is enabled and notifications are not snoozed.
 * Pass { force: true } to preview the sound in Settings.
 * Pass { audioSrc: '/sounds/notification.mp3' } if you add a custom audio file in public/sounds/.
 */
export function playNotificationSound({ force = false, audioSrc = '' } = {}) {
  if (!force && !isNotificationSoundEnabled()) return

  if (audioSrc) {
    try {
      const fullUrl = new URL(audioSrc, window.location.origin).href
      if (!customAudio || customAudio.src !== fullUrl) {
        customAudio = new Audio(audioSrc)
        customAudio.volume = 0.65
      }
      customAudio.currentTime = 0
      customAudio.play().catch(() => playChime())
      return
    } catch {
      // Fallback to built-in chime
    }
  }

  try {
    playChime()
  } catch {
    /* ignore if audio output is unavailable */
  }
}