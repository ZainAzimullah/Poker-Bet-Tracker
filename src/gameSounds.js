/**
 * Short UI sounds. Chip/card clips are CC0 (Kenney); check knock is CC0/public-domain equivalent (BigSoundBank).
 */

const CHIP_URLS = ['/sounds/chip-lay-1.ogg', '/sounds/chip-lay-2.ogg']
const FOLD_URL = '/sounds/card-place-2.ogg'
const DEAL_CARD_URL = '/sounds/card-place-1.ogg'
const SHUFFLE_URL = '/sounds/card-fan-2.ogg'
const KNOCK_URL = '/sounds/door-knock-0095.ogg'
const POT_AWARD_URL = '/sounds/chips-handle-5.ogg'
const ALL_IN_URL = '/sounds/chips-handle-6.ogg'
const ALL_IN_LAYER_URL = '/sounds/chips-collide-3.ogg'
let checkTailTimeout = null
const audioCache = new Map()
let soundsWarmFromGesture = false
let audioContext = null
let forceSynthFallback = false

const PRELOAD_URLS = [
  ...CHIP_URLS,
  FOLD_URL,
  DEAL_CARD_URL,
  SHUFFLE_URL,
  KNOCK_URL,
  POT_AWARD_URL,
  ALL_IN_URL,
  ALL_IN_LAYER_URL,
]

function supportsOggPlayback() {
  if (typeof window === 'undefined') return false
  const probe = new Audio()
  return probe.canPlayType('audio/ogg; codecs="vorbis"') !== ''
}

const CAN_PLAY_OGG = supportsOggPlayback()

function shouldUseOgg() {
  return CAN_PLAY_OGG && !forceSynthFallback
}

function getAudioContext() {
  if (typeof window === 'undefined') return null
  if (audioContext) return audioContext
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  audioContext = new Ctx()
  return audioContext
}

function synthTone({
  frequency = 440,
  type = 'triangle',
  durationSec = 0.08,
  volume = 0.08,
  attackSec = 0.005,
  releaseSec = 0.06,
  startDelaySec = 0,
}) {
  const ctx = getAudioContext()
  if (!ctx) return
  const now = ctx.currentTime + startDelaySec
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, now)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), now + attackSec)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec + releaseSec)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + durationSec + releaseSec + 0.01)
}

function ensureCachedAudio(url) {
  if (!shouldUseOgg()) return null
  if (typeof window === 'undefined') return null
  if (!audioCache.has(url)) {
    const a = new Audio(url)
    a.preload = 'auto'
    a.playsInline = true
    a.load()
    audioCache.set(url, a)
  }
  return audioCache.get(url)
}

function createPlayableAudio(url) {
  const cached = ensureCachedAudio(url)
  if (!cached) return null
  // Clone from preloaded element to reduce startup latency.
  return cached.cloneNode(true)
}

export function initGameSounds() {
  if (typeof window === 'undefined') return
  if (shouldUseOgg()) {
    PRELOAD_URLS.forEach((url) => ensureCachedAudio(url))
  }
}

export function warmGameSoundsFromGesture() {
  if (typeof window === 'undefined' || soundsWarmFromGesture) return
  soundsWarmFromGesture = true
  const ctx = getAudioContext()
  if (ctx && typeof ctx.resume === 'function' && ctx.state === 'suspended') {
    void ctx.resume().catch(() => {})
  }
}

function playOgg(url, volume) {
  if (typeof window === 'undefined') return
  if (!shouldUseOgg()) return
  try {
    const a = createPlayableAudio(url)
    if (!a) return
    a.volume = volume
    const p = a.play()
    if (p && typeof p.catch === 'function') {
      void p.catch(() => {
        forceSynthFallback = true
      })
    }
  } catch {
    forceSynthFallback = true
  }
}

function playShortClip(url, volume, durationMs, startAtSec = 0) {
  if (typeof window === 'undefined') return
  if (!shouldUseOgg()) return false
  try {
    const a = createPlayableAudio(url)
    if (!a) return false
    a.volume = volume
    const begin = () => {
      try {
        // Start from a louder section of the source.
        a.currentTime = startAtSec
      } catch {
        /* ignore */
      }
      const p = a.play()
      if (p && typeof p.catch === 'function') {
        void p.catch(() => {
          forceSynthFallback = true
        })
      }
      window.setTimeout(() => {
        try {
          a.pause()
          a.currentTime = 0
        } catch {
          /* ignore */
        }
      }, durationMs)
    }

    // currentTime seeks are more reliable after metadata is ready.
    if (a.readyState >= 1) {
      begin()
    } else {
      a.addEventListener('loadedmetadata', begin, { once: true })
      a.load()
    }
    return true
  } catch {
    forceSynthFallback = true
    return false
  }
}

export function playChipSound() {
  if (!shouldUseOgg()) {
    synthTone({ frequency: 360, type: 'square', durationSec: 0.05, volume: 0.045 })
    synthTone({ frequency: 520, type: 'triangle', durationSec: 0.03, volume: 0.028, startDelaySec: 0.02 })
    return
  }
  const url = CHIP_URLS[Math.floor(Math.random() * CHIP_URLS.length)]
  playOgg(url, 0.42)
}

