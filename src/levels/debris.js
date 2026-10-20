// ---- THE DEBRIS FIELDS (rooms 173-199) and THE TEAR (room 200): past the calm, the storm's leftovers go on for miles.
// Wreckage blows across every room (debris: see GameScene.drawDebris) and a few small tornadoes still whirl up - far fewer
// than in the Wreckage (winds: see Gusts.js, no dust devils) - and from time to time a brick thrower ('T') stands in the way.
// Every room is drawn zoomed out like 171-172. Room 200 is the dimensional tear: blank, colourless and with the world
// around it warped (room.tear, see GameScene.drawTear). Nothing there can hurt you; its exit leads on to the Unravelling (201-210), whose exit is the end of the game.
const DEBRIS_LAYOUTS = [
  [['f', 4], ['pit', 4], ['f', 5], ['hur', 2], ['f', 5], ['pit', 5], ['f', 6]],
  [['f', 3], ['hur', 2], ['f', 4], ['pit', 5], ['f', 4], ['hur', 2], ['f', 4], ['pit', 4], ['f', 4]],
  [['f', 3], ['big', 8], ['f', 4], ['pit', 5], ['f', 4], ['hur', 2], ['f', 5]],
  [['f', 3], ['pit', 5, 'W'], ['f', 3], ['hur', 2], ['f', 3], ['pit', 5], ['f', 3], ['big', 8], ['f', 3]],
  [['f', 3], ['pop', 1], ['f', 3], ['pit', 5], ['f', 3], ['hur', 2], ['f', 3], ['pit', 5], ['f', 3]],
  [['f', 2], ['tun', 5], ['f', 3], ['pit', 5], ['f', 3], ['hur', 2], ['f', 3], ['pit', 5, 'W'], ['f', 3]],
  [['f', 3], ['drift', 4], ['f', 3], ['pit', 5], ['f', 3], ['hur', 2], ['f', 3], ['big', 8], ['f', 3]],
  [['f', 2], ['pit', 5], ['f', 2], ['hur', 2], ['f', 2], ['pit', 5], ['f', 2], ['hur', 2], ['f', 2], ['big', 8], ['f', 2]],
  [['f', 3], ['big', 8], ['f', 3], ['big', 8], ['f', 3], ['pit', 5], ['f', 3]],
];
const DEBRIS_NAMES = [
  'Dust Road', 'Scattered Timber', 'Hollow Chimney', 'Broken Cart', 'The Splintered Climb', 'Torn Awning', 'Cracked Foundation',
  'Slate and Soot', 'Fallen Beams', 'The Ash Ladder', 'Shattered Signpost', 'Rusted Hinges', 'Drifting Shingles', 'Wind-Worn Wall',
  'The Rubble Climb', 'Bent Lanterns', 'Splinter Field', 'Lonely Chimney', 'Scrap and Sand', 'The Grey Ascent', 'Crumbled Steps',
  'Sunken Cellar', 'Ragged Banners', 'Last Rafters', 'The Final Climb', 'Quiet Wreckage', 'The Edge of Everything',
];

const DEBRIS = (n, name, winds, rows, extra = {}) =>
  ({ name: `${n} - The Debris Fields: ${name}`, exit: 'right', zoom: 0.8, debris: true, winds, rows, ...extra });

LEVELS.push(...DEBRIS_NAMES.map((name, i) => {
  const n = 173 + i, k = i / (DEBRIS_NAMES.length - 1);                       // k: 0 -> 1 across the fields
  const winds = { firstDelay: 4, every: [7 - 2.3 * k, 10 - 3.4 * k] };        // one small tornado every ~7-10s, ~5-7s at the end
  if (i % 5 === 4) {                                                          // every fifth room is a climb
    const climb = [CLIMB_WALL, CLIMB_POP, () => CLIMB_LADDER([[16, 19, 22]])][(i / 5 | 0) % 3];
    return DEBRIS(n, name, winds, withT(climb(), i > 12 ? [[15, 13]] : []), { exit: 'top', rise: { speed: 5 + 3 * k, delay: 3 } });
  }
  const T = i % 3 === 2 ? (i > 14 ? [12, 30] : [20]) : [];                    // an occasional brick thrower, two late on
  return DEBRIS(n, name, winds, RUN(DEBRIS_LAYOUTS[i % DEBRIS_LAYOUTS.length], g => T.forEach(c => g.put(17, c, 'T'))));
}));

// the tear: a flat, empty floor and nothing else. No tornadoes, no hazards, no boss. Push through its right edge and the
// tear keeps going: rooms 201-210, each one more distorted than the last (distort 1..10, see GameScene.drawTear).
LEVELS.push({ name: '200 - The Tear', exit: 'right', zoom: 0.8, tear: true, rows: RUN([['f', 34]]) });

