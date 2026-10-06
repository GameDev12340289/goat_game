// goat horns: rooms 11-19 keep their old rewards; of the later rooms only 20 and 40 pay out (1 horn each), and beating
// the Cyclone in room 120 pays exactly 5 (hornsExact: not tripled by HORN_DROP_MULT)
LEVELS.forEach((lv, i) => { if (i >= 19) lv.horns = (i === 19 || i === 39) ? 1 : 0; });
Object.assign(LEVELS[119], { horns: 5, hornsExact: true });
Object.assign(LEVELS[164], { horns: 10, hornsExact: true });   // beating the elder goat for good in room 165
Object.assign(LEVELS[169], { horns: 5, hornsExact: true });    // surviving the pincer and stepping through the portal in room 170

