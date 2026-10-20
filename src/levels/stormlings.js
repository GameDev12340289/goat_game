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

  // ---- ROOM 171, THE EYE OF THE STORM - two parts under one room number (see GameScene.loadRoom / nextRoom) --------------------
  // The portal's far side: the sky is clear overhead but every small tornado of the game is loose in the eye - brick throwers
  // ('T'), tornadoes whirling up ahead of you and dust devils racing along the floor (no Cyclone, though). Lightning marks the
  // spot where you stand and strikes it (lightning.js); it ignores Tough Hide. The camera is zoomed far out so it looks enormous.
  //  part 1, Debris Storm: swarms of swirling debris sweep past; each swarm has a 20% chance to drop a chunk on you (swirl.js).
  //  part 2, The Stairwell: a tall climb. Lightning every 5s and the storms throw debris at you faster and faster. Top = room 172.
  { name: '171 - The Eye of The Storm', exit: 'right', eye: true, zoom: 0.65, parts: [
    { name: '171 - The Eye of The Storm: Debris Storm',
      winds: { firstDelay: 2, every: [2.2, 3.4], runnerEvery: 4 },
      lightning: { every: 10, warn: 1.2 },
      swirl: { every: [2.2, 3.6], chance: 0.2 },
      rows: RUN([['f', 3], ['pit', 4], ['f', 3], ['hur', 2], ['f', 3], ['pop', 1], ['f', 3], ['pit', 5], ['f', 3], ['hur', 2], ['f', 3]],
        g => { [8, 14, 22, 29, 36].forEach(c => g.put(17, c, 'T')); g.put(14, 16, 'S'); g.put(14, 31, 'S'); }) },
    { name: '171 - The Eye of The Storm: The Stairwell', exit: 'top',
      lightning: { every: 5, warn: 1.2 },
      debrisThrow: { first: 2.5, every: 2.6, factor: 0.93, min: 0.45, speed: 55, speedUp: 1.03, maxSpeed: 130 },
      rows: B(g => {
        g.fill(22, 22, 0, 39, '#'); g.put(21, 3, 'P');
        [[19, 6], [16, 15], [13, 24], [10, 15], [7, 6], [4, 15], [1, 24]].forEach(([r, c]) => g.put(r, c, '#######'));   // switchback stairs, 7 wide, 3 rows apart
        g.put(18, 9, 'S'); g.put(9, 18, 'S'); g.put(0, 27, 'S');
      }) },
  ] },

  // the way out: you fall in from the top of the stairwell. No traps, no storm, no nothing: Jeff has set up shop among
  // harmless ruins, and the sky is finally clear.
  { name: '172 - The Calm Beyond', exit: 'right', beyond: true, ruins: true, zoom: 0.8, fallIn: true,
    merchant: true, jeffX: 150, jeffStays: true,
    rows: RUN([['f', 34]], g => { g.put(18, 8, 'S'); g.put(18, 20, 'S'); g.put(18, 32, 'S'); }) },
);
