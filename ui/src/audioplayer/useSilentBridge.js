import { useEffect, useRef } from 'react'

// Generate a minimal 1-second silent WAV in memory (no server file needed)
function createSilentWavUrl() {
  const sampleRate = 8000
  const numSamples = sampleRate // 1 second
  const dataSize = numSamples * 2 // 16-bit
  const buffer = new ArrayBuffer(44 + dataSize)
  const v = new DataView(buffer)

  const w = (o, s) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i))
  }

  w(0, 'RIFF')
  v.setUint32(4, 36 + dataSize, true)
  w(8, 'WAVE')
  w(12, 'fmt ')
  v.setUint32(16, 16, true) // chunk size
  v.setUint16(20, 1, true) // PCM
  v.setUint16(22, 1, true) // mono
  v.setUint32(24, sampleRate, true)
  v.setUint32(28, sampleRate * 2, true) // byte rate
  v.setUint16(32, 2, true) // block align
  v.setUint16(34, 16, true) // bits per sample
  w(36, 'data')
  v.setUint32(40, dataSize, true)
  // rest is zeros = silence

  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }))
}

let silentUrl = null

/**
 * Keeps a silent audio loop playing to prevent the OS from killing the page
 * during track transitions on mobile. When one track ends and the next loads,
 * there's a brief gap with no active audio — iOS/Android use that gap to
 * suspend the page. This bridge fills that gap.
 */
const useSilentBridge = ({ isPlaying, hasQueue }) => {
  const audioRef = useRef(null)
  const stopTimerRef = useRef(null)

  // Create silent audio element once
  useEffect(() => {
    if (!silentUrl) silentUrl = createSilentWavUrl()

    const audio = new Audio()
    audio.src = silentUrl
    audio.loop = true
    audio.volume = 0
    audioRef.current = audio

    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      audioRef.current = null
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying && hasQueue) {
      // Playing: ensure bridge is active, cancel any pending stop
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current)
        stopTimerRef.current = null
      }
      if (audio.paused) {
        audio.play().catch(() => {
          // Autoplay blocked — will work after next user interaction
        })
      }
    } else if (!isPlaying && hasQueue) {
      // Paused but queue exists: keep bridge alive for 30s
      // to survive track transitions (brief pause between tracks)
      if (!stopTimerRef.current) {
        stopTimerRef.current = setTimeout(() => {
          audio.pause()
          stopTimerRef.current = null
        }, 30000)
      }
    } else {
      // No queue: stop immediately
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current)
        stopTimerRef.current = null
      }
      audio.pause()
    }
  }, [isPlaying, hasQueue])
}

export default useSilentBridge
