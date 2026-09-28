// Kept in ascending pose-count order for display purposes (the Photobooth
// layout picker just maps over this array in order). IDs are left as-is
// rather than renumbered, since frameTemplates.js references specific
// layout IDs to say which pose count each frame template requires.
export const LAYOUTS = [
  { id: 'D', pose: '2 pose', boxes: 2, cols: 1 },
  { id: 'B', pose: '3 pose', boxes: 3, cols: 1 },
  { id: 'A', pose: '4 pose', boxes: 4, cols: 1 },
  { id: 'C', pose: '4 pose grid', boxes: 4, cols: 2 },
  { id: 'E', pose: '6 pose grid', boxes: 6, cols: 2 },
  { id: 'F', pose: '8 pose grid', boxes: 8, cols: 2 },
]
