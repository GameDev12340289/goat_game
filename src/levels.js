// Rooms are 40x23 tile grids. Short rows are padded with '.', so only the leading part matters.
//   #  solid      ^  spike (floor)     P  player spawn
//   D  dash crystal                    S  coin
// exit: 'right' | 'top' -> leaving the screen that way loads the next room.
//   W  powder snow (see the Frostbite rooms below)
//   a / b  popping spikes (groups a and b take turns sticking out of the floor)
// rise: { speed, delay } (optional) -> a spike floor rises from the bottom of the room.
// boss: {...} (optional) -> giant goat chase, see Boss.js.  finale: { leapX, vx, vy } -> mega-leap pad at leapX.
// Solid walls are implied on every side that isn't an exit.
// helpers for writing rooms by row index: R([[row, str], ['from-to', str], ...]) later entries win
const d = n => '.'.repeat(n);
const R = spec => {
  const rows = Array(CFG.ROWS).fill('');
  for (const [k, v] of spec) {
    const [a, b] = String(k).split('-').map(Number);
    for (let r = a; r <= (b ?? a); r++) rows[r] = v;
  }
  return rows;
};

// ground(top, pits): solid floor rows from `top` to the bottom; pits are [col, width] (spiked at the bottom)
const ground = (top, pits = []) => {
  const out = [];
  for (let r = top; r < CFG.ROWS; r++) {
    let s = '#'.repeat(CFG.COLS);
    for (const [c, n] of pits) s = s.slice(0, c) + (r === CFG.ROWS - 1 ? '^' : '.').repeat(n) + s.slice(c + n);
    out.push([r, s]);
  }
  return out;
};
// B(g => { ... }) builds a room from drawing calls (used by the Frostbite rooms):
//   g.fill(r0, r1, c0, c1, ch)   g.put(row, col, str)   g.floor(top, pits) where pits are [col, width, fill = '.']
//   W  powder snow: slows you down and freezes you if you stay in it; a pit filled with W still has spikes at the bottom
const B = build => {
  const grid = Array.from({ length: CFG.ROWS }, () => Array(CFG.COLS).fill('.'));
  const g = {
    fill: (r0, r1, c0, c1, ch) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) grid[r][c] = ch; },
    put: (r, c, s) => { for (let i = 0; i < s.length && c + i < CFG.COLS; i++) grid[r][c + i] = s[i]; },
    floor: (top, pits = []) => {
      g.fill(top, CFG.ROWS - 1, 0, CFG.COLS - 1, '#');
      for (const [c, n, fill = '.'] of pits) {
        g.fill(top, CFG.ROWS - 2, c, c + n - 1, fill);
        g.put(CFG.ROWS - 1, c, '^'.repeat(n));
      }
    },
  };
  build(g);
  return grid.map(row => row.join(''));
};

