import { loadImage } from './frameCanvas'

const SAMPLE_SIZE = 32

// Analyzes captured photos by sampling their actual pixels (downscaled for
// speed) to get an average brightness/saturation/color, then classifies the
// overall "mood" — this drives the frame recommendations, so it's a real
// (if simple) analysis of the photos rather than a random/fake suggestion.
export const analyzePhotos = async (photos) => {
  let totalR = 0
  let totalG = 0
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
        const g = data[i + 1]
        const b = data[i + 2]
        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)
        totalR += r
        totalG += g
        totalB += b
        totalBrightness += (r + g + b) / 3
        totalSaturation += max === 0 ? 0 : (max - min) / max
        count++
      }
    } catch {
      // skip photos that fail to load
    }
  }

  if (count === 0) {
    return { mood: 'neutral', avgR: 128, avgG: 128, avgB: 128, avgBrightness: 128, avgSaturation: 0 }
  }

  const avgR = totalR / count
  const avgG = totalG / count
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

  return { mood, avgR, avgG, avgB, avgBrightness, avgSaturation }
}

const MOOD_LABELS = {
  monochrome: 'black & white tones',
  'warm-bright': 'warm, bright tones',
  'warm-moody': 'warm, moody tones',
  cool: 'cool tones',
  pastel: 'soft pastel tones',
  neutral: 'balanced tones',
}

export const describeMood = (mood) => MOOD_LABELS[mood] || 'your photos'

// Picks up to `count` templates matching the detected mood, filling any
// remaining slots from the rest of the list so there's always a full set.
export const getRecommendedTemplates = (templates, mood, count = 3) => {
  const matched = templates.filter((t) => t.moods?.includes(mood))
  const rest = templates.filter((t) => !matched.includes(t))
  return [...matched, ...rest].slice(0, count)
}
