// Real-world padel dimensions, in metres. x = across the court (width),
// z = along the court (length), y = up. The net sits at z = 0.
export const COURT = {
  length: 20,
  width: 10,
  serviceLine: 6.95, // distance from the net
  lineWidth: 0.05,
  netCentre: 0.88,
  netPost: 0.92,
  backGlass: 3,
  backMesh: 1, // mesh above the back glass (total 4 m)
  sideMeshHeight: 3,
}

// Three courts side by side. 10 m court + 2.4 m walkway between them.
export const COURT_XS = [-12.4, 0, 12.4]
export const HERO = 1 // the middle court is where the story happens

// Light poles stand between and outside the courts. Every head is a real
// position used by the baked light map, the visible fixtures, and the
// reflections in the glass, so all three always agree.
const POLE_XS = [-18.6, -6.2, 6.2, 18.6]
const POLE_ZS = [-6.5, 6.5]
export const POLE_HEIGHT = 6.6

export const POLES = []
export const LIGHTS = []
for (const px of POLE_XS) {
  for (const pz of POLE_ZS) {
    POLES.push([px, pz])
    for (const cx of COURT_XS) {
      if (Math.abs(cx - px) < 7) {
        const dir = Math.sign(cx - px)
        LIGHTS.push({
          pos: [px + dir * 0.45, POLE_HEIGHT, pz],
          aim: [cx - dir * 1.0, 0, pz * 0.35],
          court: cx,
        })
      }
    }
  }
}
