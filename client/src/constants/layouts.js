// Kept in ascending pose-count order, with IDs lettered to match (A = fewest
// poses). frameTemplates.js references these IDs to say which pose count
// each frame template requires, so any renumbering here must be mirrored
// there too.
export const LAYOUTS = [
  { id: 'A', pose: '2 pose', boxes: 2, cols: 1 },
  { id: 'B', pose: '3 pose', boxes: 3, cols: 1 },
  { id: 'C', pose: '4 pose', boxes: 4, cols: 1 },
  { id: 'D', pose: '4 pose grid', boxes: 4, cols: 2 },
  { id: 'E', pose: '6 pose grid', boxes: 6, cols: 2 },
  { id: 'F', pose: '8 pose grid', boxes: 8, cols: 2 },
]