export function playFoldSound() {
  if (!shouldUseOgg()) {
    synthTone({ frequency: 210, type: 'sawtooth', durationSec: 0.08, volume: 0.04 })
    return
  }
  playOgg(FOLD_URL, 0.38)
}

export function playShuffleSound() {
  if (!shouldUseOgg()) {
    synthTone({ frequency: 300, type: 'sawtooth', durationSec: 0.06, volume: 0.03 })
    synthTone({ frequency: 420, type: 'square', durationSec: 0.05, volume: 0.022, startDelaySec: 0.05 })
    synthTone({ frequency: 260, type: 'triangle', durationSec: 0.05, volume: 0.02, startDelaySec: 0.1 })
    return
  }
  // Strong riffle character from later in the clip, layered for impact.
  playShortClip(SHUFFLE_URL, 1, 760, 0.34)
  window.setTimeout(() => playShortClip(SHUFFLE_URL, 0.88, 520, 0.46), 70)
  window.setTimeout(() => playShortClip(SHUFFLE_URL, 0.52, 360, 0.62), 145)
}

export function playDealCardsSound(count = 1) {
  if (!shouldUseOgg()) {
    const n = Math.max(1, Math.floor(count))
    for (let i = 0; i < n; i++) {
      synthTone({
        frequency: 280 + i * 18,
        type: 'square',
        durationSec: 0.03,
        volume: 0.018,
        startDelaySec: i * 0.09,
      })
    }
    return
  }
  const n = Math.max(1, Math.floor(count))
  for (let i = 0; i < n; i++) {
    window.setTimeout(() => playOgg(DEAL_CARD_URL, 0.44), i * 120)
  }
}

export function playPotAwardSound() {
  if (!shouldUseOgg()) {
    synthTone({ frequency: 420, type: 'triangle', durationSec: 0.07, volume: 0.05 })
    synthTone({ frequency: 620, type: 'triangle', durationSec: 0.09, volume: 0.035, startDelaySec: 0.04 })
    return
  }
  playOgg(POT_AWARD_URL, 0.55)
}

export function playAllInSound() {
  if (!shouldUseOgg()) {
    synthTone({ frequency: 170, type: 'sawtooth', durationSec: 0.1, volume: 0.06 })
    synthTone({ frequency: 240, type: 'square', durationSec: 0.08, volume: 0.048, startDelaySec: 0.03 })
    synthTone({ frequency: 320, type: 'triangle', durationSec: 0.07, volume: 0.036, startDelaySec: 0.07 })
    return
  }
  // Multi-layer burst so it sounds like 2-3 piles being shoved in.
  playOgg(ALL_IN_URL, 0.62)
  window.setTimeout(() => playOgg(ALL_IN_LAYER_URL, 0.45), 25)
  window.setTimeout(() => playOgg(ALL_IN_URL, 0.35), 65)
  window.setTimeout(() => playOgg(ALL_IN_LAYER_URL, 0.28), 105)
  window.setTimeout(() => playOgg(ALL_IN_URL, 0.42), 150)
  window.setTimeout(() => playOgg(ALL_IN_LAYER_URL, 0.33), 195)
  window.setTimeout(() => playOgg(ALL_IN_URL, 0.26), 240)
  window.setTimeout(() => playOgg(ALL_IN_LAYER_URL, 0.2), 320)
}

export function cancelPendingCheckSound() {
  if (checkTailTimeout != null) {
    clearTimeout(checkTailTimeout)
    checkTailTimeout = null
  }
}

/**
 * Two quick knocks from a louder CC0 knock recording.
 * Uses plain Audio playback for broad browser reliability.
 */
export function playCheckSound() {
  if (!shouldUseOgg()) {
    cancelPendingCheckSound()
    synthTone({ frequency: 600, type: 'square', durationSec: 0.03, volume: 0.03 })
    checkTailTimeout = window.setTimeout(() => {
      synthTone({ frequency: 560, type: 'square', durationSec: 0.03, volume: 0.026 })
      checkTailTimeout = null
    }, 130)
    return
  }
  if (typeof window === 'undefined') return
  try {
    cancelPendingCheckSound()
    // First transient in this sample is not at t=0, so jump into the louder knock body.
    const started = playShortClip(KNOCK_URL, 1, 170, 0.42)
    if (!started || !shouldUseOgg()) {
      synthTone({ frequency: 600, type: 'square', durationSec: 0.03, volume: 0.03 })
      checkTailTimeout = window.setTimeout(() => {
        synthTone({ frequency: 560, type: 'square', durationSec: 0.03, volume: 0.026 })
        checkTailTimeout = null
      }, 130)
      return
    }

    checkTailTimeout = window.setTimeout(() => {
      try {
        if (!playShortClip(KNOCK_URL, 1, 170, 0.42) || !shouldUseOgg()) {
          synthTone({ frequency: 560, type: 'square', durationSec: 0.03, volume: 0.026 })
        }
      } catch {
        /* ignore */
      }
      checkTailTimeout = null
    }, 160)
  } catch {
    /* ignore */
  }
}
