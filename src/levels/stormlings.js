// ---- THE LITTLE STORM (rooms 166-170): a pocket-sized Cyclone chases you from the left - smaller, faster, and it still
// spits out the odd small tornado (see Cyclone.js, mini mode). Room 170 is the pincer: flat floor, sealed exit. Run far
// enough and a second little storm rises at the far edge, closing you in. It flickers red, flattens into a low whirl and
// charges - jump it at the right second. It slams into the first storm, they collide and a portal opens at the clash.
// Step into it: room 171, The True Eye of the Storm (calm, with a clear sky overhead).
const LITTLE = (n, name, boss, rows) => ({
  name: `${n} - The Little Storm: ${name}`, exit: 'right', rows,
  boss: { cyclone: true, scale: 0.45, height: 70, startX: -50, firstDelay: 3, minionEvery: [3.5, 6], ...boss },
});

LEVELS.push(
  LITTLE(166, 'Pocket Cyclone', { speed: 36 },
    RUN([['f', 4], ['pit', 4], ['f', 5], ['hur', 2], ['f', 5], ['pit', 5], ['f', 6]])),
  LITTLE(167, 'Small But Angry', { speed: 40 },
    RUN([['f', 3], ['hur', 2], ['f', 4], ['pit', 5], ['f', 4], ['hur', 2], ['f', 4], ['pit', 4], ['f', 4]])),
  LITTLE(168, 'Tight Spiral', { speed: 44 },
    RUN([['f', 3], ['big', 8], ['f', 4], ['pit', 5], ['f', 4], ['hur', 2], ['f', 5]])),
  LITTLE(169, 'Wind At Your Heels', { speed: 48 },
    RUN([['f', 3], ['pit', 5, 'W'], ['f', 3], ['hur', 2], ['f', 3], ['pit', 5], ['f', 3], ['big', 8], ['f', 3]])),
  // the last chase: no obstacles and no small tornadoes - just you, the storm and what happens at x = 200
  LITTLE(170, 'Pincer', { speed: 40, minions: false, ambush: 200 },
    RUN([['f', 34]], g => { g.put(17, 12, 'S'); g.put(17, 22, 'S'); })),

  // the portal's far side. Dead calm: the wall of the storm circles slowly all around, and the sky is clear overhead.
  { name: '171 - The True Eye of the Storm', exit: 'right', eye: true,
    rows: RUN([['f', 34]], g => { g.put(17, 12, 'S'); g.put(17, 20, 'S'); g.put(17, 28, 'S'); }) },
);
