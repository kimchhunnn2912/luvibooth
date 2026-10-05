import { loadImage } from './frameCanvas'

const SAMPLE_SIZE = 32
const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000'

// Downscales/averages pixels to get a rough brightness/saturation/color
// read, then buckets that into a mood. This is a last-resort fallback —
// it has no understanding of photo content at all, just raw color stats —
// used only if the real vision-based analysis (see analyzePhotos below)
// can't reach the server.
const analyzePhotosByColor = async (photos) => {
  let totalR = 0
  let totalB = 0
  let totalBrightness = 0
  let totalSaturation = 0
  let count = 0

  for (const src of photos) {
    if (!src) continue
    try {
      const img = await loadImage(src)
      const canvas = document.createElement('canvas')
      canvas.width = SAMPLE_SIZE
      canvas.height = SAMPLE_SIZE
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
      const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE)

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const b = data[i + 2]
        const max = Math.max(r, data[i + 1], b)
        const min = Math.min(r, data[i + 1], b)
        totalR += r
        totalB += b
        totalBrightness += (r + data[i + 1] + b) / 3
        totalSaturation += max === 0 ? 0 : (max - min) / max
        count++
      }
    } catch {
      // skip photos that fail to load
    }
  }

  if (count === 0) {
    return { mood: 'neutral', occasion: 'none' }
  }

  const avgR = totalR / count
  const avgB = totalB / count
  const avgBrightness = totalBrightness / count
  const avgSaturation = totalSaturation / count

  let mood
  if (avgSaturation < 0.12) {
    mood = 'monochrome'
  } else if (avgR > avgB + 15) {
    mood = avgBrightness > 150 ? 'warm-bright' : 'warm-moody'
  } else if (avgB > avgR + 10) {
    mood = 'cool'
  } else {
    mood = avgBrightness > 160 ? 'pastel' : 'neutral'
  }

  return { mood, occasion: 'none' }
}

// Sends up to two captured photos to the server for real vision-based
// analysis (mood + any holiday occasion actually visible in the photo),
// falling back to the color-only heuristic if the server can't be reached
// or photo analysis isn't configured there.
export const analyzePhotos = async (photos) => {
  try {
    const res = await fetch(`${SERVER_URL}/analyze-photo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photos: photos.filter(Boolean).slice(0, 2) }),
    })
    const data = await res.json()
    if (res.ok && data.mood) return data
  } catch {
    // network error — fall through to the local heuristic
  }
  return analyzePhotosByColor(photos)
}

const MOOD_LABELS = {
  cute: 'cute, playful vibe',
  monochrome: 'black & white tones',
  'warm-bright': 'warm, bright tones',
  'warm-moody': 'warm, moody tones',
  cool: 'cool tones',
  pastel: 'soft pastel tones',
  neutral: 'balanced tones',
}

export const describeMood = (mood, occasion) => {
  if (occasion && occasion !== 'none') return `${occasion} spirit`
  return MOOD_LABELS[mood] || 'your photos'
}

// Picks up to `count` templates, prioritizing a detected occasion (e.g. a
// Christmas frame when the photo actually shows Christmas content) over a
// plain mood match, and filling any remaining slots from the rest of the
// list so there's always a full set.
export const getRecommendedTemplates = (templates, mood, occasion, count = 3) => {
  const occasionMatched =
    occasion && occasion !== 'none' ? templates.filter((t) => t.occasions?.includes(occasion)) : []
  const moodMatched = templates.filter((t) => !occasionMatched.includes(t) && t.moods?.includes(mood))
  const rest = templates.filter((t) => !occasionMatched.includes(t) && !moodMatched.includes(t))
  return [...occasionMatched, ...moodMatched, ...rest].slice(0, count)
}
