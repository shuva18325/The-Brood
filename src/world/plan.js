/**
 * plan.js — the apartment, as numbers.
 *
 * One bounded interior. Metres. +X is east (toward the stairwell), +Z is
 * south (toward the bathroom and his door), +Y is up. The window is on the
 * west wall because the street is west and the water is eleven blocks past
 * that.
 *
 *          x=-4.2                     x=1.0        x=4.2      x=6.6
 *   z=-3.6  ┌──────────────────────────┬─────────────┐
 *           │                          │  KITCHEN    │
 *           │                          │             │
 *   z=-0.4  │        MAIN ROOM         ├─────────────┼────────┐
 *      ▓    │                          │   HALL      │LANDING │
 *  window   │                          │             │        │  ← front door
 *   z= 1.0  │                          ├──────┬──────┼────────┘
 *           │                          │ BATH │ HIS  │
 *   z= 3.6  └──────────────────────────┴──────┴──────┘
 *                                       x=2.5
 */

export const CEIL = 2.5;
export const WALL_T = 0.14;

export const ROOMS = {
  main:    { x0: -4.2, x1: 1.0,  z0: -3.6, z1: 3.6,  name: 'main room' },
  kitchen: { x0: 1.0,  x1: 4.2,  z0: -3.6, z1: -0.4, name: 'kitchen' },
  hall:    { x0: 1.0,  x1: 4.2,  z0: -0.4, z1: 1.0,  name: 'hall' },
  bath:    { x0: 1.0,  x1: 2.5,  z0: 1.0,  z1: 3.6,  name: 'bathroom' },
  bedroom: { x0: 2.5,  x1: 4.2,  z0: 1.0,  z1: 3.6,  name: 'his room' },
  landing: { x0: 4.2,  x1: 6.6,  z0: -0.4, z1: 1.0,  name: 'landing' },
};

/**
 * Doorway gaps, expressed as intervals along the wall they pierce.
 *
 * A doorway is 900 mm in the real world and that is exactly what these were.
 * It is not enough. A first-person body has a radius, the walls have
 * thickness, and threading two 900 mm gaps in a row while looking somewhere
 * else is how a player ends up wedged in a hall wondering if the game is
 * broken. So: 1100 mm, and the main→hall and hall→landing doors are on the
 * SAME centreline, so crossing the flat west to east is a straight walk.
 */
export const DOORS = {
  // main <-> kitchen/hall, in the x=1.0 partition
  mainKitchen: { axis: 'x', at: 1.0, from: -3.05, to: -1.55 },
  mainHall:    { axis: 'x', at: 1.0, from: -0.15, to: 0.95 },
  // hall <-> bath and hall <-> bedroom, in the z=1.0 partition
  bath:        { axis: 'z', at: 1.0, from: 1.28, to: 2.38 },
  bedroom:     { axis: 'z', at: 1.0, from: 2.64, to: 3.74 },
  // hall <-> landing, in the x=4.2 partition — same centreline as mainHall
  landing:     { axis: 'x', at: 4.2, from: -0.15, to: 0.95 },
};

/** The centre of a doorway, which is where an unstick nudge aims. */
export function doorCentre(name) {
  const d = DOORS[name];
  return d ? (d.from + d.to) / 2 : 0;
}

/** The window. Bars in a frame with a curtain over them. No glass. */
export const WINDOW = {
  wall: 'west',
  x: -4.2,
  z: -0.2,
  width: 1.5,
  sill: 0.95,
  height: 1.25,
  // Square-section security bar, 32 mm, at 167 mm centres. Not a security
  // upgrade anyone chose — they came with the building, along with the damp.
  barCount: 9,
  barRadius: 0.016,
};

/** Where the exterior lives. Everything beyond this is fog. */
export const STREET = {
  // The road surface runs north–south, parallel to the building face.
  curbX: -7.0,
  farCurbX: -13.5,
  facadeX: -16.0,   // the blue house
  z0: -22, z1: 22,
  roadY: -3.2,      // the apartment is on the second floor
};

/**
 * Solid volumes, as axis-aligned boxes: [x0, z0, x1, z1, height, tag].
 * Built once at load and used for collision. Furniture is in here too —
 * the room is cramped and it should feel it.
 */
