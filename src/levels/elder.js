// ---- THE ELDER GOAT (rooms 151-165): the giant goat is back, and now it dashes - it flashes red for a second, then
// lunges forward (boss.dashEvery, see Boss.js). Keep your distance. Room 165: the floor ends at a chasm too wide to jump;
// near the edge the Cyclone returns, flings you across and blows the goat into the chasm (rescue: see rescue.js).
const ELDER = (n, name, boss, rows, extra = {}) => ({ name: `${n} - The Elder Goat: ${name}`, exit: 'right', boss, rows, ...extra });

LEVELS.push(
  ELDER(151, 'Return of the Elder', { speed: 22, startX: -100, firstDelay: 3, dashEvery: 6 },
    RUN([['f', 4], ['pit', 4], ['f', 5], ['hur', 2], ['f', 5], ['pit', 5], ['f', 6]])),
  ELDER(152, 'Red Warning', { speed: 23, startX: -98, firstDelay: 3, dashEvery: 5.5 },
    RUN([['f', 3], ['hur', 2], ['f', 4], ['pit', 5], ['f', 4], ['hur', 2], ['f', 4], ['pit', 4], ['f', 4]])),
  ELDER(153, 'Charging Horns', { speed: 24, startX: -96, firstDelay: 3, dashEvery: 5.5, spikeEvery: 5 },
    RUN([['f', 3], ['big', 8], ['f', 4], ['pit', 5], ['f', 4], ['hur', 2], ['f', 5]])),
  ELDER(154, 'Stampede', { speed: 25, startX: -94, firstDelay: 3, dashEvery: 5, screamEvery: 7 },
    RUN([['f', 3], ['pit', 5, 'W'], ['f', 4], ['hur', 2], ['f', 4], ['pit', 5], ['f', 4], ['drift', 3], ['f', 3]])),
  ELDER(155, 'Lunging Shadow', { speed: 26, startX: -92, firstDelay: 2.5, dashEvery: 5, spikeEvery: 4.5 },
    RUN([['f', 3], ['big', 8], ['f', 3], ['big', 8], ['f', 4], ['hur', 2], ['f', 3]])),
  ELDER(156, 'Old Grudge', { speed: 27, startX: -90, firstDelay: 2.5, dashEvery: 4.8, screamEvery: 6.5 },
    RUN([['f', 4], ['pit', 4], ['f', 5], ['pit', 5], ['f', 5], ['hur', 2], ['f', 5]])),
  ELDER(157, 'Hoofbeats', { speed: 28, startX: -88, firstDelay: 2.5, dashEvery: 4.6, spikeEvery: 4.2, ceiling: true },
    RUN([['f', 3], ['hur', 2], ['f', 3], ['hur', 2], ['f', 3], ['pit', 5], ['f', 3], ['hur', 2], ['f', 3], ['pit', 4], ['f', 3]])),
  ELDER(158, 'Rage of Ages', { speed: 28, startX: -86, firstDelay: 2.5, dashEvery: 4.4, spikeEvery: 4.5, screamEvery: 6.5 },
    RUN([['f', 3], ['pit', 5, 'W'], ['f', 3], ['big', 8], ['f', 3], ['pit', 5], ['f', 4]])),
  ELDER(159, 'Headlong', { speed: 29, startX: -84, firstDelay: 2.5, dashEvery: 4.2, spikeEvery: 4 },
    RUN([['f', 3], ['pop', 1], ['f', 3], ['pit', 5], ['f', 3], ['hur', 2], ['f', 3], ['pit', 5], ['f', 3]])),
  ELDER(160, 'The Long Charge', { speed: 30, startX: -82, firstDelay: 2, dashEvery: 4.2, screamEvery: 6, ceiling: true, spikeEvery: 4.2 },
    RUN([['f', 3], ['hur', 2], ['f', 3], ['pit', 5, 'W'], ['f', 3], ['hur', 2], ['f', 3], ['big', 8], ['f', 3]])),
  ELDER(161, 'Bloodred Eyes', { speed: 31, startX: -80, firstDelay: 2, dashEvery: 4, spikeEvery: 3.8, screamEvery: 6 },
    RUN([['f', 3], ['pit', 5], ['f', 3], ['pit', 5], ['f', 3], ['pit', 5], ['f', 3], ['drift', 3], ['f', 3]])),
  ELDER(162, 'Thundering Hooves', { speed: 32, startX: -78, firstDelay: 2, dashEvery: 3.8, spikeEvery: 3.6, ceiling: true },
    RUN([['f', 3], ['big', 8], ['f', 3], ['hur', 2], ['f', 3], ['pit', 5, 'W'], ['f', 3], ['hur', 2], ['f', 3]])),
  ELDER(163, 'No Escape', { speed: 33, startX: -76, firstDelay: 2, dashEvery: 3.6, spikeEvery: 3.4, screamEvery: 5.5, ceiling: true },
    RUN([['f', 3], ['pop', 1], ['f', 3], ['big', 8], ['f', 3], ['pit', 5], ['f', 4]])),
  ELDER(164, 'Edge of the World', { speed: 34, startX: -74, firstDelay: 2, dashEvery: 3.5, spikeEvery: 3.2, screamEvery: 5, ceiling: true },
    RUN([['f', 3], ['hur', 2], ['f', 2], ['pit', 5], ['f', 2], ['hur', 2], ['f', 2], ['pit', 5, 'W'], ['f', 2], ['hur', 2], ['f', 3]])),
  // the last room: the floor ends at a bottomless chasm (cols 18-33) that's far too wide to jump. Reach the edge and the
  // Cyclone takes over - it flings you to the far ledge and its last gust blows the elder goat down into the chasm.
  // The exit stays sealed until the storm is spent; it's the end of the game.
  ELDER(165, 'The Last Gust', { speed: 30, startX: -80, firstDelay: 2, dashEvery: 3.5, spikeEvery: 4 },
    B(g => {
      g.floor(21, [[18, 16]]); g.put(22, 18, '.'.repeat(16)); g.put(20, 2, 'P');   // no spikes: it's a bottomless void
      g.put(17, 9, 'S'); g.put(17, 37, 'S');
    }),
    { rescue: { triggerX: 120, landX: 290, edgeX: 144 } }),
);
