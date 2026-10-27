// ---- THE HAND (rooms 231-235): the colourless hand that tore out of the sky at the end of room 230 hunts you. It doesn't run
// after you (see Hand.js): the sky flashes red, rips open, and a small hand gropes blindly through the air for a few seconds
// before it vanishes - or it grasps the sky itself and drags a slab of it down on a flashing patch of floor, crushing
// whatever is still standing there. Keep moving and keep away from it. Each room it strikes more often, gropes longer and aims a little
// better. Leaving room 235 ends the run.
const HAND = (n, name, boss, course, extra = {}) => ({
  name: `${n} - The Hand: ${name}`, exit: 'right', zoom: 0.8, tear: true, distort: 14,
  boss: { hand: true, ...boss }, rows: RUN(course), ...extra,
});

LEVELS.push(
  HAND(231, 'Reaching', { firstDelay: 3, every: 6.5, warn: 1.3, grasp: 3, seek: 0, crush: 0.3 },
    [['f', 4], ['pit', 4], ['f', 5], ['hur', 2], ['f', 5], ['pit', 5], ['f', 6]]),
  HAND(232, 'Grasping', { firstDelay: 2.5, every: 6, warn: 1.2, grasp: 3, seek: 0.1, crush: 0.4 },
    [['f', 3], ['hur', 2], ['f', 4], ['pit', 5], ['f', 4], ['hur', 2], ['f', 4], ['pit', 4], ['f', 4]]),
  HAND(233, 'Closing Fingers', { firstDelay: 2.5, every: 5.5, warn: 1.1, grasp: 3.5, seek: 0.15, crush: 0.45, crushWarn: 1.7 },
    [['f', 3], ['big', 8], ['f', 4], ['pit', 5, 'W'], ['f', 4], ['hur', 2], ['f', 5]]),
  HAND(234, 'Nowhere to Hide', { firstDelay: 2, every: 5, warn: 1, grasp: 3.5, seek: 0.2, crush: 0.5, crushWarn: 1.6 },
    [['f', 3], ['pit', 5], ['f', 3], ['hur', 2], ['f', 3], ['pit', 5], ['f', 3], ['hur', 2], ['f', 3], ['pit', 4], ['f', 3]]),
  HAND(235, 'The Last Grab', { firstDelay: 2, every: 4.5, warn: 1, grasp: 4, seek: 0.25, crush: 0.5, crushWarn: 1.5 },
    [['f', 3], ['big', 8], ['f', 3], ['hur', 2], ['f', 3], ['pit', 5], ['f', 3], ['big', 8], ['f', 2]],
    { horns: 10, hornsExact: true }),
);

