import type { AdminOrderSummaryDto } from '../../lib/types'

type Listener = (order: AdminOrderSummaryDto) => void

const listeners = new Set<Listener>()

/** New paid orders, from RealtimeBridge to whatever shows the alert (the admin toast). */
export const orderAlerts = {
  emit(order: AdminOrderSummaryDto) {
    listeners.forEach((l) => l(order))
  },
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

// Browsers only allow audio after a user gesture, so the context is created by enableSound (a click handler).
let audio: AudioContext | null = null

/** Call from a click handler. Returns whether sound can now play. */
export async function enableSound(): Promise<boolean> {
  try {
    if (typeof window.AudioContext !== 'function') return false
    audio ??= new window.AudioContext()
    await audio.resume()
    return audio.state === 'running'
  } catch {
    return false
  }
}

/** A short two-tone ding. Never throws; false means the browser didn't let it play. */
export async function playOrderSound(): Promise<boolean> {
  try {
    if (!audio || audio.state !== 'running') return false
    const now = audio.currentTime
    for (const [i, freq] of [880, 1320].entries()) {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + i * 0.18)
      gain.gain.exponentialRampToValueAtTime(0.3, now + i * 0.18 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.35)
      osc.connect(gain).connect(audio.destination)
      osc.start(now + i * 0.18)
      osc.stop(now + i * 0.18 + 0.4)
    }
    return true
  } catch {
    return false
  }
}

const SOUND_KEY = 'adminSound'

export function readSoundPref(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off'
  } catch {
    return true
  }
}

export function writeSoundPref(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off')
  } catch {
    /* storage unavailable */
  }
}
