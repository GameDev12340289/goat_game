// Rooms 1-40: the mountain. Hand-drawn rows; defines the LEVELS array that the other files push onto.
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
      [22, '#'.repeat(10) + '^'.repeat(4) + '#'.repeat(10) + '.'.repeat(10) + '#'.repeat(6)],   // no spikes in the chasm the goat falls into - a bottomless void
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
      g.put(22, 24, '..........');   // no spikes at the bottom of the chasm the goat falls into - it's a bottomless void
      g.put(9, 29, 'S'); g.put(15, 12, 'S');
    }),
  },
];
