// Shared constants. Speeds are px/s, times are seconds (tuned after Celeste's feel).
const CFG = {
  W: 320, H: 184, TILE: 8, COLS: 40, ROWS: 23,
  ZOOM: 3, // canvas is W*ZOOM wide; the world camera zooms in, UI text is drawn at full res

  // player hitbox
  PW: 8, PH: 11,

  // running
  RUN_MAX: 90, RUN_ACCEL: 1000, RUN_REDUCE: 400, AIR_MULT: 0.65,

  // gravity / falling
  GRAVITY: 900, MAX_FALL: 160, FAST_FALL: 240, HALF_GRAV_BELOW: 40,

  // jumping
  JUMP_SPEED: -130, JUMP_HBOOST: 40, VAR_JUMP_TIME: 0.2,
  COYOTE: 0.1, JUMP_BUFFER: 0.1,

  // walls
  WALL_JUMP_CHECK: 3, WALL_JUMP_HSPEED: 130, WALL_JUMP_LOCK: 0.16, WALL_SLIDE_MAX: 30,

  // climbing
  STAMINA: 110, CLIMB_UP: -45, CLIMB_DOWN: 80,
  CLIMB_UP_COST: 45.5, CLIMB_HOLD_COST: 10, CLIMB_JUMP_COST: 27.5,

  // dash
  DASH_SPEED: 240, DASH_END_SPEED: 160, DASH_TIME: 0.15, DASH_COOLDOWN: 0.1, DASH_FREEZE: 0.05,
  SUPER_JUMP_H: 260, HYPER_JUMP_H: 325, HYPER_JUMP_V: -60,

  CRYSTAL_RESPAWN: 2.5,

  // popping spikes: one full cycle (warn -> out -> retract -> hidden); group 'b' runs half a cycle behind 'a'
  POP_PERIOD: 2.4, POP_WARN: 0.35, POP_RISE: 0.1, POP_OUT: 0.7, POP_RETRACT: 0.15,

  // powder snow (like Minecraft's): you sink, crawl, and freeze if you stay in it too long. Dashing skips through it.
  POWDER_RUN: 0.35, POWDER_FALL: 22, POWDER_JUMP: -95, POWDER_FREEZE: 2.4, POWDER_THAW: 1.2,
};

// goat horns: +HORNS_PER_BOSS_ROOM for every boss chase room you escape, +HORNS_BOSS_DEFEATED for beating the boss
CFG.HORNS_PER_BOSS_ROOM = 0.25;  // 75% less than the original 1 (fractions accumulate in Save.hornFrac)
CFG.HORNS_BOSS_DEFEATED = 1.25;  // originally 5 (that's 75% less, too)
// Rampage of the Mountains: invincible + fast + huge horns for RAMPAGE_TIME, then half speed for RAMPAGE_TIRED_TIME
CFG.RAMPAGE_TIME = 5; CFG.RAMPAGE_COOLDOWN = 120; CFG.RAMPAGE_SPEED = 1.5; CFG.RAMPAGE_HORNS = 3;
CFG.RAMPAGE_TIRED_TIME = 2; CFG.RAMPAGE_TIRED_SPEED = 0.5;
// Mountain Toughened Hide: press F -> shield for SHIELD_TIME; the next hit is deflected (boss attacks are reflected and stun it)
CFG.SHIELD_CHARGES = 4; CFG.SHIELD_BOSS_COST = 2; CFG.SHIELD_TIME = 3; CFG.SHIELD_COOLDOWN = 10; CFG.SHIELD_GRACE = 1; CFG.BOSS_STUN = 2; CFG.TRIAL_TIME = 90; // trial: beat the boss chase (rooms 11-19) in 1:30 without dying
CFG.BONES_MIN = 1; CFG.BONES_MAX = 5;   // Withered bones dropped per kill
// Odin's Blessing (Jeff): immune to powder snow, 5 hits to die (3 against boss attacks), every drop x5. Unlocked by a trial.
CFG.ODIN_HITS = 5; CFG.ODIN_BOSS_HITS = 3; CFG.ODIN_DROPS = 5; CFG.ODIN_TRIAL_ROOM = 10; CFG.ODIN_TRIAL_TIME = 90;
CFG.HURT_INVULN = 1.5; // seconds of invulnerability after Tough Hide absorbs a hit
CFG.JEFF_DESPAWN = 120000; // Jeff packs up and vanishes if you dawdle this long (ms)
CFG.LEAP_IFRAME = 2; // seconds of invulnerability (hazards and boss attacks) right after landing a boss-chase finale leap
// Gambler's Coin (Jeff, VIP): press G to flip it. 70% GAMBLE_BOOST_TIME of speed + invincibility, 10% frozen solid for
// GAMBLE_FREEZE_TIME and every extra life is negated for the rest of the room, 20% GAMBLE_SLOW_TIME of half speed and
// double damage. GAMBLE_COOLDOWN between flips.
CFG.GAMBLE_COOLDOWN = 20; CFG.GAMBLE_BOOST_TIME = 5; CFG.GAMBLE_FREEZE_TIME = 22; CFG.GAMBLE_SPEED = 1.4;
CFG.GAMBLE_SLOW_TIME = 300; CFG.GAMBLE_SLOW_MULT = 0.5; CFG.GAMBLE_SLOW_DAMAGE = 2;
// Stormlands tornadoes ('T' tile): every TORNADO_PERIOD seconds each one hurls a brick at wherever the goat currently is.
// The first brick that ever clips you in a room only stuns you (can't act) for TORNADO_STUN seconds; every one after costs a life.
CFG.TORNADO_PERIOD = 5; CFG.TORNADO_BRICK_SPEED = 70; CFG.TORNADO_STUN = 2;
// The Cyclone (rooms 101-120, see Cyclone.js): touching one of its small tornadoes stuns you the 1st time (CYCLONE_STUN s),
// blows you backwards the 2nd (CYCLONE_PUSH_* for CYCLONE_PUSH_LOCK s), and the 3rd flings you into the Cyclone - death.
CFG.CYCLONE_STUN = 1.5; CFG.CYCLONE_PUSH_VX = 260; CFG.CYCLONE_PUSH_VY = -110; CFG.CYCLONE_PUSH_LOCK = 0.3;
CFG.CYCLONE_TOUCH_IFRAME = 0.6; CFG.CYCLONE_FLING_TIME = 0.55;