const LEVELS = [
  {
    name: '1 - Forsaken City',
    exit: 'right',
    rows: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '..................S',                                     // 15
      '',                                                         // 16
      '',                                                         // 17
      '............................####',                         // 18
      '...P....................########',                         // 19
      '################....####################',                 // 20
      '################....####################',                 // 21
      '################^^^^####################',                 // 22
    ],
  },
  {
    name: '2 - Old Site',
    exit: 'top',
    rows: [
      '............................#',    // 0
      '............................#',
      '................S...........#',
      '............................#',
      '............................#',
      '............................#',    // 5
      '..........###...............#',
      '..........###...............#',
      '..........###...............#',
      '..........###...............#',
      '..........###......######...#',      // 10 ledge
      '..........###...............#',
      '..........###...............#',
      '..........###...............#',
      '..........###...............#',
      '..........###...............#',    // 15
      '..........###...............#',
      '..........###...............#',
      '..........###...............#',
      '...P......###.^^^^^^^^^^^^^.#',      // 19
      '########################################',
      '########################################',
      '########################################',
    ],
  },
  {
    name: '3 - Crystal Gap',
    exit: 'right',
    rows: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '', '',
      '.................D',                                        // 17
      '',
      '...P',                                                     // 19
      '##########.............#################',                 // 20
      '##########.............#################',                 // 21
      '##########^^^^^^^^^^^^^#################',                 // 22
    ],
  },
  {
    name: '4 - Rising Peril',
    exit: 'top',
    rise: { speed: 12, delay: 1.5 }, // spike floor climbs up the screen (px/s, seconds before it starts)
    rows: [
      '',                                                         // 0
      '..............................S',                          // 1
      '',
      '',
      '................######',                                   // 4
      '..........................D',                              // 5
      '',
      '........######',                                           // 7
      '',
      '',
      '................######',                                   // 10
      '',
      '',
      '..........................######',                         // 13
      '',
      '',
      '..................######',                                 // 16
      '',
      '',
      '..........######',                                         // 19
      '',
      '...P',                                                     // 21
      '########################################',                 // 22
    ],
  },
  {
    name: '5 - Snapping Floor',
    exit: 'right',
    rows: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '...................S',                                     // 17
      '',
      '.................####',                                    // 19
      '',
      '...P..aaaa..bbbb.......aaaa..bbbb..aaaa.',                 // 21
      '########################################',                 // 22
    ],
  },
  {
    name: '6 - Coin Steps',
    exit: 'right',
    rows: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '.............S.......S',                                     // 16
      '....................####',                                    // 17
      '',
      '..P.............................####',                        // 19
      '############....############....########',                   // 20
      '############....############....########',                   // 21
      '############^^^^############^^^^########',                   // 22
    ],
  },
  {
    name: '7 - Snowy Ascent',
    exit: 'top',
    rise: { speed: 6, delay: 2 },
    rows: R([
      [4, d(26) + 'S'],
      [5, d(24) + '######'],
      [7, d(22) + 'D'],
      ['8-21', d(20) + '##'],                 // wall to climb
      [16, d(12) + '####' + d(4) + '##'],     // ledge 2
      [18, d(7) + 'S' + d(12) + '##'],        // coin
      [19, d(6) + '####' + d(10) + '##'],     // ledge 1
      [21, '..P' + d(17) + '##'],
      [22, '#'.repeat(40)],
    ]),
  },
  {
    name: '8 - Blink Bridge',
    exit: 'right',
    rows: R([
      [16, d(22) + 'S'],
      [18, d(23) + 'D'],
      [20, '..P...aa...bb' + d(17) + 'aa..bb'],
      [21, '#'.repeat(20) + d(6) + '#'.repeat(14)],
      [22, '#'.repeat(20) + '^'.repeat(6) + '#'.repeat(14)],
    ]),
  },
  {
    name: '9 - Twin Walls',
    exit: 'top',
    rows: R([
      [3, d(25) + 'S'],
      [4, d(22) + '######'],
      [6, d(23) + 'D'],
      ['7-20', d(19) + '##'],                // wall to climb
      [18, d(12) + '####' + d(3) + '##'],     // ledge
      [20, '..P..aa..bb' + d(8) + '##'],
      [21, '#'.repeat(40)],
      [22, '#'.repeat(40)],
    ]),
  },
  {
    name: '10 - Summit',
    exit: 'right',
    rise: { speed: 5, delay: 3 },
    rows: R([
      [7, d(26) + 'aa.S.bb'],
      [8, d(18) + '#'.repeat(17) + '...##'],  // bridge with a gap
      ['9-15', d(18) + '##'],                 // wall to climb
      [13, d(15) + 'D' + d(2) + '##'],
      [16, d(13) + '####.##'],                // ledge 2
      [18, d(7) + 'S'],
      [19, d(6) + '####'],                    // ledge 1
      [21, '..P' + d(8) + '^^^'],
      [22, '#'.repeat(40)],
    ]),
  },
  // ---- BOSS CHASE (rooms 11-19): a giant goat chases you to the right; keep moving ------------------
  // boss: { speed px/s, startX, firstDelay s, spikeEvery s, screamEvery s, ceiling: also drop spikes from the ceiling }
  {
    name: '11 - Boss Chase: The Herd Wakes',
    exit: 'right',
    boss: { speed: 18, firstDelay: 3.5, spikeEvery: 4.2 },
    rows: R([
      ...ground(21, [[14, 3], [27, 3]]),
      [17, d(15) + 'S'],
      [20, '..P' + d(29) + '####'],
    ]),
  },
  {
    name: '12 - Boss Chase: The Scream',
    exit: 'right',
    boss: { speed: 20, firstDelay: 3, screamEvery: 5.5 },
    rows: R([
      ...ground(21),
      [17, d(27) + 'S'],
      [20, '..P' + d(9) + '##' + d(8) + '##' + d(8) + '##'],
    ]),
  },
  {
    name: '13 - Boss Chase: Falling Sky',
    exit: 'right',
    boss: { speed: 22, firstDelay: 3, spikeEvery: 3.4, ceiling: true },
    rows: R([
      ...ground(21, [[18, 4]]),
      [17, d(26) + 'S'],
      [18, d(24) + '######'],
      [20, '..P'],
    ]),
  },
  {
    name: '14 - Boss Chase: Cliff Run',
    exit: 'right',
    boss: { speed: 24, firstDelay: 3, spikeEvery: 4, screamEvery: 6, ceiling: true },
    rows: R([
      ...ground(21),
      [12, d(28) + '#'.repeat(12)],
      [14, d(21) + 'S'],
      [15, d(19) + '#####'],
      [18, d(10) + '#####'],
      [20, '..P'],
    ]),
  },
  {
    name: '15 - Boss Chase: Over the Wall',
    exit: 'right',
    boss: { speed: 26, firstDelay: 3, spikeEvery: 4.5, screamEvery: 6.5 },
    rows: R([
      ...ground(21),
      [9, d(28) + 'S'],
      [10, d(15) + '#'.repeat(15) + d(3) + '#'.repeat(7)],
      ['11-20', d(15) + '##'],
      [20, '..P' + d(12) + '##'],
    ]),
  },
  {
    name: '16 - Boss Chase: Spike Alley',
    exit: 'right',
    boss: { speed: 22, firstDelay: 3.5, spikeEvery: 5 },
    rows: R([
      ...ground(21),
      [17, d(20) + 'S'],
      [20, '..P' + d(7) + 'aa' + d(5) + 'bb' + d(5) + 'aa' + d(5) + 'bb'],
    ]),
  },
  {
    name: '17 - Boss Chase: Crystal Chasm',
    exit: 'right',
    boss: { speed: 26, firstDelay: 3.5, spikeEvery: 4.5, screamEvery: 7 },
    rows: R([
      ...ground(21, [[8, 10], [23, 7]]),
      [14, d(26) + 'S'],
      [16, d(12) + 'D'],
      [20, '..P'],
    ]),
  },
  {
    name: '18 - Boss Chase: Twin Peaks',
    exit: 'right',
    boss: { speed: 28, firstDelay: 3, spikeEvery: 4, screamEvery: 6.5, ceiling: true },
    rows: R([
      ...ground(21),
      [9, d(20) + 'S'],
      [10, d(10) + '#'.repeat(20)],
      ['11-20', d(10) + '##' + d(16) + '##'],
      [20, '..P' + d(7) + '##' + d(16) + '##'],
    ]),
  },
  {
    name: '19 - Boss Chase: The Great Escape',
    exit: 'right',
    // finale: the launch pad at leapX sends the goat on a huge scripted leap over the chasm (cols 24-33);
    // the boss is too big to stop, so once its snout passes fallX it drops in with a roar.
    boss: { speed: 30, startX: -110, firstDelay: 3, spikeEvery: 3, screamEvery: 5.5, ceiling: true, fallX: 224 },
    finale: { leapX: 168, vx: 150, vy: -400 },
    rows: R([
      ...ground(21, [[10, 4], [24, 10]]),
      [9, d(29) + 'S'],
      [15, d(12) + 'S'],
      [20, '..P' + d(14) + '##'],
    ]),
  },
  // ---- FROSTBITE (rooms 20-39): every trap and boss attack so far, remixed - plus powder snow (W) -------
  // Powder snow: you crawl, sink slowly and freeze if you wade too long (dash through it to stay warm).
  // Jump over low drifts; tunnels under a solid ceiling must be crossed. Powder-filled pits hide spikes below.
  {
    name: '20 - Frostbite: Powder Snow',
    exit: 'right',
    rows: B(g => {
      g.floor(21); g.put(20, 2, 'P');
      g.fill(20, 20, 10, 15, 'W'); g.put(16, 13, 'S');                        // low drift: hop over it
      g.fill(0, 16, 24, 29, '#'); g.fill(17, 20, 24, 29, 'W'); g.put(19, 27, 'S'); // tunnel: wade through
    }),
  },
  {
    name: '21 - Frostbite: Snow Pits',
    exit: 'right',
    rows: B(g => {
      g.floor(21, [[9, 4, 'W'], [19, 4, 'W'], [29, 4, 'W']]);               // looks like ground, sinks onto spikes
      g.put(20, 2, 'P'); g.put(17, 21, 'S'); g.put(16, 31, 'S');
    }),
  },
  {
    name: '22 - Frostbite: Frozen Wall',
    exit: 'top',
    rows: B(g => {
      g.fill(22, 22, 0, 39, '#'); g.put(21, 2, 'P');
      g.fill(20, 21, 10, 17, 'W');                                          // drift at the foot of the wall
      g.fill(8, 21, 20, 21, '#');                                           // wall to climb
      g.fill(12, 21, 16, 19, 'W');                                          // snow curtain hugging the wall
      g.put(19, 6, '####'); g.put(18, 7, 'S'); g.put(16, 12, '####');
      g.put(7, 22, 'D'); g.put(5, 24, '######'); g.put(4, 26, 'S');
    }),
  },
  {
    name: '23 - Frostbite: Pop and Drift',
    exit: 'right',
    rows: B(g => {
      g.floor(21); g.put(20, 2, 'P');
      g.put(20, 5, 'aa'); g.put(20, 9, 'bb');
      g.fill(20, 20, 13, 18, 'W'); g.put(17, 16, 'S');
      g.put(20, 21, 'aa'); g.put(20, 25, 'bb'); g.put(20, 29, 'aa');
      g.fill(20, 20, 32, 36, 'W'); g.put(16, 34, 'S');
    }),
  },
  {
    name: '24 - Frostbite: Crystal Snowfield',
    exit: 'right',
    rows: B(g => {
      g.floor(21, [[8, 8], [26, 8, 'W']]); g.put(20, 2, 'P');
      g.put(17, 11, 'D'); g.put(17, 29, 'D');
      g.fill(20, 20, 18, 22, 'W'); g.put(16, 20, 'S');
    }),
  },
  {
    name: '25 - Frostbite: Rising Powder',
    exit: 'top',
    rise: { speed: 12, delay: 1.5 },
    rows: B(g => {
      g.fill(22, 22, 0, 39, '#'); g.put(21, 3, 'P');
      g.put(19, 10, '######'); g.put(16, 18, '######'); g.put(13, 26, '######');
      g.put(10, 16, '######'); g.put(7, 8, '######'); g.put(4, 16, '######');
      g.put(5, 26, 'D'); g.put(1, 30, 'S');
      g.fill(15, 15, 19, 22, 'W'); g.fill(9, 9, 17, 20, 'W'); g.fill(6, 6, 9, 12, 'W');
    }),
  },
  {
    name: '26 - Frostbite Chase: Snowy Herd',
    exit: 'right',
    boss: { speed: 20, startX: -80, firstDelay: 2.5, spikeEvery: 4 },
    rows: B(g => {
      g.floor(21, [[14, 3, 'W'], [27, 3, 'W']]); g.put(20, 2, 'P');
      g.fill(20, 20, 20, 22, 'W'); g.put(17, 15, 'S'); g.put(20, 32, '####');
    }),
  },
  {
    name: '27 - Frostbite Chase: Whiteout Scream',
    exit: 'right',
    boss: { speed: 22, startX: -76, firstDelay: 2.5, screamEvery: 5 },
    rows: B(g => {
      g.floor(21); g.put(20, 2, 'P');
      g.fill(20, 20, 7, 9, 'W'); g.put(20, 13, '##');
      g.fill(20, 20, 20, 22, 'W'); g.put(20, 28, '##'); g.put(20, 36, '##');
      g.put(17, 27, 'S');
    }),
  },
  {
    name: '28 - Frostbite Chase: Icicle Sky',
    exit: 'right',
    boss: { speed: 24, startX: -72, firstDelay: 2.5, spikeEvery: 3, ceiling: true },
    rows: B(g => {
      g.floor(21, [[18, 4, 'W']]); g.put(20, 2, 'P');
      g.put(17, 26, 'S'); g.put(18, 24, '######');
    }),
  },
  {
    name: '29 - Frostbite Chase: Snow Cliff Run',
    exit: 'right',
    boss: { speed: 26, startX: -68, firstDelay: 2.5, spikeEvery: 3.6, screamEvery: 5.5, ceiling: true },
    rows: B(g => {
      g.floor(21); g.put(20, 2, 'P');
      g.fill(20, 20, 4, 8, 'W');
      g.put(18, 10, '#####'); g.put(15, 19, '#####'); g.put(14, 21, 'S'); g.put(12, 28, '#'.repeat(12));
    }),
  },
  {
    name: '30 - Frostbite Chase: Powder Bridge',
    exit: 'right',
    boss: { speed: 28, startX: -64, firstDelay: 2.5, spikeEvery: 4, screamEvery: 6 },
    rows: B(g => {
      g.floor(21); g.put(20, 2, 'P');
      g.fill(20, 20, 8, 11, 'W');
      g.fill(11, 20, 15, 16, '#');                                          // wall to climb
      g.fill(10, 10, 15, 29, '#'); g.fill(10, 10, 33, 39, '#');
      g.fill(10, 10, 30, 32, 'W');                                          // a "bridge" of snow: you fall straight through
      g.put(9, 28, 'S');
    }),
  },
  {
    name: '31 - Frostbite Chase: Pop Alley',
    exit: 'right',
    boss: { speed: 25, startX: -60, firstDelay: 2.5, spikeEvery: 4.2 },
    rows: B(g => {
      g.floor(21); g.put(20, 2, 'P');
      g.put(20, 10, 'aa'); g.fill(20, 20, 13, 15, 'W');
      g.put(20, 17, 'bb'); g.put(20, 24, 'aa');
      g.fill(20, 20, 28, 30, 'W'); g.put(20, 32, 'bb');
      g.put(17, 20, 'S');
    }),
  },
  {
    name: '32 - Frostbite Chase: Blizzard Chasm',
    exit: 'right',
    boss: { speed: 30, startX: -56, firstDelay: 2, spikeEvery: 4, screamEvery: 6 },
    rows: B(g => {
      g.floor(21, [[8, 10], [23, 7, 'W']]); g.put(20, 2, 'P');
      g.put(16, 12, 'D'); g.put(17, 26, 'D'); g.put(14, 26, 'S');
    }),
  },
  {
    name: '33 - Frostbite Chase: Frozen Peaks',
    exit: 'right',
    boss: { speed: 31, startX: -52, firstDelay: 2, spikeEvery: 3.5, screamEvery: 5.5, ceiling: true },
    rows: B(g => {
      g.floor(21); g.put(20, 2, 'P');
      g.fill(10, 10, 10, 29, '#');                                          // bridge between the twin walls
      g.fill(11, 20, 10, 11, '#'); g.fill(11, 20, 28, 29, '#');
      g.fill(15, 20, 7, 9, 'W');                                            // snow curtain at the first wall
      g.fill(9, 9, 15, 18, 'W'); g.put(9, 20, 'S');
    }),
  },
  {
    name: '34 - Frostbite: Summit Blizzard',
    exit: 'top',
    rise: { speed: 5, delay: 3 },
    rows: B(g => {
      g.fill(21, 22, 0, 39, '#'); g.put(20, 2, 'P');
      g.put(20, 5, 'aa'); g.put(20, 9, 'bb');
      g.fill(7, 20, 19, 20, '#');                                           // wall to climb
      g.fill(12, 20, 16, 18, 'W');                                          // snow curtain hugging the wall
      g.put(18, 12, '####');
      g.put(6, 23, 'D'); g.put(4, 22, '######'); g.put(3, 25, 'S');
    }),
  },
  {
    name: '35 - Frostbite: Blink Blizzard',
    exit: 'right',
    rows: B(g => {
      g.floor(21, [[20, 6, 'W']]); g.put(20, 2, 'P');
      g.put(20, 6, 'aa'); g.put(20, 11, 'bb');
      g.fill(0, 16, 13, 17, '#'); g.fill(17, 20, 13, 17, 'W');              // tunnel
      g.put(16, 22, 'S'); g.put(18, 23, 'D');
      g.put(20, 30, 'aa'); g.put(20, 34, 'bb');
    }),
  },
  {
    name: '36 - Frostbite: Snow Gauntlet',
    exit: 'right',
    rows: B(g => {
      g.floor(21, [[25, 4, 'W']]); g.put(20, 2, 'P');
      g.fill(0, 16, 8, 12, '#'); g.fill(17, 20, 8, 12, 'W'); g.put(19, 10, 'S');
      g.put(20, 16, 'aa'); g.put(20, 20, 'bb');
      g.put(17, 27, 'D');
      g.fill(20, 20, 31, 35, 'W');
    }),
  },
  {
    name: '37 - Frostbite: Whiteout Ascent',
    exit: 'right',
    rise: { speed: 5, delay: 3 },
    rows: B(g => {
      g.fill(22, 22, 0, 39, '#'); g.put(21, 2, 'P'); g.put(21, 11, '^^^');
      g.put(19, 6, '####'); g.put(18, 7, 'S'); g.put(16, 13, '####');
      g.fill(9, 15, 18, 19, '#'); g.fill(9, 15, 16, 17, 'W'); g.put(13, 15, 'D');
      g.fill(8, 8, 18, 34, '#'); g.fill(8, 8, 38, 39, '#');
      g.fill(7, 7, 20, 24, 'W');
      g.put(7, 26, 'aa'); g.put(7, 29, 'S'); g.put(7, 31, 'bb');
    }),
  },
  {
    name: '38 - Frostbite Chase: The Long Winter',
    exit: 'right',
    boss: { speed: 30, startX: -48, firstDelay: 2, spikeEvery: 3.2, screamEvery: 5, ceiling: true },
    rows: B(g => {
      g.floor(21, [[10, 3, 'W'], [33, 3]]); g.put(20, 2, 'P');
      g.put(20, 16, 'aa'); g.put(20, 21, 'bb');
      g.fill(20, 20, 26, 29, 'W');
      g.put(17, 11, 'S'); g.put(17, 34, 'S');
    }),
  },
  {
    name: '39 - Frostbite Chase: Breath of the Goat',
    exit: 'right',
    boss: { speed: 34, startX: -44, firstDelay: 2, spikeEvery: 2.8, screamEvery: 4.8, ceiling: true },
    rows: B(g => {
      g.floor(21, [[10, 4, 'W'], [24, 5]]); g.put(20, 2, 'P'); g.put(20, 17, '##');
      g.put(15, 12, 'S'); g.put(16, 26, 'S');
    }),
  },
  {
    name: '40 - The Frozen Escape',
    exit: 'right',
    // finale again: the goat is right on your heels; the pad at leapX launches the mega-leap over the chasm
    boss: { speed: 36, startX: -40, firstDelay: 1.5, spikeEvery: 2.6, screamEvery: 4.5, ceiling: true, fallX: 224 },
    finale: { leapX: 168, vx: 150, vy: -400 },
    rows: B(g => {
      g.floor(21, [[10, 4, 'W'], [24, 10]]); g.put(20, 2, 'P'); g.put(20, 17, '##');
      g.put(9, 29, 'S'); g.put(15, 12, 'S');
    }),
  },
];