// ---- THE UNRAVELLING (rooms 201-210): the tear widens. The floor is an ordinary course (a little harder each room) and, from
// 202, bits of the broken world are flung at you now and then (slowly - the distortion is the point). Room 210 is the end of
// it: push through and the run is complete.
// Rooms 211-220 keep going the same way (the warping stops getting worse at distort 14, where the view is already a mess).
// Rooms 221-225 add two tricks, written straight into the tile rows (see builders.js / GameScene.addWarp):
//   F  a fake spike: looks like a floor spike (with a faint flicker) but is harmless
//   X  a distortion spot: warps the space around it more the closer you get, and touching it distorts the room right
//      out of shape and kills you
const UNRAVEL_NAMES = [
  'Hairline Crack', 'Fault Line', 'Static', 'Double Vision', 'Slipping', 'Echoes', 'Unravel', 'No Edges', 'Nothing Holds', 'The Seam',
  'Fraying Edge', 'Hollow Light', 'Wrong Angles', 'Stutter', 'Afterimage', 'Fold', 'Backwards Wind', 'Dead Pixels', 'Nothing Left', 'The Second Seam',
  'False Floor', 'Phantom Teeth', 'Warped Mercy', 'The Pull', 'Collapse',
];

// extra courses for 211-220 (the first ones reuse the Debris layouts above)
const UNRAVEL_LAYOUTS = [
  [['f', 3], ['pit', 5], ['f', 2], ['hur', 2], ['f', 2], ['pit', 5], ['f', 2], ['hur', 2], ['f', 2], ['pit', 5], ['f', 3]],
  [['f', 3], ['big', 8], ['f', 2], ['hur', 2], ['f', 3], ['big', 8], ['f', 3], ['pit', 4], ['f', 3]],
  [['f', 3], ['tun', 5], ['f', 3], ['pop', 1], ['f', 3], ['pit', 5], ['f', 3], ['hur', 2], ['f', 4]],
  [['f', 2], ['drift', 4], ['f', 2], ['pit', 5, 'W'], ['f', 2], ['hur', 2], ['f', 2], ['pit', 5], ['f', 2], ['big', 8], ['f', 2]],
  [['f', 2], ['pit', 5], ['f', 2], ['pit', 5], ['f', 2], ['pit', 5], ['f', 2], ['hur', 2], ['f', 3]],
];

// rooms 221-225: [course, extra tiles as [row, col, text]]. Floor tiles sit on row 20; row 15 hangs above the pits.
// Distortion spots are only ever on wide stretches of flat floor (with run-up either side), so they can be jumped over.
const WARP_ROOMS = [
  [[['f', 6], ['pit', 4], ['f', 9], ['pit', 4], ['f', 12]],
    [[20, 5, 'FF'], [20, 17, 'X'], [20, 19, 'FF'], [20, 30, 'X'], [20, 33, 'FFF']]],
  [[['f', 5], ['hur', 2], ['f', 7], ['pit', 5], ['f', 4], ['pit', 4], ['f', 8]],
    [[20, 4, 'FF'], [20, 13, 'X'], [20, 15, 'FF'], [15, 19, 'X'], [20, 33, 'X'], [20, 35, 'FF']]],
  [[['f', 4], ['pit', 5], ['f', 7], ['hur', 1], ['f', 6], ['pit', 5], ['f', 7]],
    [[20, 4, 'FF'], [20, 13, 'FF'], [20, 15, 'X'], [20, 23, 'X'], [20, 32, 'FF'], [20, 35, 'X'], [15, 28, 'X']]],
  [[['f', 3], ['big', 8], ['f', 6], ['pit', 5], ['f', 6], ['pit', 5], ['f', 2]],
    [[20, 15, 'FF'], [20, 17, 'X'], [20, 26, 'FF'], [20, 28, 'X'], [15, 33, 'X']]],
  [[['f', 3], ['pit', 4], ['f', 7], ['pit', 5], ['f', 7], ['pit', 4], ['f', 6]],
    [[20, 11, 'FF'], [20, 13, 'X'], [15, 19, 'X'], [20, 23, 'FF'], [20, 25, 'X'], [15, 30, 'X'], [20, 34, 'FF'], [20, 36, 'X']]],
];

LEVELS.push(...UNRAVEL_NAMES.map((name, i) => {
  const n = 201 + i, lv = i + 1;
  const warp = i >= 20 ? WARP_ROOMS[i - 20] : null;
  const course = warp ? warp[0] : i >= 10 ? UNRAVEL_LAYOUTS[(i - 10) % UNRAVEL_LAYOUTS.length] : DEBRIS_LAYOUTS[i % DEBRIS_LAYOUTS.length];
  const room = {
    name: `${n} - The Unravelling: ${name}`, exit: 'right', zoom: 0.8, tear: true, distort: Math.min(lv, 14),
    rows: RUN(course, g => {
      if (warp) warp[1].forEach(([r, c, s]) => g.put(r, c, s));
      else g.put(18, 20 + (i % 3) * 4, 'S');
    }),
  };
  if (lv >= 2) {
    const gap = Math.max(2.4, 6.5 - 0.35 * lv);
    room.debrisThrow = { first: 4, every: gap, factor: 1, min: gap, speed: Math.min(90, 45 + 4 * lv), speedUp: 1, maxSpeed: 100 };
  }
  return room;
}));