export function buildColliders() {
  const B = [];
  const wall = (x0, z0, x1, z1, tag) => B.push({ x0, z0, x1, z1, h: CEIL, tag });

  const T = WALL_T / 2;

  /* --- exterior shell ------------------------------------------------ */
  wall(-4.2 - WALL_T, -3.6 - WALL_T, -4.2, 3.6 + WALL_T, 'wall.west');
  wall(-4.2 - WALL_T, -3.6 - WALL_T, 6.6 + WALL_T, -3.6, 'wall.north');
  wall(-4.2 - WALL_T, 3.6, 4.2 + WALL_T, 3.6 + WALL_T, 'wall.south');
  wall(6.6, -0.4 - WALL_T, 6.6 + WALL_T, 1.0 + WALL_T, 'wall.east.frontdoor');
  // kitchen/landing outer returns
  wall(4.2, -3.6, 4.2 + WALL_T, -0.4, 'wall.kitchen.east');
  // His room's east wall. It was missing, and the player could walk out of
  // the building through it into unlit void with no floor under them.
  wall(4.2, 1.0, 4.2 + WALL_T, 3.6 + WALL_T, 'wall.bedroom.east');
  wall(4.2 - WALL_T, -0.4 - WALL_T, 6.6, -0.4, 'wall.landing.north');
  wall(4.2 - WALL_T, 1.0, 6.6, 1.0 + WALL_T, 'wall.landing.south');

  /* --- partitions with doorways -------------------------------------- */
  // x = 1.0, from z=-3.6 to 3.6, gaps at mainKitchen and mainHall
  segmentsAlong('z', 1.0, -3.6, 3.6, [DOORS.mainKitchen, DOORS.mainHall])
    .forEach(([a, b]) => wall(1.0 - T, a, 1.0 + T, b, 'part.main'));

  // z = 1.0, from x=1.0 to 4.2, gaps at bath and bedroom
  segmentsAlong('x', 1.0, 1.0, 4.2, [DOORS.bath, DOORS.bedroom])
    .forEach(([a, b]) => wall(a, 1.0 - T, b, 1.0 + T, 'part.hall'));

  // x = 4.2, from z=-0.4 to 1.0, gap at landing
  segmentsAlong('z', 4.2, -0.4, 1.0, [DOORS.landing])
    .forEach(([a, b]) => wall(4.2 - T, a, 4.2 + T, b, 'part.landing'));

  // bath | bedroom divider at x = 2.5, z from 1.0 to 3.6
  wall(2.5 - T, 1.0, 2.5 + T, 3.6, 'part.bath');

  /* --- furniture ------------------------------------------------------ */
  B.push({ x0: -4.05, z0:  1.85, x1: -2.35, z1:  3.35, h: 0.16, tag: 'mat' });
  B.push({ x0: -3.30, z0: -3.55, x1: -1.30, z1: -2.85, h: 0.76, tag: 'desk' });
  // Against the partition, SOUTH of the doorway. It must never overlap
  // DOORS.mainHall, which is the only way out of the main room.
  B.push({ x0: -0.35, z0:  1.65, x1:  0.85, z1:  2.25, h: 0.62, tag: 'tvstand' });
  B.push({ x0: -4.05, z0: -2.20, x1: -3.45, z1: -1.20, h: 0.78, tag: 'chair' });

  B.push({ x0:  1.15, z0: -3.55, x1:  3.30, z1: -2.90, h: 0.90, tag: 'counter' });
  B.push({ x0:  3.35, z0: -3.55, x1:  4.15, z1: -2.55, h: 1.62, tag: 'fridge' });

  // His room, laid out around a lane from the door to the bed. Nothing in
  // here may overlap DOORS.bedroom or the x 3.00–3.78 walking lane.
  B.push({ x0:  3.09, z0:  2.39, x1:  4.15, z1:  3.55, h: 0.55, tag: 'his.bed' });
  B.push({ x0:  3.78, z0:  1.14, x1:  4.15, z1:  1.98, h: 0.75, tag: 'his.desk' });
  B.push({ x0:  2.59, z0:  2.57, x1:  2.99, z1:  3.43, h: 1.10, tag: 'his.dresser' });

  B.push({ x0:  1.10, z0:  2.90, x1:  1.70, z1:  3.50, h: 0.75, tag: 'toilet' });
  B.push({ x0:  1.95, z0:  3.05, x1:  2.45, z1:  3.50, h: 0.85, tag: 'bathsink' });

  // The stair shaft. It is a hole in the floor with a rail around it.
  B.push({ x0:  5.55, z0: -0.35, x1:  6.55, z1:  0.95, h: 0.98, tag: 'stairrail' });

  return B;
}

/** Split a wall run into segments, skipping the door gaps. */
function segmentsAlong(_axis, _at, from, to, doors) {
  const gaps = doors.map(d => [d.from, d.to]).sort((a, b) => a[0] - b[0]);
  const out = [];
  let cursor = from;
  for (const [a, b] of gaps) {
    if (a > cursor) out.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < to) out.push([cursor, to]);
  return out;
}

/** Which room a point is in. Used for light bookkeeping and prompts. */
export function roomAt(x, z) {
  for (const [key, r] of Object.entries(ROOMS)) {
    if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return key;
  }
  return null;
}

export const SPAWN = { x: -3.2, z: 2.4, yaw: -Math.PI * 0.35 };

/**
 * The open centre of each room — somewhere a body definitely fits. The
 * unstick failsafe walks the player toward the nearest of these rather than
 * teleporting them, so being freed never reads as a glitch.
 */
export const ROOM_CENTRES = {
  main:    { x: -2.0, z: -0.6 },
  kitchen: { x:  2.1, z: -1.6 },
  hall:    { x:  2.6, z:  0.35 },
  bath:    { x:  1.75, z:  1.9 },
  bedroom: { x:  3.35, z:  1.95 },
  landing: { x:  4.9, z:  0.35 },
};