// ---- THE LONG WINTER (rooms 41-75) --------------------------------------------------------------------------------
// RUN(segments) lays a flat run out left to right (starting at column 3), one segment after another:
//   ['f', n] flat   ['pit', n, 'W'?] spike pit (W = filled with powder)   ['big', n, 'W'?] wide pit with a dash crystal
//   ['pop', k] k pairs of popping spikes   ['drift', n] low powder drift   ['tun', n] powder tunnel under a ceiling
//   ['hur', n] one-tile hurdle   ['cry', n] flat with a dash crystal above
const RUN = (segs, extra) => B(g => {
  g.floor(21); g.put(20, 2, 'P');
  let c = 3;
  for (const [t, n = 0, fill = '.'] of segs) {
    let w = n;
    const mid = c + (n >> 1);
    if (t === 'pit' || t === 'big') {
      g.fill(21, 21, c, c + n - 1, fill); g.fill(22, 22, c, c + n - 1, '^');
      g.put(t === 'big' ? 14 : 17, mid, 'S');
      if (t === 'big') g.put(17, mid, 'D');
    } else if (t === 'pop') { w = n * 8 - 2; for (let i = 0; i < n; i++) g.put(20, c + i * 8, 'aa..bb'); }
    else if (t === 'drift') { g.fill(20, 20, c, c + n - 1, 'W'); g.put(16, mid, 'S'); }
    else if (t === 'tun') { g.fill(0, 16, c, c + n - 1, '#'); g.fill(17, 20, c, c + n - 1, 'W'); g.put(19, mid, 'S'); }
    else if (t === 'hur') g.fill(20, 20, c, c + n - 1, '#');
    else if (t === 'cry') g.put(18, mid, 'D');
    c += w;
  }
  if (c > CFG.COLS) throw new Error('RUN too wide: ' + c);
  if (extra) extra(g);
});

