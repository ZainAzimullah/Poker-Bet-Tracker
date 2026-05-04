/**
 * Short UI sounds. Chip/card clips are CC0 (Kenney); check knock is CC0/public-domain equivalent (BigSoundBank).
 */

const CHIP_URLS = ['/sounds/chip-lay-1.ogg', '/sounds/chip-lay-2.ogg']
const FOLD_URL = '/sounds/card-place-2.ogg'
const KNOCK_URL = '/sounds/door-knock-0095.ogg'
const POT_AWARD_URL = '/sounds/chips-handle-5.ogg'

function playOgg(url, volume) {
  if (typeof window === 'undefined') return
  try {
    const a = new Audio(url)
    a.volume = volume
    void a.play()
  } catch {
    /* ignore */
  }
}

function playShortClip(url, volume, durationMs, startAtSec = 0) {
  if (typeof window === 'undefined') return
  try {
    const a = new Audio(url)
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

export function playPotAwardSound() {
  playOgg(POT_AWARD_URL, 0.55)
}

/**
 * Two quick knocks from a louder CC0 knock recording.
 * Uses plain Audio playback for broad browser reliability.
 */
export function playCheckSound() {
  if (typeof window === 'undefined') return
  try {
    // First transient in this sample is not at t=0, so jump into the louder knock body.
    playShortClip(KNOCK_URL, 1, 170, 0.42)

    window.setTimeout(() => {
      try {
        playShortClip(KNOCK_URL, 1, 170, 0.42)
      } catch {
        /* ignore */
      }
    }, 160)
  } catch {
    /* ignore */
  }
}
