// Rooms are 40x23 tile grids. Short rows are padded with '.', so only the leading part matters.
//   #  solid      ^  spike (floor)     P  player spawn
//   D  dash crystal                    S  coin
// exit: 'right' | 'top' -> leaving the screen that way loads the next room.
//   W  powder snow (see the Frostbite rooms below)
//   a / b  popping spikes (groups a and b take turns sticking out of the floor)
//   T  Stormlands tornado (stands still, hurls a brick at you every 5s - see GameScene.addTornado/updateTornadoes)
// winds: {...} (optional) -> small tornadoes keep whirling up ahead of you (the Wreckage, see Gusts.js).
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

// ---- RUN / CLIMB: layouts shared by the later rooms (41 onwards) ----------------------------------------------------
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