// wall climbs (exit at the top)
const CLIMB_WALL = (opts = {}) => B(g => {            // the Frozen Wall layout: ledges, a wall, a dash crystal and a top ledge
  g.fill(22, 22, 0, 39, '#'); g.put(21, 2, 'P');
  if (opts.drift) g.fill(20, 21, 10, 17, 'W');
  g.fill(8, 21, 20, 21, '#');
  if (opts.curtain) g.fill(12, 21, 16, 19, 'W');
  g.put(19, 6, '####'); g.put(18, 7, 'S'); g.put(16, 12, '####');
  g.put(7, 22, 'D'); g.put(5, 24, '######'); g.put(4, 26, 'S');
});
const CLIMB_POP = () => B(g => {                      // the Summit Blizzard layout: popping spikes at the base of the wall
  g.fill(21, 22, 0, 39, '#'); g.put(20, 2, 'P');
  g.put(20, 5, 'aa'); g.put(20, 9, 'bb');
  g.fill(7, 20, 19, 20, '#'); g.fill(12, 20, 16, 18, 'W');
  g.put(18, 12, '####'); g.put(6, 23, 'D'); g.put(4, 22, '######'); g.put(3, 25, 'S');
});
const CLIMB_LADDER = drifts => B(g => {               // the Rising Powder layout: a ladder of ledges, some with drifts
  g.fill(22, 22, 0, 39, '#'); g.put(21, 3, 'P');
  g.put(19, 10, '######'); g.put(16, 18, '######'); g.put(13, 26, '######');
  g.put(10, 16, '######'); g.put(7, 8, '######'); g.put(4, 16, '######');
  g.put(5, 26, 'D'); g.put(1, 30, 'S');
  for (const [r, c0, c1] of drifts) g.fill(r, r, c0, c1, 'W');
});

