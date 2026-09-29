// The main gameplay scene: lifecycle, input, the game loop and collision helpers.
// The rest of its methods live in src/scenes/game/*.js, each of which mixes a group into GameScene.prototype:
//   rooms.js     room loading and drawing          world.js     per-frame hazards, pickups and exits
//   abilities.js Rampage, shield, Gambler's Coin   damage.js    hurting, deflecting and dying
//   storm.js     Stormlands bricks, Cyclone wind   progress.js  room transitions, trials and rewards
//   jeff.js      Jeff the merchant                 effects.js   particles and ghosts
//   hud.js       HUD text and UIScene messages
class GameScene extends Phaser.Scene {
  // the boss chase (rooms 11-19) spans these room indexes; the Mountain Toughened Hide trial runs across it
  static CHASE_FIRST = 10;
  static CHASE_LAST = 18;
  static FADE_RGB = [14, 20, 40];

  constructor() { super('Game'); }

  init(data) { this.startRoom = (data && data.room) || 0; }

  create() {
    this.setupKeys();
    this.cameras.main.setBackgroundColor(0x0e1428).setZoom(CFG.ZOOM).centerOn(CFG.W / 2, CFG.H / 2);
    if (!this.scene.isActive('UI')) this.scene.launch('UI');
    this.game.events.emit('complete', '');
    this.setPaused(false);
    this.resetRunState();
    this.shieldG = this.add.graphics().setDepth(25);

    this.player = new Player(this);
    this.frost = this.add.graphics().setDepth(30);
    this.applyUpgrades();
    this.makeSnow();
    this.loadRoom(this.startRoom);
  }

  setupKeys() {
    const K = Phaser.Input.Keyboard.KeyCodes;
    const add = codes => codes.map(c => this.input.keyboard.addKey(c));
    this.keys = {
      left: add([K.LEFT, K.A]), right: add([K.RIGHT, K.D]),
      up: add([K.UP, K.W]), down: add([K.DOWN, K.S]),
      jump: add([K.C, K.SPACE, K.K]), dash: [this.rightShiftKey()], grab: add([K.W, K.L]),
      rampage: add([K.Q, K.E]), deflect: add([K.F]), gamble: add([K.G]), talk: add([K.V]),
      restart: add([K.R]), menu: add([K.ESC]), enter: add([K.ENTER]), quit: add([K.M]),
    };
  }

  // Duck-typed Key stand-in (isDown / _justDown) that only responds to the
  // physical right Shift, since Phaser's SHIFT keycode matches either side.
  rightShiftKey() {
    const key = { isDown: false, _justDown: false };
    const isRight = e => e.code === 'ShiftRight' || e.location === 2;
    this.input.keyboard.on('keydown-SHIFT', e => {
      if (!isRight(e)) return;
      if (!key.isDown) key._justDown = true;
      key.isDown = true;
    });
    this.input.keyboard.on('keyup-SHIFT', e => { if (isRight(e)) key.isDown = false; });
    return key;
  }

  pressed(keys) { return keys.some(k => Phaser.Input.Keyboard.JustDown(k)); }
  held(keys) { return keys.some(k => k.isDown); }

  resetRunState() {
    this.roomObjs = [];
    this.deaths = 0; this.coinCount = 0; this.time_ = 0; this.hornsEarned = 0;
    this.collected = new Set();
    this.freezeT = 0; this.deadT = 0; this.transitioning = false; this.completed = false;
    this.chaseMark = null;
    this.puffT = 0;
    this.rampageT = 0; this.rampageCd = 0; this.exhaustT = 0;   // Rampage of the Mountains: active / cooldown / tired timers
    this.shieldT = 0; this.shieldCd = 0; this.graceT = 0; this.shieldCharges = 0;      // Mountain Toughened Hide: shield / cooldown / boss-proof grace after a deflect
    this.gambleCd = 0; this.gambleBoostT = 0; this.gambleFrozenT = 0; this.gambleSlowT = 0; this.noExtraLives = false;   // Gambler's Coin: cooldown / lucky flip / frozen-solid / slowed-and-fragile timers, and the bad flip's HP penalty
  }

  // shop upgrades (bought in the menu)
  applyUpgrades() {
    // a bad Gambler's Coin flip negates every extra life for the rest of the room: back to a single hit point regardless of gear
    if (this.noExtraLives) this.maxHp = 1;
    else {
      this.maxHp = (Save.has('toughHide') ? 2 : 1) + ['spareHide', 'ironPlate', 'boneWard'].filter(id => Save.has(id)).length;
      if (Save.has('odin')) this.maxHp = Math.max(this.maxHp, CFG.ODIN_HITS);      // Odin's Blessing: 5 hits
    }
    const p = this.player;
    p.slideMax = CFG.WALL_SLIDE_MAX * (Save.has('gripChalk') ? 0.5 : 1);
    p.climbMult = Save.has('ironGrip') ? 1.5 : 1;
    p.maxStamina = CFG.STAMINA * (Save.has('sureFooting') ? 1.5 : 1);
    p.maxDashes = Save.has('twinDash') ? 2 : 1;
    p.runMax = CFG.RUN_MAX * (Save.has('swiftHooves') ? 1.1 : 1);
  }

  // pause menu: the whole game loop stops (so nothing can hurt the goat) and the world's tweens / timers freeze with it
  setPaused(on) {
    this.paused = on;
    if (on) this.tweens.pauseAll(); else this.tweens.resumeAll();
    this.time.paused = on;
    this.game.events.emit('pause', on);
  }

