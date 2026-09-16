import frame1Overlay from '../assets/frame_1.png'
import frame2Overlay from '../assets/frame_2.png'
import frame3Overlay from '../assets/frame_3.png'
import frame4Overlay from '../assets/frame_4.png'
import frame5Overlay from '../assets/frame_5.png'
import frame6Overlay from '../assets/frame_6.png'
import frame7Overlay from '../assets/frame_7.png'
import frame8Overlay from '../assets/frame_8.png'
import frame10Overlay from '../assets/frame_10.png'
import frame11Overlay from '../assets/frame_11.png'
import frame12Overlay from '../assets/frame_12.png'

// Real, pre-designed frame templates. Each "image" template is a transparent
// PNG (decoration only) laid on top of the user's photos, with `slots`
// marking the exact pixel rectangles (in the original image's own pixel
// space) where each pose should show through. The photo underneath is drawn
// as a plain rectangle at each slot; since the overlay's own transparency
// already defines the true hole shape (rectangle, scallop, oval, heart...),
// drawing the overlay on top crops it correctly without any extra masking.
export const FRAME_TEMPLATES = [
  {
    id: 'frame-1',
    name: 'Denim & Stars',
    badge: 'New',
    moods: ['cool', 'neutral'],
    type: 'image',
    layoutId: 'A',
    overlay: frame1Overlay,
    canvasWidth: 600,
    canvasHeight: 1800,
    slots: [
      { x: 72, y: 113, w: 456, h: 325 },
      { x: 72, y: 492, w: 456, h: 326 },
      { x: 72, y: 872, w: 456, h: 326 },
      { x: 72, y: 1252, w: 456, h: 326 },
    ],
  },
  {
    id: 'frame-2',
    name: 'Sweet Bows',
    badge: 'Free',
    moods: ['warm-bright', 'pastel'],
    type: 'image',
    layoutId: 'B',
    overlay: frame2Overlay,
    canvasWidth: 600,
    canvasHeight: 1800,
    slots: [
      { x: 44, y: 47, w: 509, h: 506 },
      { x: 44, y: 593, w: 509, h: 506 },
      { x: 44, y: 1139, w: 509, h: 506 },
    ],
  },
  {
    id: 'frame-3',
    name: 'Polaroid Moments',
    badge: 'Premium',
    moods: ['monochrome', 'neutral', 'warm-moody'],
    type: 'image',
    layoutId: 'B',
    overlay: frame3Overlay,
    canvasWidth: 600,
    canvasHeight: 1800,
    slots: [
      { x: 65, y: 464, w: 469, h: 293 },
      { x: 65, y: 874, w: 469, h: 294 },
      { x: 65, y: 1285, w: 469, h: 294 },
    ],
  },
  {
    id: 'frame-4',
    name: 'Grid Paper',
    badge: 'New',
    moods: ['cool', 'pastel'],
    type: 'image',
    layoutId: 'A',
    overlay: frame4Overlay,
    canvasWidth: 600,
    canvasHeight: 1800,
    slots: [
      { x: 40, y: 47, w: 522, h: 333 },
      { x: 40, y: 424, w: 523, h: 333 },
      { x: 41, y: 801, w: 522, h: 333 },
      { x: 42, y: 1181, w: 521, h: 333 },
    ],
  },
  {
    id: 'frame-5',
    name: 'Bow Sparkle',
    badge: 'On trend',
    moods: ['pastel', 'warm-bright'],
    type: 'image',
    layoutId: 'B',
    overlay: frame5Overlay,
    canvasWidth: 600,
    canvasHeight: 1800,
    slots: [
      { x: 30, y: 109, w: 539, h: 422 },
      { x: 30, y: 689, w: 539, h: 422 },
      { x: 30, y: 1269, w: 539, h: 422 },
    ],
  },
  {
    id: 'frame-6',
    name: 'Heart Bows',
    badge: 'Premium',
    moods: ['warm-bright', 'warm-moody'],
    type: 'image',
    layoutId: 'B',
    overlay: frame6Overlay,
    canvasWidth: 600,
    canvasHeight: 1800,
    slots: [
      { x: 58, y: 177, w: 487, h: 346 },
      { x: 58, y: 715, w: 487, h: 346 },
      { x: 58, y: 1253, w: 487, h: 346 },
    ],
  },
  {
    id: 'frame-7',
    name: 'School Memories',
    badge: 'New',
    moods: ['pastel', 'warm-bright'],
    type: 'image',
    layoutId: 'B',
    overlay: frame7Overlay,
    canvasWidth: 600,
    canvasHeight: 1800,
    slots: [
      { x: 34, y: 148, w: 521, h: 555 },
      { x: 43, y: 691, w: 535, h: 341 },
      { x: 43, y: 1088, w: 512, h: 511 },
    ],
  },
  {
    id: 'frame-8',
    name: 'Gingerbread House',
    badge: 'Holiday',
    moods: ['warm-moody', 'warm-bright'],
    type: 'image',
    layoutId: 'A',
    overlay: frame8Overlay,
    canvasWidth: 600,
    canvasHeight: 1800,
    slots: [
      { x: 108, y: 294, w: 384, h: 289 },
      { x: 108, y: 670, w: 384, h: 289 },
      { x: 108, y: 1050, w: 384, h: 289 },
      { x: 108, y: 1428, w: 384, h: 289 },
    ],
  },
  {
    id: 'frame-9',
    name: 'Candy Cane Cabin',
    badge: 'Holiday',
    moods: ['warm-moody', 'warm-bright'],
    type: 'image',
    layoutId: 'B',
    overlay: frame10Overlay,
    canvasWidth: 600,
    canvasHeight: 1800,
    slots: [
      { x: 104, y: 176, w: 392, h: 424 },
      { x: 104, y: 701, w: 392, h: 431 },
      { x: 104, y: 1233, w: 392, h: 431 },
    ],
  },
  {
    id: 'frame-10',
    name: 'Doodle Sparkle',
    badge: 'On trend',
    moods: ['pastel', 'warm-bright'],
    type: 'image',
    layoutId: 'A',
    overlay: frame11Overlay,
    canvasWidth: 600,
    canvasHeight: 1800,
    slots: [
      { x: 37, y: 42, w: 530, h: 341 },
      { x: 37, y: 419, w: 530, h: 342 },
      { x: 37, y: 797, w: 530, h: 342 },
      { x: 37, y: 1175, w: 530, h: 342 },
    ],
  },
  {
    id: 'frame-11',
    name: 'Racer Star',
    badge: 'Premium',
    moods: ['monochrome', 'cool'],
    type: 'image',
    layoutId: 'B',
    overlay: frame12Overlay,
    canvasWidth: 600,
    canvasHeight: 1800,
    slots: [
      { x: 44, y: 151, w: 511, h: 420 },
      { x: 44, y: 625, w: 511, h: 420 },
      { x: 44, y: 1099, w: 511, h: 420 },
    ],
  },
]