const WITHERED = (n, name, boss, rows) => ({ name: `${n} - ${name}`, exit: 'right', boss: { withered: true, ...boss }, rows });

LEVELS.push(
  { name: '41 - The Long Winter: Thaw', exit: 'right',
    rows: RUN([['f', 3], ['pit', 4], ['f', 3], ['drift', 4], ['f', 3], ['pop', 1], ['f', 3], ['pit', 5, 'W'], ['f', 3]]) },
  { name: '42 - The Long Winter: Hollow Drifts', exit: 'right',
    rows: RUN([['f', 2], ['tun', 5], ['f', 3], ['pit', 4], ['f', 3], ['pop', 1], ['f', 2], ['drift', 5], ['f', 3]]) },
  { name: '43 - The Long Winter: Wide Open', exit: 'right',
    rows: RUN([['f', 3], ['big', 8], ['f', 3], ['pit', 5, 'W'], ['f', 3], ['tun', 4], ['f', 3], ['pop', 1]]) },
  { name: '44 - The Long Winter: White Steps', exit: 'right',
    rows: RUN([['f', 3], ['pit', 6], ['f', 2], ['drift', 6], ['f', 2], ['pit', 6, 'W'], ['f', 2], ['tun', 5], ['f', 3]]) },
  { name: '45 - The Long Winter: Snapping Snow', exit: 'right',
    rows: RUN([['f', 3], ['pop', 2], ['f', 2], ['pit', 5], ['f', 3], ['drift', 5], ['f', 3]]) },
  { name: '46 - The Long Winter: Two Chasms', exit: 'right',
    rows: RUN([['f', 2], ['big', 9], ['f', 3], ['big', 9], ['f', 3], ['pit', 4, 'W'], ['f', 3]]) },
  { name: '47 - The Long Winter: Double Tunnel', exit: 'right',
    rows: RUN([['f', 2], ['tun', 5], ['f', 2], ['tun', 5], ['f', 2], ['pit', 5, 'W'], ['f', 2], ['drift', 5], ['f', 3], ['pit', 4], ['f', 2]]) },
  { name: '48 - The Long Winter: Hurdles', exit: 'right',
    rows: RUN([['f', 2], ['hur', 2], ['f', 3], ['pit', 4], ['f', 2], ['hur', 2], ['f', 3], ['pop', 1], ['f', 3], ['pit', 5, 'W'], ['f', 3]]) },
  { name: '49 - The Long Winter: Pop and Drift', exit: 'right',
    rows: RUN([['f', 2], ['pop', 1], ['f', 2], ['drift', 4], ['f', 2], ['pop', 2], ['f', 2], ['pit', 4]]) },
  { name: '50 - The Long Winter: Frozen Wall II', exit: 'top', rows: CLIMB_WALL({ curtain: true, drift: true }) },
  { name: '51 - The Long Winter: Wide and Cold', exit: 'right',
    rows: RUN([['f', 3], ['big', 10], ['f', 2], ['pit', 5, 'W'], ['f', 2], ['pop', 1], ['f', 2], ['drift', 5], ['f', 2]]) },
  { name: '52 - The Long Winter: Frozen Steps', exit: 'right',
    rows: RUN([['f', 2], ['pit', 5], ['f', 2], ['pit', 5, 'W'], ['f', 2], ['pit', 5], ['f', 2], ['tun', 5], ['f', 2], ['drift', 5], ['f', 2]]) },
  { name: '53 - The Long Winter: Blink and Crawl', exit: 'right',
    rows: RUN([['f', 2], ['pop', 1], ['f', 2], ['tun', 5], ['f', 2], ['pop', 1], ['f', 2], ['drift', 5], ['f', 2]]) },
  { name: '54 - The Long Winter: Crystal Fields', exit: 'right',
    rows: RUN([['f', 2], ['big', 8], ['f', 2], ['big', 8, 'W'], ['f', 2], ['big', 8], ['f', 2]]) },
  { name: '55 - The Long Winter: Rising Blizzard', exit: 'top', rise: { speed: 5, delay: 3 }, rows: CLIMB_POP() },
  { name: '56 - The Long Winter: Sharp Edges', exit: 'right',
    rows: RUN([['f', 2], ['hur', 2], ['f', 2], ['drift', 4], ['f', 2], ['hur', 2], ['f', 2], ['pit', 6], ['f', 2], ['pop', 1], ['f', 2]]) },
  { name: '57 - The Long Winter: Snowed Under', exit: 'right',
    rows: RUN([['f', 2], ['pit', 6, 'W'], ['f', 2], ['tun', 5], ['f', 2], ['big', 8], ['f', 2], ['pop', 1], ['f', 2]]) },
  { name: '58 - The Long Winter: Pillars in the White', exit: 'right',
    rows: RUN([['f', 2], ['pop', 1], ['f', 2], ['pit', 5, 'W'], ['f', 2], ['pop', 1], ['f', 2], ['pit', 5], ['f', 2]]) },
  { name: '59 - The Long Winter: Everything at Once', exit: 'right',
    rows: RUN([['f', 2], ['tun', 4], ['f', 2], ['pop', 1], ['f', 2], ['pit', 5, 'W'], ['f', 2], ['big', 8], ['f', 2]]) },
  { name: '60 - The Long Winter: Rising Powder II', exit: 'top', rise: { speed: 10, delay: 1.5 },
    rows: CLIMB_LADDER([[15, 19, 22], [9, 17, 20], [6, 9, 12], [12, 27, 30]]) },
  { name: '61 - The Long Winter: Hollow Hurdles', exit: 'right',
    rows: RUN([['f', 2], ['hur', 2], ['f', 2], ['tun', 5], ['f', 2], ['hur', 2], ['f', 2], ['pit', 5, 'W'], ['f', 2], ['pop', 1], ['f', 2], ['hur', 2]]) },
  { name: '62 - The Long Winter: Ash and Ice', exit: 'right',
    rows: RUN([['f', 2], ['big', 9, 'W'], ['f', 2], ['drift', 5], ['f', 2], ['big', 9], ['f', 2], ['pop', 1]]) },
  { name: '63 - The Long Winter: Frostbitten', exit: 'right',
    rows: RUN([['f', 2], ['tun', 5], ['f', 2], ['pit', 5, 'W'], ['f', 2], ['tun', 5], ['f', 2], ['pit', 5, 'W'], ['f', 2], ['pop', 1]]) },
  { name: '64 - The Long Winter: The Last Field', exit: 'right',
    rows: RUN([['f', 2], ['pop', 1], ['f', 2], ['big', 8, 'W'], ['f', 2], ['tun', 4], ['f', 2], ['pit', 5], ['f', 2]]) },
  { name: '65 - The Long Winter: Frozen Wall III', exit: 'top', rise: { speed: 6, delay: 2 }, rows: CLIMB_WALL({ curtain: true, drift: true }) },

  // ---- THE WITHERED (rooms 66-75): a tall charcoal figure chases you and calls spikes up from the floor ------------
  // boss: { withered: true, speed px/s, startX, firstDelay, spikeEvery, desperateAfter (final room) }, see Withered.js
  WITHERED(66, 'The Withered: It Wakes', { speed: 30, startX: -70, firstDelay: 3, spikeEvery: 5 },
    RUN([['f', 2], ['pit', 4], ['f', 3], ['hur', 2], ['f', 3], ['pit', 5, 'W'], ['f', 3], ['hur', 2], ['f', 4]])),
  WITHERED(67, 'The Withered: Ash Steps', { speed: 32, startX: -68, firstDelay: 3, spikeEvery: 4.6 },
    RUN([['f', 2], ['hur', 2], ['f', 2], ['hur', 2], ['f', 2], ['pit', 5], ['f', 2], ['drift', 3], ['f', 2], ['pit', 4, 'W'], ['f', 2], ['hur', 2], ['f', 3]])),
  WITHERED(68, 'The Withered: Charred Chasm', { speed: 34, startX: -64, firstDelay: 2.5, spikeEvery: 4.2 },
    RUN([['f', 2], ['big', 8], ['f', 3], ['hur', 2], ['f', 3], ['pit', 5, 'W'], ['f', 2], ['big', 8], ['f', 2]])),
  WITHERED(69, 'The Withered: Thin Air', { speed: 36, startX: -60, firstDelay: 2.5, spikeEvery: 4 },
    RUN([['f', 2], ['pit', 5], ['f', 2], ['pop', 1], ['f', 2], ['hur', 2], ['f', 2], ['pit', 5, 'W'], ['f', 2], ['drift', 3], ['f', 2]])),
  WITHERED(70, 'The Withered: Soot and Snow', { speed: 38, startX: -56, firstDelay: 2.5, spikeEvery: 3.6 },
    RUN([['f', 2], ['drift', 4], ['f', 2], ['pit', 6], ['f', 2], ['hur', 2], ['f', 2], ['big', 8], ['f', 2], ['hur', 2], ['f', 2]])),
  WITHERED(71, 'The Withered: Reaching Hands', { speed: 40, startX: -54, firstDelay: 2, spikeEvery: 3.4 },
    RUN([['f', 2], ['pit', 5, 'W'], ['f', 2], ['hur', 2], ['f', 2], ['pit', 5], ['f', 2], ['hur', 2], ['f', 2], ['pit', 5, 'W'], ['f', 2], ['hur', 2], ['f', 2]])),
  WITHERED(72, 'The Withered: Hollow Run', { speed: 42, startX: -50, firstDelay: 2, spikeEvery: 3.2 },
    RUN([['f', 2], ['big', 9], ['f', 2], ['pop', 1], ['f', 2], ['pit', 5, 'W'], ['f', 2], ['drift', 3], ['f', 2], ['hur', 2], ['f', 2]])),
  WITHERED(73, 'The Withered: The Long Shadow', { speed: 44, startX: -48, firstDelay: 2, spikeEvery: 3 },
    RUN([['f', 2], ['hur', 2], ['f', 2], ['pit', 6], ['f', 2], ['hur', 2], ['f', 2], ['big', 8, 'W'], ['f', 2], ['pit', 5], ['f', 2]])),
  WITHERED(74, 'The Withered: Last Breath', { speed: 46, startX: -46, firstDelay: 2, spikeEvery: 2.8 },
    RUN([['f', 2], ['pit', 5], ['f', 2], ['hur', 2], ['f', 2], ['pit', 5, 'W'], ['f', 2], ['hur', 2], ['f', 2], ['big', 8], ['f', 2], ['hur', 2]])),
  // the last room: flat floor, and the exit is sealed. After a few seconds the Withered stops and calls tall spikes across
  // the whole floor. Only a Tough Hide survives: the spikes are reflected, pierce its heart, and it drops the Withered bones.
  WITHERED(75, 'The Withered: Desperate Measures',
    { speed: 38, startX: -50, firstDelay: 2, spikeEvery: 3, desperateAfter: 4.5 },
    RUN([['f', 34]], g => { g.put(17, 26, 'S'); })),

  // ---- ROOM 76: THE MERCHANT - a calm room. Jeff sells armour and items for coins (V to trade); the exit is the end of the game ----
  { name: '76 - The Merchant', exit: 'right', merchant: true,
    rows: RUN([['f', 37]], g => { g.put(17, 22, 'S'); g.put(17, 30, 'S'); }) },
);

// goat horns: rooms 11-19 keep their old rewards; of the Frostbite rooms only 20 and 40 pay out (1 horn each)
LEVELS.forEach((lv, i) => { if (i >= 19) lv.horns = (i === 19 || i === 39) ? 1 : 0; });