// shop items; effects are applied in GameScene.applyUpgrades()
const UPGRADES = [
  { id: 'toughHide', name: 'Tough Hide', cost: 75,
    desc: 'Die in 2 hits instead of 1. Spikes and hazards only hurt once per room, but boss attacks still one-shot you.' },
  { id: 'mountainHide', name: 'Mountain Toughened Hide', cost: 2, requires: 'toughHide', trial: true,
    desc: 'Needs Tough Hide, and you must first beat the boss chase (rooms 11-19) within 1:30 without dying (you can pass the trial before buying Tough Hide). ' +
          'Press F to raise a shield that blocks 4 hits (hazards cost 1, boss attacks cost 2). Boss attacks are reflected and stun the boss for 2 seconds. 10 second cooldown once it is used up.' },
  { id: 'ironGrip', name: 'Iron Grip', cost: 90, desc: 'Climb walls 1.5x faster.' },
  { id: 'swiftHooves', name: 'Swift Hooves', cost: 120, desc: '+10% running speed.' },
  { id: 'rampage', name: 'Rampage of the Mountains', cost: 750,
    desc: 'Press Q or E for 5 seconds of invincibility to everything (even the boss), +50% speed and huge horns. Then 2 seconds at half speed. 120 second cooldown.' },
];

// goat shop prices are paid in coins (no horns) and are 25% cheaper than the original list above (rounded down)
UPGRADES.forEach(u => { u.cost = Math.floor(u.cost * 0.75); });

// Jeff the merchant sells armour and items for goat horns only - never coins. The VIP tier is the good stuff:
// it also demands big piles of Withered bones on top of its horns price. See Save.buyWithHorns / GameScene.applyUpgrades.
const JEFF_ITEMS = [
  // armour (goat horns)
  { kind: 'armour', id: 'frostCloak', name: 'Frost Cloak', cost: 8, desc: 'Powder snow takes twice as long to freeze you.' },
  { kind: 'armour', id: 'hornedHelm', name: 'Horned Helm', cost: 10, desc: 'After a hit is absorbed you stay protected twice as long (3 seconds).' },
  { kind: 'armour', id: 'spareHide', name: 'Spare Hide', cost: 12, desc: '+1 hit point. Hazards only - boss attacks still one-shot you.' },
  { kind: 'armour', id: 'frostplate', name: 'Frostplate', cost: 14, desc: 'You thaw out twice as fast after leaving powder snow.' },
  { kind: 'armour', id: 'ironPlate', name: 'Iron Plate', cost: 20, desc: '+1 hit point on top of everything else. Hazards only.' },
  // items (goat horns)
  { kind: 'item', id: 'sureFooting', name: 'Sure Footing', cost: 5, desc: '+50% climbing stamina.' },
  { kind: 'item', id: 'gripChalk', name: 'Grip Chalk', cost: 7, desc: 'You slide down walls half as fast.' },
  { kind: 'item', id: 'rampageTonic', name: 'Rampage Tonic', cost: 12, desc: 'Rampage of the Mountains recharges a third faster (80 seconds).' },
  { kind: 'item', id: 'twinDash', name: 'Twin Dash', cost: 16, desc: 'Carry two dashes at once.' },
  // VIP items: Jeff's best gear, kept under the counter. Horns alone won't do - he wants a serious pile of Withered bones too.
  { kind: 'vip', id: 'odin', name: "Odin's Blessing", cost: 125, bones: 275, trial: 'odin',
    desc: 'Trial: reach room 10 in 1:30 with no deaths (start at room 1). Costs 125 goat horns, 275 Withered bones. ' +
          'Immune to powder snow. 5 hits to die, 3 against boss attacks. All drops x5.' },
  { kind: 'vip', id: 'boneWard', name: 'Bone Ward', cost: 30, bones: 320,
    desc: '+1 hit point on top of everything else (stacks with Iron Plate). Hazards only - the toughest hide bones can buy.' },
  { kind: 'vip', id: 'elderRampage', name: "Elder's Rampage", cost: 45, bones: 480,
    desc: "Requires Rampage of the Mountains to do anything. Doubles its duration (10 seconds) and halves its cooldown on top of Rampage Tonic." },
  { kind: 'vip', id: 'gamblersCoin', name: "Gambler's Coin", cost: 55, bones: 550,
    desc: 'Press G to flip it (20 second cooldown). 70% chance: speed boost and invincibility for 5 seconds. ' +
          '10% chance: frozen solid for 22 seconds, and every extra life is negated for the rest of the room. ' +
          '20% chance: 50% slower and take double damage for 5 minutes.' },
];

// shared text style for the full-resolution menu scenes
const uiText = (size, extra = {}) => ({
  fontFamily: '"Courier New", monospace', fontSize: `${size}px`, fontStyle: 'bold',
  color: '#ffffff', stroke: '#0e1428', strokeThickness: Math.max(2, Math.round(size / 9)), ...extra,
});

const approach =(v, target, amt) =>
  v < target ? Math.min(v + amt, target) : Math.max(v - amt, target);



