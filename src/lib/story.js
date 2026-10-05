// The scroll story is split into chapters. Each chapter is one HTML section
// whose height (in viewport heights) decides how long it lasts while scrolling.
// The 3D scene reads `story.s`: a float where the integer part is the chapter
// index and the fraction is how far through that chapter we are.
//   s = 0.0  -> top of the page (intro)
//   s = 2.5  -> halfway through the rally
//   s = 6.0  -> bottom of the page
export const CHAPTERS = [
  { id: 'intro', vh: 2.2 },
  { id: 'glass', vh: 2.4 },
  { id: 'rally', vh: 6.0 },
  { id: 'coaching', vh: 2.4 },
  { id: 'membership', vh: 2.8 },
  { id: 'final', vh: 2.4 },
]

// One shared, mutable object. Written by the scroll engine, read every frame
// by the 3D scene. Mutating it (instead of React state) avoids re-rendering
// React 60 times a second.
export const story = {
  s: 0, // chapter float (see above)
  velocity: 0, // scroll velocity, used for subtle motion effects
  ready: false, // loader finished
  reducedMotion: false,
  quality: 'high', // 'high' | 'medium' | 'low', set by the performance monitor
  pointer: { x: 0, y: 0 }, // normalised -1..1, for subtle camera parallax
  rallyT: -1, // seconds into the rally point (see three/rally.js)
  loadProgress: 0, // 0..100, written by the 3D chunk's loading manager
  loadActive: true,
  frames: 0, // frames rendered so far (the loader waits for the first few)
  shake: 0, // camera shake amount, set on the glass impact
}

// Progress (0..1) through chapter `index` given the story float.
export const chapterProgress = (s, index) => Math.min(1, Math.max(0, s - index))
