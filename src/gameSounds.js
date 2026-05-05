/**
 * Short UI sounds. Chip/card clips are CC0 (Kenney); check knock is CC0/public-domain equivalent (BigSoundBank).
 *
 * Web Audio API pipeline: sound files are fetched once, decoded into AudioBuffers,
 * and played via AudioBufferSourceNode. This avoids the metadata-load + seek races
 * that plague HTMLAudioElement playback on mobile.
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
const bufferCache = new Map()
const inflightLoads = new Map()
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

function loadBuffer(url) {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (!shouldUseOgg()) return Promise.resolve(null)
  if (bufferCache.has(url)) return Promise.resolve(bufferCache.get(url))
  if (inflightLoads.has(url)) return inflightLoads.get(url)
  const ctx = getAudioContext()
  if (!ctx) return Promise.resolve(null)
  const p = fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`fetch ${url}: ${r.status}`)
      return r.arrayBuffer()
    })
    .then(
      (arr) =>
        new Promise((resolve, reject) => {
          // Some Safari versions only support the callback form.
          try {
            const maybe = ctx.decodeAudioData(arr, resolve, reject)
            if (maybe && typeof maybe.then === 'function') {
              maybe.then(resolve, reject)
            }
          } catch (err) {
            reject(err)
          }
        }),
    )
    .then((buffer) => {
      bufferCache.set(url, buffer)
      inflightLoads.delete(url)
      return buffer
    })
    .catch(() => {
      forceSynthFallback = true
      inflightLoads.delete(url)
      return null
    })
  inflightLoads.set(url, p)
  return p
}

function playBuffer(url, { volume = 1, offset = 0, duration } = {}) {
  if (typeof window === 'undefined') return false
  if (!shouldUseOgg()) return false
  const ctx = getAudioContext()
  if (!ctx) return false
  const buffer = bufferCache.get(url)
  if (!buffer) {
    // Kick off a load so the next call can play; this call falls back to synth.
    void loadBuffer(url)
    return false
  }
  try {
    const source = ctx.createBufferSource()
    const gain = ctx.createGain()
    source.buffer = buffer
    gain.gain.value = volume
    source.connect(gain)
    gain.connect(ctx.destination)
    if (typeof duration === 'number') {
      source.start(0, offset, duration)
    } else if (offset > 0) {
      source.start(0, offset)
    } else {
      source.start(0)
    }
    return true
  } catch {
    forceSynthFallback = true
    return false
  }
}

export function initGameSounds() {
  if (typeof window === 'undefined') return
  if (!shouldUseOgg()) return
  PRELOAD_URLS.forEach((url) => {
    void loadBuffer(url)
  })
}

export function warmGameSoundsFromGesture() {
  if (typeof window === 'undefined' || soundsWarmFromGesture) return
  soundsWarmFromGesture = true
  const ctx = getAudioContext()
  if (ctx && typeof ctx.resume === 'function' && ctx.state === 'suspended') {
    void ctx.resume().catch(() => {})
  }
}

export function playChipSound() {
  const url = CHIP_URLS[Math.floor(Math.random() * CHIP_URLS.length)]
  if (playBuffer(url, { volume: 0.42 })) return
  synthTone({ frequency: 360, type: 'square', durationSec: 0.05, volume: 0.045 })
  synthTone({ frequency: 520, type: 'triangle', durationSec: 0.03, volume: 0.028, startDelaySec: 0.02 })
}

export function playFoldSound() {
  if (playBuffer(FOLD_URL, { volume: 0.38 })) return
  synthTone({ frequency: 210, type: 'sawtooth', durationSec: 0.08, volume: 0.04 })
}

export function playShuffleSound() {
  if (playBuffer(SHUFFLE_URL, { volume: 1, offset: 0.34, duration: 0.76 })) {
    window.setTimeout(
      () => playBuffer(SHUFFLE_URL, { volume: 0.88, offset: 0.46, duration: 0.52 }),
      70,
    )
    window.setTimeout(
      () => playBuffer(SHUFFLE_URL, { volume: 0.52, offset: 0.62, duration: 0.36 }),
      145,
    )
    return
  }
  synthTone({ frequency: 300, type: 'sawtooth', durationSec: 0.06, volume: 0.03 })
  synthTone({ frequency: 420, type: 'square', durationSec: 0.05, volume: 0.022, startDelaySec: 0.05 })
  synthTone({ frequency: 260, type: 'triangle', durationSec: 0.05, volume: 0.02, startDelaySec: 0.1 })
}

export function playDealCardsSound(count = 1) {
  const n = Math.max(1, Math.floor(count))
  if (shouldUseOgg() && bufferCache.has(DEAL_CARD_URL)) {
    for (let i = 0; i < n; i++) {
      window.setTimeout(() => playBuffer(DEAL_CARD_URL, { volume: 0.44 }), i * 120)
    }
    return
  }
  for (let i = 0; i < n; i++) {
    synthTone({
      frequency: 280 + i * 18,
      type: 'square',
      durationSec: 0.03,
      volume: 0.018,
      startDelaySec: i * 0.09,
    })
  }
}

export function playPotAwardSound() {
  if (playBuffer(POT_AWARD_URL, { volume: 0.55 })) return
  synthTone({ frequency: 420, type: 'triangle', durationSec: 0.07, volume: 0.05 })
  synthTone({ frequency: 620, type: 'triangle', durationSec: 0.09, volume: 0.035, startDelaySec: 0.04 })
}

export function playAllInSound() {
  if (playBuffer(ALL_IN_URL, { volume: 0.62 })) {
    window.setTimeout(() => playBuffer(ALL_IN_LAYER_URL, { volume: 0.45 }), 25)
    window.setTimeout(() => playBuffer(ALL_IN_URL, { volume: 0.35 }), 65)
    window.setTimeout(() => playBuffer(ALL_IN_LAYER_URL, { volume: 0.28 }), 105)
    window.setTimeout(() => playBuffer(ALL_IN_URL, { volume: 0.42 }), 150)
    window.setTimeout(() => playBuffer(ALL_IN_LAYER_URL, { volume: 0.33 }), 195)
    window.setTimeout(() => playBuffer(ALL_IN_URL, { volume: 0.26 }), 240)
    window.setTimeout(() => playBuffer(ALL_IN_LAYER_URL, { volume: 0.2 }), 320)
    return
  }
  synthTone({ frequency: 170, type: 'sawtooth', durationSec: 0.1, volume: 0.06 })
  synthTone({ frequency: 240, type: 'square', durationSec: 0.08, volume: 0.048, startDelaySec: 0.03 })
  synthTone({ frequency: 320, type: 'triangle', durationSec: 0.07, volume: 0.036, startDelaySec: 0.07 })
}

export function cancelPendingCheckSound() {
  if (checkTailTimeout != null) {
    clearTimeout(checkTailTimeout)
    checkTailTimeout = null
  }
}

/**
 * Two quick knocks. The source clip's first transient is around 0.42s in,
 * so we offset playback to the louder body of the knock.
 */
export function playCheckSound() {
  cancelPendingCheckSound()
  const KNOCK_OFFSET = 0.42
  const KNOCK_DURATION = 0.17
  const played = playBuffer(KNOCK_URL, {
    volume: 1,
    offset: KNOCK_OFFSET,
    duration: KNOCK_DURATION,
  })
  if (!played) {
    synthTone({ frequency: 600, type: 'square', durationSec: 0.03, volume: 0.03 })
    checkTailTimeout = window.setTimeout(() => {
      synthTone({ frequency: 560, type: 'square', durationSec: 0.03, volume: 0.026 })
      checkTailTimeout = null
    }, 130)
    return
  }
  checkTailTimeout = window.setTimeout(() => {
    const ok = playBuffer(KNOCK_URL, {
      volume: 1,
      offset: KNOCK_OFFSET,
      duration: KNOCK_DURATION,
    })
    if (!ok) {
      synthTone({ frequency: 560, type: 'square', durationSec: 0.03, volume: 0.026 })
    }
    checkTailTimeout = null
  }, 160)
}
