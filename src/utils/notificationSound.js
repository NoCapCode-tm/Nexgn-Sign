const PREF_KEY = 'nexgn-notif-prefs'
const DEFAULT_PRESET = 'ink' // Options: 'seal' | 'ink' | 'prism'
const MASTER_VOLUME = 0.52 // 0.0 – 1.0 (adjust here if you ever want it softer/louder)

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

export function syncNotificationPrefs({
  sound,
  snoozed,
  snoozeMinutes,
  snoozeUntil,
  preserveActiveSnooze = false,
} = {}) {
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

/* ---------- Custom Nexgn Sound Synthesizers ---------- */

function createOutputChain(ctx, cutoff = 3600) {
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(cutoff, ctx.currentTime)
  filter.Q.setValueAtTime(0.7, ctx.currentTime)

  const compressor = ctx.createDynamicsCompressor()
  compressor.threshold.setValueAtTime(-10, ctx.currentTime)
  compressor.knee.setValueAtTime(12, ctx.currentTime)
  compressor.ratio.setValueAtTime(4, ctx.currentTime)
  compressor.attack.setValueAtTime(0.003, ctx.currentTime)
  compressor.release.setValueAtTime(0.12, ctx.currentTime)

  const master = ctx.createGain()
  master.gain.setValueAtTime(MASTER_VOLUME, ctx.currentTime)

  filter.connect(compressor)
  compressor.connect(master)
  master.connect(ctx.destination)
  return filter
}

function playTone(ctx, dest, { freq, endFreq, type = 'sine', start = 0, attack = 0.01, duration = 0.2, gain = 0.3 }) {
  const now = ctx.currentTime + start
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(freq, now)
  if (endFreq) {
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration)
  }

  amp.gain.setValueAtTime(0.0001, now)
  amp.gain.exponentialRampToValueAtTime(gain, now + attack)
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  osc.connect(amp)
  amp.connect(dest)

  osc.start(now)
  osc.stop(now + duration + 0.025)
}

// 1. "ink" — Crisp, warm minimal pluck (default)
function synthInk(ctx) {
  const now = ctx.currentTime
  const filter = createOutputChain(ctx, 3200)
  filter.frequency.exponentialRampToValueAtTime(1450, now + 0.28)

  playTone(ctx, filter, { freq: 493.88, type: 'triangle', start: 0, attack: 0.005, duration: 0.12, gain: 0.42 })
  playTone(ctx, filter, { freq: 739.99, type: 'sine', start: 0.06, attack: 0.005, duration: 0.16, gain: 0.4 })
  playTone(ctx, filter, { freq: 987.77, type: 'sine', start: 0.115, attack: 0.006, duration: 0.24, gain: 0.36 })
}

// 2. "seal" — Tactile soft tap + Dmaj7 frosted-glass shimmer
function synthSeal(ctx) {
  const bus = createOutputChain(ctx, 3400)
  playTone(ctx, bus, { freq: 240, endFreq: 85, type: 'triangle', start: 0, attack: 0.004, duration: 0.04, gain: 0.22 })
  playTone(ctx, bus, { freq: 587.33, type: 'sine', start: 0.015, attack: 0.01, duration: 0.18, gain: 0.34 })
  playTone(ctx, bus, { freq: 880.0, type: 'sine', start: 0.075, attack: 0.01, duration: 0.22, gain: 0.32 })
  playTone(ctx, bus, { freq: 1108.73, type: 'triangle', start: 0.135, attack: 0.012, duration: 0.3, gain: 0.28 })
  playTone(ctx, bus, { freq: 1479.98, type: 'sine', start: 0.145, attack: 0.02, duration: 0.28, gain: 0.11 })
}

// 3. "prism" — Calm, airy detuned fifth bloom
function synthPrism(ctx) {
  const bus = createOutputChain(ctx, 3000)
  playTone(ctx, bus, { freq: 622.25, type: 'sine', start: 0, attack: 0.02, duration: 0.34, gain: 0.28 })
  playTone(ctx, bus, { freq: 625.0, type: 'sine', start: 0, attack: 0.025, duration: 0.34, gain: 0.16 })
  playTone(ctx, bus, { freq: 932.33, type: 'sine', start: 0.07, attack: 0.02, duration: 0.36, gain: 0.26 })
  playTone(ctx, bus, { freq: 1244.51, type: 'triangle', start: 0.11, attack: 0.03, duration: 0.32, gain: 0.14 })
}

const PRESETS = {
  ink: synthInk,
  seal: synthSeal,
  prism: synthPrism,
}

/**
 * Plays Nexgn's custom notification signature if sound is enabled and not snoozed.
 * Pass { force: true } for Settings previews, or { preset: 'ink' | 'seal' | 'prism' }.
 */
export function playNotificationSound({ force = false, preset = DEFAULT_PRESET, audioSrc = '' } = {}) {
  if (!force && !isNotificationSoundEnabled()) return

  const runSynth = () => {
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const play = () => (PRESETS[preset] ?? PRESETS.ink)(ctx)
      if (ctx.state === 'suspended') {
        ctx.resume().then(play).catch(() => {})
      } else {
        play()
      }
    } catch {
      /* ignore if audio output is unavailable */
    }
  }

  if (audioSrc) {
    try {
      const fullUrl = new URL(audioSrc, window.location.origin).href
      if (!customAudio || customAudio.src !== fullUrl) {
        customAudio = new Audio(audioSrc)
        customAudio.volume = MASTER_VOLUME
      }
      customAudio.currentTime = 0
      customAudio.play().catch(runSynth)
      return
    } catch {
      // Fallback to built-in signature
    }
  }

  runSynth()
}