export const SLOT_WIDTH = 160
export const SLOT_HEIGHT = 120
export const FRAME_PADDING = 12
export const FRAME_GAP = 12
export const SLOT_RADIUS = 12

export const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

export const tracePath = (ctx, x, y, w, h, r) => {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export const drawImageCover = (ctx, img, x, y, w, h) => {
  const scale = Math.max(w / img.width, h / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

export const getStripCanvasSize = (layout) => {
  const rows = Math.ceil(layout.boxes / layout.cols)
  const width = FRAME_PADDING * 2 + layout.cols * SLOT_WIDTH + (layout.cols - 1) * FRAME_GAP
  const height = FRAME_PADDING * 2 + rows * SLOT_HEIGHT + (rows - 1) * FRAME_GAP
  return { width, height }
}

// Draws the border + photo grid onto an existing canvas context, leaving the
// caller free to layer more (strokes, stickers, text) on top afterward.
export const drawStripBase = async (ctx, { layout, photos, borderColor }) => {
  const { width, height } = getStripCanvasSize(layout)
  ctx.fillStyle = borderColor
  ctx.fillRect(0, 0, width, height)

  for (let i = 0; i < layout.boxes; i++) {
    const col = i % layout.cols
    const row = Math.floor(i / layout.cols)
    const x = FRAME_PADDING + col * (SLOT_WIDTH + FRAME_GAP)
    const y = FRAME_PADDING + row * (SLOT_HEIGHT + FRAME_GAP)

    tracePath(ctx, x, y, SLOT_WIDTH, SLOT_HEIGHT, SLOT_RADIUS)
    ctx.fillStyle = '#ffffff'
    ctx.fill()

    const photoSrc = photos[i]
    if (photoSrc) {
      try {
        const img = await loadImage(photoSrc)
        ctx.save()
        tracePath(ctx, x, y, SLOT_WIDTH, SLOT_HEIGHT, SLOT_RADIUS)
        ctx.clip()
        drawImageCover(ctx, img, x, y, SLOT_WIDTH, SLOT_HEIGHT)
        ctx.restore()
      } catch {
        // skip photo if it fails to load
      }
    }
  }
}

const DEFAULT_BORDER_COLOR = '#1f2937'

const downscaleForStorage = (canvas, maxDim = 640) => {
  const scale = Math.min(1, maxDim / Math.max(canvas.width, canvas.height))
  if (scale >= 1) return canvas.toDataURL('image/jpeg', 0.85)
  const small = document.createElement('canvas')
  small.width = canvas.width * scale
  small.height = canvas.height * scale
  small.getContext('2d').drawImage(canvas, 0, 0, small.width, small.height)
  return small.toDataURL('image/jpeg', 0.85)
}

export const composeStripPreview = async ({ layout, photos, borderColor = DEFAULT_BORDER_COLOR }) => {
  const { width, height } = getStripCanvasSize(layout)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  await drawStripBase(ctx, { layout, photos, borderColor })
  return downscaleForStorage(canvas)
}

// Same idea as composeStripPreview, but for a real image-based frame template:
// draws each photo into its native slot rect, then lays the template's own
// (already-transparent) artwork on top so the true frame shape shows correctly.
export const composeTemplatePreview = async ({ template, photos }) => {
  const canvas = document.createElement('canvas')
  canvas.width = template.canvasWidth
  canvas.height = template.canvasHeight
  const ctx = canvas.getContext('2d')

  for (let i = 0; i < template.slots.length; i++) {
    const slot = template.slots[i]
    const photoSrc = photos[i]
    if (!photoSrc) continue
    try {
      const img = await loadImage(photoSrc)
      ctx.save()
      ctx.beginPath()
      ctx.rect(slot.x, slot.y, slot.w, slot.h)
      ctx.clip()
      drawImageCover(ctx, img, slot.x, slot.y, slot.w, slot.h)
      ctx.restore()
    } catch {
      // skip photo if it fails to load
    }
  }

  try {
    const overlayImg = await loadImage(template.overlay)
    ctx.drawImage(overlayImg, 0, 0, template.canvasWidth, template.canvasHeight)
  } catch {
    // skip overlay art if it fails to load
  }

  return downscaleForStorage(canvas)
}