  toMenu() {
    this.setPaused(false);
    this.scene.stop('UI');
    this.scene.start('Menu');
  }

  // ---- collision helpers (used by Player and the bosses) --------------------
  isSolid(c, r) {
    if (c < 0) return true;
    if (c >= CFG.COLS) return this.room.exit !== 'right' || !!this.exitLocked;
    if (r < 0) return this.room.exit !== 'top';
    if (r >= CFG.ROWS) return false;
    return this.grid[r][c];
  }

  solidBox(x, y, w, h) {
    const T = CFG.TILE;
    const c0 = Math.floor(x / T), c1 = Math.floor((x + w - 1) / T);
    const r0 = Math.floor(y / T), r1 = Math.floor((y + h - 1) / T);
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++)
        if (this.isSolid(c, r)) return true;
    return false;
  }

  // does the player's hitbox overlap the box at (x, y)? h defaults to w for square pickups
  overlapsPlayer(x, y, w = 8, h = w) {
    const p = this.player;
    return p.x < x + w && p.x + CFG.PW > x && p.y < y + h && p.y + CFG.PH > y;
  }

  isPowder(c, r) { return !!(this.powder[r] && this.powder[r][c]); }

  // does the player's body overlap any powder snow?
  inPowderSnow(p) {
    const T = CFG.TILE;
    const x0 = p.x + 1, x1 = p.x + CFG.PW - 2, y0 = p.y + 2, y1 = p.y + CFG.PH - 1;
    for (let r = Math.floor(y0 / T); r <= Math.floor(y1 / T); r++)
      for (let c = Math.floor(x0 / T); c <= Math.floor(x1 / T); c++)
        if (this.isPowder(c, r)) return true;
    return false;
  }

  // wading in powder (Odin makes you immune, and dashing / leaping skips through it)
  playerWading() {
    const p = this.player;
    return !Save.has('odin') && p.state !== 'dash' && p.state !== 'leap' && this.inPowderSnow(p);
  }

  // rampaging or riding a lucky coin flip: untouchable by everything
  get invincible() { return this.rampageT > 0 || this.gambleBoostT > 0; }

  // ---- game loop -----------------------------------------------------------
  update(time, delta) {
    const dt = Math.min(delta, 33) / 1000;
    const k = this.keys;
    const restart = this.pressed(k.restart);
    const enter = this.pressed(k.enter);

    if (this.pressed(k.menu)) {
      if (this.completed) return this.toMenu();
      if (!this.transitioning) this.setPaused(!this.paused);
      return;
    }
    if (this.paused) {
      if (this.pressed(k.quit)) return this.toMenu();
      Object.values(k).forEach(keys => this.pressed(keys));   // swallow presses made while paused so they don't fire on resume
      return;
    }
    if (this.completed) {
      if (enter) return this.toMenu();
      if (restart) this.scene.restart({ room: 0 });
      return;
    }
    if (this.transitioning) return;
    if (restart) this.killPlayer(true);
    if (this.freezeT > 0) { this.freezeT -= dt; return; }
    if (this.deadT > 0) {
      this.deadT -= dt;
      if (this.deadT <= 0) this.loadRoom(this.roomIndex);
      return;
    }
    if (this.fling) return this.updateFling(dt);

    let inp = this.readInput();
    this.time_ += dt;
    this.tickTimers(dt);
    this.useAbilities();
    if (this.gambleFrozenT > 0 || this.brickStunT > 0)
      inp = { x: 0, y: 0, jumpPressed: false, jumpHeld: false, dashPressed: false, grab: false };

    const p = this.player;
    p.speedMult = this.rampageT > 0 ? CFG.RAMPAGE_SPEED : this.gambleBoostT > 0 ? CFG.GAMBLE_SPEED
      : this.exhaustT > 0 ? CFG.RAMPAGE_TIRED_SPEED : this.gambleSlowT > 0 ? CFG.GAMBLE_SLOW_MULT : 1;
    p.hornScale = this.rampageT > 0 ? CFG.RAMPAGE_HORNS : 1;
    p.inPowder = this.playerWading();
    p.update(dt, inp);
    this.checkWorld(dt);
    this.drawShield();
    this.updateHud();
  }

  readInput() {
    const k = this.keys;
    return {
      x: (this.held(k.right) ? 1 : 0) - (this.held(k.left) ? 1 : 0),
      y: (this.held(k.down) ? 1 : 0) - (this.held(k.up) ? 1 : 0),
      jumpPressed: this.pressed(k.jump), jumpHeld: this.held(k.jump),
      dashPressed: this.pressed(k.dash), grab: this.held(k.grab),
    };
  }

  tickTimers(dt) {
    const tick = t => Math.max(0, t - dt);
    this.rampageCd = tick(this.rampageCd);
    if (this.rampageT > 0) {
      this.rampageT -= dt;
      if (this.rampageT <= 0) {
        this.rampageT = 0; this.exhaustT = CFG.RAMPAGE_TIRED_TIME;
        this.toast('The rampage fades... you are exhausted');
      }
    } else this.exhaustT = tick(this.exhaustT);
    this.shieldT = tick(this.shieldT); this.shieldCd = tick(this.shieldCd);
    this.graceT = tick(this.graceT);
    this.gambleCd = tick(this.gambleCd);
    this.gambleBoostT = tick(this.gambleBoostT);
    this.gambleFrozenT = tick(this.gambleFrozenT);
    this.gambleSlowT = tick(this.gambleSlowT);
    this.brickStunT = tick(this.brickStunT);
  }
}
