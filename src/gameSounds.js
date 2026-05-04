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

function ensureCachedAudio(url) {
  if (typeof window === 'undefined') return null
  if (!audioCache.has(url)) {
    const a = new Audio(url)
    a.preload = 'auto'
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
  PRELOAD_URLS.forEach((url) => ensureCachedAudio(url))
}

export function warmGameSoundsFromGesture() {
  if (typeof window === 'undefined' || soundsWarmFromGesture) return
  soundsWarmFromGesture = true
  PRELOAD_URLS.forEach((url) => {
    const a = ensureCachedAudio(url)
    if (!a) return
    // Prime playback pipeline under user gesture without audible output.
    try {
      a.volume = 0
      const p = a.play()
      if (p && typeof p.then === 'function') {
        void p
          .then(() => {
            a.pause()
            a.currentTime = 0
            a.volume = 1
          })
          .catch(() => {
            a.volume = 1
          })
      } else {
        a.pause()
        a.currentTime = 0
        a.volume = 1
      }
    } catch {
      a.volume = 1
    }
  })
}

function playOgg(url, volume) {
  if (typeof window === 'undefined') return
  try {
    const a = createPlayableAudio(url)
    if (!a) return
    a.volume = volume
    void a.play()
  } catch {
    /* ignore */
  }
}

function playShortClip(url, volume, durationMs, startAtSec = 0) {
  if (typeof window === 'undefined') return
  try {
    const a = createPlayableAudio(url)
    if (!a) return
    a.volume = volume
    const begin = () => {
      try {
        // Start from a louder section of the source.
        a.currentTime = startAtSec
      } catch {
        /* ignore */
      }
      void a.play()
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
  } catch {
    /* ignore */
  }
}

export function playChipSound() {
  const url = CHIP_URLS[Math.floor(Math.random() * CHIP_URLS.length)]
  playOgg(url, 0.42)
}

export function playFoldSound() {
  playOgg(FOLD_URL, 0.38)
}

export function playShuffleSound() {
  // Use the early riffle transient instead of the full long shuffle tail.
  playShortClip(SHUFFLE_URL, 0.62, 430, 0.04)
}

export function playDealCardsSound(count = 1) {
  const n = Math.max(1, Math.floor(count))
  for (let i = 0; i < n; i++) {
    window.setTimeout(() => playOgg(DEAL_CARD_URL, 0.44), i * 120)
  }
}

export function playPotAwardSound() {
  playOgg(POT_AWARD_URL, 0.55)
}

export function playAllInSound() {
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
  if (typeof window === 'undefined') return
  try {
    cancelPendingCheckSound()
    // First transient in this sample is not at t=0, so jump into the louder knock body.
    playShortClip(KNOCK_URL, 1, 170, 0.42)

    checkTailTimeout = window.setTimeout(() => {
      try {
        playShortClip(KNOCK_URL, 1, 170, 0.42)
      } catch {
        /* ignore */
      }
      checkTailTimeout = null
    }, 160)
  } catch {
    /* ignore */
  }
}
