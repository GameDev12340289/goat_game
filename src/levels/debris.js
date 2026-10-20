// ---- THE DEBRIS FIELDS (rooms 173-199) and THE TEAR (room 200): past the calm, the storm's leftovers go on for miles.
// Wreckage blows across every room (debris: see GameScene.drawDebris) and a few small tornadoes still whirl up - far fewer
// than in the Wreckage (winds: see Gusts.js, no dust devils) - and from time to time a brick thrower ('T') stands in the way.
// Every room is drawn zoomed out like 171-172. Room 200 is the dimensional tear: blank, colourless and with the world
// around it warped (room.tear, see GameScene.drawTear). Nothing there can hurt you; the exit is the end of the game.
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

// the tear: a flat, empty floor and nothing else. No tornadoes, no hazards, no boss.
// Push through its right edge and you come out in room 1 - the run starts over from the very first room.
LEVELS.push({ name: '200 - The Tear', exit: 'right', zoom: 0.8, tear: true, loopTo: 0, rows: RUN([['f', 34]]) });
