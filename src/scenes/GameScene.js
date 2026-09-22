// Room loading, rendering, hazards, pickups, room transitions and HUD.
class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) { this.startRoom = (data && data.room) || 0; }

  create() {
    const K = Phaser.Input.Keyboard.KeyCodes;
    const add = codes => codes.map(c => this.input.keyboard.addKey(c));
    this.keys = {
      left: add([K.LEFT, K.A]), right: add([K.RIGHT, K.D]),
      up: add([K.UP, K.W]), down: add([K.DOWN, K.S]),
      jump: add([K.C, K.SPACE, K.K]), dash: add([K.X, K.SHIFT, K.J]),
      grab: add([K.Z, K.L]), rampage: add([K.Q, K.E]), deflect: add([K.F]), talk: add([K.V]), restart: add([K.R]), menu: add([K.ESC]), enter: add([K.ENTER]),
    };

    this.cameras.main.setBackgroundColor(0x0e1428).setZoom(CFG.ZOOM).centerOn(CFG.W / 2, CFG.H / 2);
    if (!this.scene.isActive('UI')) this.scene.launch('UI');
    this.game.events.emit('complete', '');
    this.roomObjs = [];
    this.deaths = 0; this.coinCount = 0; this.time_ = 0; this.hornsEarned = 0;
    this.collected = new Set();
    this.freezeT = 0; this.deadT = 0; this.transitioning = false; this.completed = false;
    this.chaseMark = null;
    this.rampageT = 0; this.rampageCd = 0; this.exhaustT = 0;   // Rampage of the Mountains: active / cooldown / tired timers
    this.shieldT = 0; this.shieldCd = 0; this.graceT = 0; this.shieldCharges = 0;      // Mountain Toughened Hide: shield / cooldown / boss-proof grace after a deflect
    this.shieldG = this.add.graphics().setDepth(25);

    this.player = new Player(this);
    this.frost = this.add.graphics().setDepth(30);
    this.applyUpgrades();
    this.makeSnow();
    this.loadRoom(this.startRoom);
  }

  // shop upgrades (bought in the menu)
  applyUpgrades() {
    this.maxHp = (Save.has('toughHide') ? 2 : 1) + (Save.has('spareHide') ? 1 : 0) + (Save.has('ironPlate') ? 1 : 0);
    if (Save.has('odin')) this.maxHp = Math.max(this.maxHp, CFG.ODIN_HITS);      // Odin's Blessing: 5 hits
    this.player.slideMax = CFG.WALL_SLIDE_MAX * (Save.has('gripChalk') ? 0.5 : 1);
    this.player.climbMult = Save.has('ironGrip') ? 1.5 : 1;
    this.player.maxStamina = CFG.STAMINA * (Save.has('sureFooting') ? 1.5 : 1);
    this.player.maxDashes = Save.has('twinDash') ? 2 : 1;
    this.player.runMax = CFG.RUN_MAX * (Save.has('swiftHooves') ? 1.1 : 1);
  }

  toMenu() {
    this.scene.stop('UI');
    this.scene.start('Menu');
  }

  // ---- room loading --------------------------------------------------------
  loadRoom(index) {
    this.roomObjs.forEach(o => o.destroy());
    this.roomObjs = [];
    this.roomIndex = index;
    this.hp = this.maxHp;                 // hit points refill at the start of every room
    this.bossHp = Save.has('odin') ? CFG.ODIN_BOSS_HITS : 1;   // Odin's Blessing: boss attacks need 3 hits to kill
    Save.unlock(index);
    if (index === 10 && !this.chaseMark) this.chaseMark = { time: this.time_, deaths: this.deaths };  // boss chase trial starts here
    const room = this.room = LEVELS[index];

    this.grid = []; this.spikes = []; this.crystals = []; this.coins = []; this.popSpikes = [];
    this.powder = [];                     // powder snow tiles, same layout as grid
    this.roomT = 0; this.freeze = 0;    this.frost.clear(); this.player.body.clearTint();
    let spawn = { x: 16, y: 16 };
    for (let r = 0; r < CFG.ROWS; r++) {
      const line = (room.rows[r] || '').padEnd(CFG.COLS, '.');
      const row = [], pow = [];
      for (let c = 0; c < CFG.COLS; c++) {
        const ch = line[c];
        const px = c * CFG.TILE, py = r * CFG.TILE;
        row.push(ch === '#');
        pow.push(ch === 'W');
        if (ch === '^') this.spikes.push({ x: px, y: py + 4, w: 8, h: 4, tx: px, ty: py });
        else if (ch === 'P') spawn = { x: px, y: py + CFG.TILE - CFG.PH };
        else if (ch === 'D') this.addCrystal(px, py);
        else if (ch === 'a' || ch === 'b') this.addPopSpike(px, py, ch === 'b' ? 0.5 : 0);
        else if (ch === 'S' && !this.collected.has(`${index}:${c},${r}`)) this.addCoin(px, py, `${index}:${c},${r}`);
      }
      this.grid.push(row);
      this.powder.push(pow);
    }
    this.spawnPoint = spawn;
    this.drawRoom();
    this.drawPowder();
    this.rise = room.rise ? this.addRisingSpikes(room.rise) : null;

    // boss rooms: the shockwave travels along the floor the player spawns on
    this.boss = null; this.bones = null; this.jeff = null;
    this.exitLocked = !!(room.boss && room.boss.desperateAfter);   // the last room stays shut until the Withered's bones are taken
    let groundY = CFG.H;
    for (let r = Math.floor((spawn.y + CFG.PH) / CFG.TILE); r < CFG.ROWS; r++)
      if (this.isSolid(Math.floor(spawn.x / CFG.TILE), r)) { groundY = r * CFG.TILE; break; }
    this.groundY = groundY;
    if (room.boss) {
      this.boss = room.boss.withered ? new Withered(this, room.boss, groundY) : new Boss(this, room.boss, groundY);
      if (room.finale) this.addLeapPad(room.finale.leapX, groundY);
    }
    this.leaped = false;
    if (room.merchant) this.spawnJeff(100);                                  // room 76: Jeff and his stall

    this.player.spawn(spawn.x, spawn.y);
    this.deadT = 0; this.transitioning = false;
  }

  drawRoom() {
    const T = CFG.TILE, g = this.add.graphics().setDepth(5);
    this.roomObjs.push(g);
    const solid = (c, r) => this.isSolid(c, r);
    for (let r = 0; r < CFG.ROWS; r++) {
      for (let c = 0; c < CFG.COLS; c++) {
        if (!this.grid[r][c]) continue;
        g.fillStyle(0x2b3a67); g.fillRect(c * T, r * T, T, T);
        if (((c * 7 + r * 13) % 5) === 0) { g.fillStyle(0x34467a); g.fillRect(c * T + 2, r * T + 2, 3, 2); }
        if (!solid(c, r - 1)) { g.fillStyle(0xdff3ff); g.fillRect(c * T, r * T, T, 2); }   // snow cap
        if (!solid(c, r + 1)) { g.fillStyle(0x1b2544); g.fillRect(c * T, r * T + T - 1, T, 1); }
      }
    }
    g.fillStyle(0xe8ecff);
    for (const s of this.spikes) {
      g.fillTriangle(s.tx, s.ty + 8, s.tx + 2, s.ty + 4, s.tx + 4, s.ty + 8);
      g.fillTriangle(s.tx + 4, s.ty + 8, s.tx + 6, s.ty + 4, s.tx + 8, s.ty + 8);
    }
  }

  // powder snow: drawn in front of the player so you look sunk into it, with puffs of snow rising off the surface
  drawPowder() {
    const T = CFG.TILE, isPow = (c, r) => !!(this.powder[r] && this.powder[r][c]);
    const g = this.add.graphics().setDepth(12);
    this.roomObjs.push(g);
    for (let r = 0; r < CFG.ROWS; r++) {
      for (let c = 0; c < CFG.COLS; c++) {
        if (!isPow(c, r)) continue;
        const x = c * T, y = r * T, open = !isPow(c, r - 1);
        g.fillStyle(0xdcecfa, 0.92); g.fillRect(x, y, T, T);
        const n = (c * 5 + r * 11) % 4;
        g.fillStyle(0xbcd4ec, 0.9); g.fillRect(x + n * 2, y + 3 + (n % 2) * 3, 2, 2);
        g.fillStyle(0xffffff, 0.9); g.fillRect(x + 5 - n, y + 1 + ((c + r) % 3) * 2, 2, 1);
        if (open) { g.fillStyle(0xffffff, 1); g.fillRect(x, y, T, 1); g.fillRect(x + n, y - 1, 3, 1); }
      }
    }
    // one emitter per horizontal run of surface tiles
    for (let r = 0; r < CFG.ROWS; r++) {
      for (let c = 0; c < CFG.COLS; c++) {
        if (!isPow(c, r) || isPow(c, r - 1)) continue;
        let w = 1;
        while (isPow(c + w, r) && !isPow(c + w, r - 1)) w++;
        const e = this.add.particles(0, 0, 'pixel', {
          emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(c * T, r * T - 1, w * T, 3) },
          lifespan: { min: 700, max: 1300 }, frequency: Math.max(45, 240 - w * 25),
          speedY: { min: -26, max: -8 }, speedX: { min: -9, max: 9 },
          alpha: { start: 0.9, end: 0 }, scale: { start: 0.9, end: 0.2 },
        }).setDepth(13);
        this.roomObjs.push(e);
        c += w - 1;
      }
    }
  }

  // does the player's body overlap any powder snow?
  inPowderSnow(p) {
    const T = CFG.TILE;
    const x0 = p.x + 1, x1 = p.x + CFG.PW - 2, y0 = p.y + 2, y1 = p.y + CFG.PH - 1;
    for (let r = Math.floor(y0 / T); r <= Math.floor(y1 / T); r++)
      for (let c = Math.floor(x0 / T); c <= Math.floor(x1 / T); c++)
        if (this.powder[r] && this.powder[r][c]) return true;
    return false;
  }

  // freeze meter: builds while wading through powder (not while dashing through it), thaws outside
  updateFreeze(dt) {
    const p = this.player;
    p.inPowder = !Save.has('odin') && p.state !== 'dash' && p.state !== 'leap' && this.inPowderSnow(p);   // Odin: immune to powder snow
    if (p.inPowder) {
      this.freeze += dt / (CFG.POWDER_FREEZE * (Save.has('frostCloak') ? 2 : 1));
      this.puffT = (this.puffT || 0) - dt;
      if (this.puffT <= 0) { this.puffT = 0.07; this.burst(p.centerX, p.centerY - 2, 0xffffff, 3, 28); }
    } else this.freeze = Math.max(0, this.freeze - dt * (Save.has('frostplate') ? 2 : 1) / CFG.POWDER_THAW);

    const f = Math.min(1, this.freeze);
    const g = this.frost;
    g.clear();
    if (f > 0.02) {
      g.fillStyle(0xaee6ff, f * 0.22); g.fillRect(0, 0, CFG.W, CFG.H);
      const t = Math.round(f * 16);
      g.fillStyle(0xd8f4ff, f * 0.55);
      g.fillRect(0, 0, CFG.W, t); g.fillRect(0, CFG.H - t, CFG.W, t);
      g.fillRect(0, 0, t, CFG.H); g.fillRect(CFG.W - t, 0, t, CFG.H);
    }
    if (this.rampageT > 0) p.body.setTint(Math.floor(this.rampageT * 10) % 2 ? 0xffd23f : 0xff7a3f);
    else if (this.exhaustT > 0) p.body.setTint(0x8f96b8);
    else if (f > 0.02) p.body.setTint(Phaser.Display.Color.GetColor(255 - f * 110, 255 - f * 40, 255)); else p.body.clearTint();

    if (this.freeze >= 1) {
      this.freeze = 0;
      this.burst(p.centerX, p.centerY, 0xbfeaff, 14, 100);
      this.game.events.emit('toast', 'Frozen solid!');
      this.hurt(true);
    }
  }

  // a full-width spike floor that starts below the screen and climbs upward
  addRisingSpikes({ speed, delay }) {
    const g = this.add.graphics().setDepth(7);
    this.roomObjs.push(g);
    g.fillStyle(0x5a1e2e); g.fillRect(0, 4, CFG.W, CFG.H + 8);
    g.fillStyle(0xe8443c); g.fillRect(0, 4, CFG.W, 1);
    g.fillStyle(0xe8ecff);
    for (let x = 0; x < CFG.W; x += 4) g.fillTriangle(x, 4, x + 2, 0, x + 4, 4);
    const y = CFG.H + 4;
    g.y = y;
    return { g, y, speed, delay };
  }

  // glowing launch pad: stepping on it triggers the finale's mega-leap
  addLeapPad(x, y) {
    const g = this.add.graphics().setDepth(6);
    this.roomObjs.push(g);
    g.fillStyle(0x8a5a10); g.fillRect(x, y - 2, 16, 2);
    g.fillStyle(0xffd23f); g.fillRect(x + 1, y - 3, 14, 1);
    g.fillStyle(0xfff4b0);
    for (const ax of [x + 3, x + 9]) g.fillTriangle(ax, y - 4, ax + 2, y - 7, ax + 4, y - 4);
    this.tweens.add({ targets: g, alpha: 0.5, yoyo: true, repeat: -1, duration: 350 });
  }

  // drawn behind the tiles, so the part still inside the floor is hidden
  addPopSpike(x, y, phase) {
    const sprite = this.add.image(x, y + 8, 'popspike').setOrigin(0).setDepth(4);
    this.roomObjs.push(sprite);
    this.popSpikes.push({ x, y, sprite, phase });
  }

  // how many pixels a popping spike sticks out, t = seconds into its cycle, max = full pillar height
  popHeight(t, max) {
    const { POP_WARN: w, POP_RISE: r, POP_OUT: o, POP_RETRACT: d } = CFG;
    if (t < w) return 2 + (Math.floor(t * 30) % 2);              // peek + jitter as a warning
    if (t < w + r) return 2 + (max - 2) * (t - w) / r;
    if (t < w + r + o) return max;
    if (t < w + r + o + d) return max * (1 - (t - w - r - o) / d);
    return 0;
  }

  addCrystal(x, y) {
    const sprite = this.add.image(x, y, 'crystal').setOrigin(0).setDepth(8);
    this.tweens.add({ targets: sprite, y: y - 2, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.inOut' });
    this.roomObjs.push(sprite);
    this.crystals.push({ x, y, sprite, timer: 0, active: true });
  }

  addCoin(x, y, id) {
    const sprite = this.add.image(x, y, 'coin').setOrigin(0).setDepth(8);
    this.tweens.add({ targets: sprite, y: y - 2, yoyo: true, repeat: -1, duration: 500, ease: 'Sine.inOut' });
    this.tweens.add({ targets: sprite, scaleX: 0.3, x: x + 2.8, yoyo: true, repeat: -1, duration: 400, ease: 'Sine.inOut' });
    this.roomObjs.push(sprite);
    this.coins.push({ x, y, sprite, id });
  }

  // ---- collision helpers (used by Player) ----------------------------------
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

  // ---- game loop -----------------------------------------------------------
  update(time, delta) {
    const dt = Math.min(delta, 33) / 1000;
    const pressed = list => list.some(k => Phaser.Input.Keyboard.JustDown(k));
    const down = list => list.some(k => k.isDown);
    const restart = pressed(this.keys.restart);
    const enter = pressed(this.keys.enter);

    if (pressed(this.keys.menu)) return this.toMenu();
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

    const k = this.keys;
    const inp = {
      x: (down(k.right) ? 1 : 0) - (down(k.left) ? 1 : 0),
      y: (down(k.down) ? 1 : 0) - (down(k.up) ? 1 : 0),
      jumpPressed: pressed(k.jump), jumpHeld: down(k.jump),
      dashPressed: pressed(k.dash), grab: down(k.grab),
    };

    this.time_ += dt;
    this.rampageCd = Math.max(0, this.rampageCd - dt);
    if (this.rampageT > 0) {
      this.rampageT -= dt;
      if (this.rampageT <= 0) {
        this.rampageT = 0; this.exhaustT = CFG.RAMPAGE_TIRED_TIME;
        this.game.events.emit('toast', 'The rampage fades... you are exhausted');
      }
    } else if (this.exhaustT > 0) this.exhaustT = Math.max(0, this.exhaustT - dt);
    if (Save.has('rampage') && this.rampageCd <= 0 && this.rampageT <= 0 && this.exhaustT <= 0 && pressed(k.rampage)) {
      this.rampageT = CFG.RAMPAGE_TIME; this.rampageCd = CFG.RAMPAGE_COOLDOWN * (Save.has('rampageTonic') ? 2 / 3 : 1);
      this.burst(this.player.centerX, this.player.centerY, 0xffd23f, 16, 110);
      this.cameras.main.shake(200, 0.006);
      this.game.events.emit('toast', 'RAMPAGE!');
    }
    this.shieldT = Math.max(0, this.shieldT - dt); this.shieldCd = Math.max(0, this.shieldCd - dt);
    this.graceT = Math.max(0, this.graceT - dt);
    if (Save.has('mountainHide') && this.shieldT <= 0 && this.shieldCd <= 0 && pressed(k.deflect)) {
      this.shieldT = Infinity; this.shieldCharges = CFG.SHIELD_CHARGES;   // stays up until its charges are used up
      this.game.events.emit('toast', 'Shield up!');
    }
    this.player.speedMult = this.rampageT > 0 ? CFG.RAMPAGE_SPEED : this.exhaustT > 0 ? CFG.RAMPAGE_TIRED_SPEED : 1;
    this.player.hornScale = this.rampageT > 0 ? CFG.RAMPAGE_HORNS : 1;
    this.player.inPowder = !Save.has('odin') && this.player.state !== 'dash' && this.player.state !== 'leap' && this.inPowderSnow(this.player);
    this.player.update(dt, inp);
    this.checkWorld(dt);
    this.drawShield();
    this.updateHud();
  }

  checkWorld(dt) {
    const p = this.player;
    if (p.state === 'dead') return;
    const hit = (a, b, s = 8) => a.x < b.x + s && a.x + CFG.PW > b.x && a.y < b.y + s && a.y + CFG.PH > b.y;

    if (p.y > CFG.H + 8) {
      if (this.rampageT > 0 || this.tryDeflect()) { p.respawnAtSafe(); return; }   // rampaging / shielded goats bounce out of pits
      return this.hurt();
    }
    this.updateFreeze(dt);
    if (p.state === 'dead') return;
    const fin = this.room.finale;
    if (fin && !this.leaped && p.state === 'normal' && p.x >= fin.leapX) {
      this.leaped = true;
      p.startLeap(fin.vx, fin.vy);
      this.cameras.main.shake(250, 0.008);
      this.burst(p.centerX, p.y + CFG.PH, 0xffd23f, 14, 90);
    }
    // boss attacks (body, shockwave, summoned spikes) are exceptions to Tough Hide: always instant death
    // (a raised shield reflects the attack instead and stuns the boss)
    if (this.boss && this.boss.update(dt, p) && this.rampageT <= 0 && this.graceT <= 0) {
      if (this.boss.noDeflect) return this.killPlayer();
      if (this.tryDeflect(CFG.SHIELD_BOSS_COST)) this.boss.deflect(p);
      else if (!this.odinBossHit()) return this.killPlayer();
    }
    if (this.jeff) {
      const near = Math.abs(p.centerX - this.jeff.x) < 40;
      if (near && !this.jeff.near) this.game.events.emit('toast', 'Jeff: coins only. Press V to trade');
      this.jeff.near = near;
      if (near && Phaser.Input.Keyboard.JustDown(this.keys.talk[0])) this.openJeff();
    }
    if (this.bones && this.bones.ready && !this.bones.taken && hit(p, { x: this.bones.x - 10, y: this.bones.y - 8 }, 20)) this.takeBones();
    this.roomT += dt;
    for (const s of this.popSpikes) {
      // pillar reaches from the floor all the way to the top of the room, so it can't be jumped over
      const t = ((this.roomT / CFG.POP_PERIOD + s.phase) % 1) * CFG.POP_PERIOD;
      const h = Math.round(this.popHeight(t, s.y + 8));
      s.sprite.y = s.y + 8 - h;
      if (h >= 5 && p.x < s.x + 8 && p.x + CFG.PW > s.x && p.y < s.y + 8 && p.y + CFG.PH > s.y + 8 - h)
        return this.hurt();
    }
    if (this.rise) {
      const r = this.rise;
      if (r.delay > 0) r.delay -= dt; else r.y -= r.speed * dt;
      r.g.y = Math.round(r.y);
      if (p.y + CFG.PH > r.y + 2) return this.hurt();
    }
    for (const s of this.spikes)
      if (p.x < s.x + s.w && p.x + CFG.PW > s.x && p.y < s.y + s.h && p.y + CFG.PH > s.y) return this.hurt();

    for (const c of this.crystals) {
      if (!c.active) {
        c.timer -= dt;
        if (c.timer <= 0) { c.active = true; c.sprite.setVisible(true); }
      } else if (hit(p, c) && p.refillDash()) {
        c.active = false; c.timer = CFG.CRYSTAL_RESPAWN; c.sprite.setVisible(false);
        this.burst(c.x + 4, c.y + 4, 0x7dffb2, 8);
        this.freezeT = 0.05;
      }
    }

    for (const b of this.coins) {
      if (b.sprite.active && hit(p, b)) {
        this.collected.add(b.id); this.coinCount++; Save.addCoins(this.dropMult());
        this.burst(b.x + 4, b.y + 4, 0xffd23f, 10);
        b.sprite.destroy();
      }
    }

    if (this.room.exit === 'right' && p.x + CFG.PW / 2 > CFG.W) this.nextRoom();
    else if (this.room.exit === 'top' && p.y + CFG.PH / 2 < 0) {
      p.vy = Math.min(p.vy, -80); // small boost out of the top, like Celeste
      this.nextRoom();
    }
  }

  nextRoom() {
    if (this.transitioning) return;
    this.transitioning = true;
    // Odin's Blessing trial: arrive in room 10 within 1:30 without dying, starting the run at room 1
    if (this.roomIndex + 2 === CFG.ODIN_TRIAL_ROOM && this.startRoom === 0 && this.time_ <= CFG.ODIN_TRIAL_TIME && this.deaths === 0 && !Save.data.odinTrialDone) {
      Save.completeOdinTrial();
      this.game.events.emit('toast', "Trial passed! Jeff will sell you Odin's Blessing");
    }
    // Mountain Toughened Hide trial: beat the boss chase (rooms 11-19, i.e. leave room 19) in 1:30 with no deaths
    if (this.roomIndex === 18 && this.trialOk()) {
      Save.completeTrial();
      this.game.events.emit('toast', 'Trial passed! You can buy Mountain Toughened Hide');
    }
    const horns = this.room.horns !== undefined ? this.room.horns
      : this.room.boss ? (this.room.finale ? CFG.HORNS_BOSS_DEFEATED : CFG.HORNS_PER_BOSS_ROOM) : 0;
    if (horns > 0) this.awardHorns(horns);
    const cam = this.cameras.main;
    cam.fadeOut(180, 14, 20, 40);
    cam.once('camerafadeoutcomplete', () => {
      if (this.roomIndex + 1 >= LEVELS.length) return this.finish();
      this.loadRoom(this.roomIndex + 1);
      cam.fadeIn(180, 14, 20, 40);
      this.showTitle(this.room.name);
    });
  }

  finish() {
    this.completed = true;
    this.player.hide();
    this.cameras.main.fadeIn(300, 14, 20, 40);
    const m = Math.floor(this.time_ / 60), s = (this.time_ % 60).toFixed(2).padStart(5, '0');
    this.game.events.emit('complete',
      `LEVEL COMPLETE\n${Save.data.witheredBones ? 'The Withered fell. You hold its bones.\n' : ''}You outran the elder goat ..... for now\n\nTime ${m}:${s}\nDeaths ${this.deaths}\n\nENTER  menu / shop      R  play again`);
  }

  // boss rooms pay fractions of a horn (Save keeps the remainder), so most escapes just add to a shard
  awardHorns(n) {
    const before = Save.data.horns;
    Save.addHorns(n * this.dropMult());
    const got = Save.data.horns - before;
    this.hornsEarned += got;
    this.game.events.emit('toast', got > 0 ? `+${got} goat horn${got > 1 ? 's' : ''}!` : 'a goat horn shard...');
  }

  // regular hazards (spikes, pits, rising floor): Tough Hide absorbs one hit, then we're put back on safe ground
  // cold = frozen by powder snow, which the Mountain Toughened Hide shield can't deflect
  hurt(cold = false) {
    const p = this.player;
    if (p.state === 'dead' || p.invuln > 0 || this.rampageT > 0) return;
    if (!cold && this.tryDeflect()) return;
    if (--this.hp <= 0) return this.killPlayer();
    this.burst(p.centerX, p.centerY, 0xe8443c, 12, 110);
    this.cameras.main.shake(150, 0.008);
    this.freezeT = 0.06;
    p.respawnAtSafe();
    p.invuln = CFG.HURT_INVULN * (Save.has('hornedHelm') ? 2 : 1);
    this.game.events.emit('toast', 'Tough hide! 1 hit left');
  }

  // the Withered dies: its bones arc through the air and land just in front of the player
  dropBones(x, y) {
    const p = this.player, ground = this.boss.groundY;
    const landX = Phaser.Math.Clamp(p.centerX - 6, Math.min(x + 24, CFG.W - 16), CFG.W - 16);
    const img = this.add.image(x, y, 'bones').setOrigin(0.5, 1).setDepth(11);
    this.roomObjs.push(img);
    this.bones = { img, x: landX, y: ground, ready: false, taken: false };
    this.tweens.add({ targets: img, x: landX, duration: 800, ease: 'Sine.out' });
    this.tweens.chain({ targets: img, tweens: [
      { y: y - 40, duration: 300, ease: 'Sine.out' },
      { y: ground, duration: 500, ease: 'Bounce.out' },
    ] });
    this.time.delayedCall(850, () => { if (this.bones) this.bones.ready = true; });
    this.tweens.add({ targets: img, alpha: 0.55, yoyo: true, repeat: -1, duration: 500, delay: 900 });   // a faint glow so it's easy to spot
  }

  takeBones() {
    const b = this.bones;
    b.taken = true; b.img.destroy();
    const n = Phaser.Math.Between(CFG.BONES_MIN, CFG.BONES_MAX) * this.dropMult();       // the Withered drops 1-5 bones
    Save.data.witheredBones += n; Save.save();
    this.exitLocked = false;
    this.burst(b.x, b.y - 4, 0xe9e6d2, 16, 90);
    this.game.events.emit('title', `You got ${n} Withered bone${n > 1 ? 's' : ''}!`);
  }

  // Jeff the merchant only takes coins. He runs the stall in room 76 (V talks to him).
  spawnJeff(x, auto = false) {
    const ground = this.groundY;
    this.drawStall(x, ground);
    const sprite = this.add.image(x, ground - 3, 'jeff').setOrigin(0.5, 1).setDepth(9);
    this.roomObjs.push(sprite);
    this.tweens.add({ targets: sprite, y: ground - 5, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.inOut' });   // he floats
    this.burst(x, ground - 10, 0x7dffb2, 14, 70);
    this.jeff = { x, sprite, near: false };
    if (auto) this.time.delayedCall(1400, () => { if (this.jeff && !this.transitioning) this.openJeff(); });
    this.time.delayedCall(CFG.JEFF_DESPAWN, () => { if (this.jeff && !this.scene.isPaused()) this.jeffLeaves(); });   // he doesn't wait around forever
  }

  // Jeff's little wooden stall: a counter, a striped awning and a hanging lantern
  drawStall(x, ground) {
    const g = this.add.graphics().setDepth(3);
    this.roomObjs.push(g);
    g.fillStyle(0x5a3a20); g.fillRect(x - 30, ground - 12, 60, 12);            // counter
    g.fillStyle(0x7a5230); g.fillRect(x - 30, ground - 12, 60, 2);
    g.fillStyle(0x3a2412); g.fillRect(x - 28, ground - 40, 2, 28); g.fillRect(x + 26, ground - 40, 2, 28);   // posts
    for (let i = 0; i < 6; i++) { g.fillStyle(i % 2 ? 0xf1f1f1 : 0x3f8f5a); g.fillRect(x - 32 + i * 11, ground - 46, 11, 7); }   // awning
    g.fillStyle(0xffd23f, 0.25); g.fillCircle(x + 20, ground - 32, 9);          // lantern glow
    g.fillStyle(0xffd23f); g.fillRect(x + 19, ground - 35, 3, 4);
    g.fillStyle(0xffd23f); g.fillRect(x - 22, ground - 15, 3, 3); g.fillRect(x - 17, ground - 14, 3, 2);   // coins on the counter
  }

  // the chase starts: Jeff wants no part of it
  jeffLeaves() {
    const j = this.jeff;
    if (!j) return;
    this.jeff = null;
    this.burst(j.x, this.groundY - 10, 0x7dffb2, 10, 60);
    this.tweens.add({ targets: j.sprite, alpha: 0, duration: 300, onComplete: () => j.sprite.destroy() });
  }

  openJeff() {
    if (this.scene.isPaused()) return;
    this.player.invuln = Infinity;                 // safe from harm while browsing Jeff's wares
    this.scene.pause();
    this.scene.launch('Jeff');
  }

  // back from Jeff's stall: a short grace period instead of leaving invuln at Infinity forever
  closeJeff() {
    this.player.invuln = CFG.HURT_INVULN;
  }

  // is the Mountain Toughened Hide trial still on? (started when room 11 is first entered: under 1:30, no deaths since)
  trialOk() {
    const m = this.chaseMark;
    return !!m && !Save.data.chaseTrialDone &&
      this.time_ - m.time <= CFG.TRIAL_TIME && this.deaths === m.deaths;
  }

  // Mountain Toughened Hide: spends shield charges to shrug off a hit (1 for hazards, SHIELD_BOSS_COST for boss attacks); true if it did
  tryDeflect(cost = 1) {
    if (this.shieldT <= 0) return false;
    const p = this.player;
    this.shieldCharges = Math.max(0, this.shieldCharges - cost);
    if (this.shieldCharges <= 0) { this.shieldT = 0; this.shieldCd = CFG.SHIELD_COOLDOWN; }   // used up: the cooldown starts
    this.graceT = CFG.SHIELD_GRACE; p.invuln = Math.max(p.invuln, CFG.SHIELD_GRACE);
    this.burst(p.centerX, p.centerY, 0x9fe8ff, 16, 130);
    this.cameras.main.shake(120, 0.006);
    this.freezeT = 0.06;
    this.game.events.emit('toast', this.boss ? 'REFLECTED!' : 'Deflected!');
    return true;
  }

  // Odin's Blessing: boss attacks take 3 hits to kill (per room) instead of one. returns true if this hit was survived
  odinBossHit() {
    if (!Save.has('odin') || this.bossHp <= 1) return false;
    const p = this.player;
    this.bossHp--;
    p.invuln = Math.max(p.invuln, CFG.SHIELD_GRACE); this.graceT = CFG.SHIELD_GRACE;
    this.burst(p.centerX, p.centerY, 0xffd23f, 16, 120);
    this.game.events.emit('toast', `Odin's blessing! ${this.bossHp} boss hit${this.bossHp > 1 ? 's' : ''} left`);
    return true;
  }

  // Odin's Blessing: every drop (coins, horns, Withered bones) is x5
  dropMult() { return Save.has('odin') ? CFG.ODIN_DROPS : 1; }

  drawShield() {
    const g = this.shieldG, p = this.player;
    g.clear();
    if (this.shieldT <= 0 || p.state === 'dead') return;
    const a = 0.75 + 0.15 * Math.sin(this.time_ * 6);                                  // gentle pulse while it waits for a hit
    g.fillStyle(0x9fe8ff, 0.18 * a); g.fillCircle(p.centerX, p.centerY, 10);
    g.lineStyle(1, 0xd8f8ff, a); g.strokeCircle(p.centerX, p.centerY, 10);
  }

  killPlayer(force = false) {
    const p = this.player;
    if (p.state === 'dead' || ((this.rampageT > 0 || this.graceT > 0) && !force)) return;
    p.state = 'dead'; p.hide();
    this.deaths++;
    this.burst(p.centerX, p.centerY, 0xe8443c, 20, 140);
    this.cameras.main.shake(200, 0.01);
    this.freezeT = 0.05; this.deadT = 0.5;
  }

  onDash(p) {
    this.freezeT = CFG.DASH_FREEZE;
    this.cameras.main.shake(90, 0.002);
  }

  // ---- effects -------------------------------------------------------------
  spawnGhost(p) {
    const gh = this.add.image(p.x, p.y, 'player').setOrigin(0).setFlipX(p.facing < 0)
      .setTint(p.dashes > 0 ? 0xe8443c : 0x4fc3f7).setAlpha(0.6).setDepth(9);
    this.tweens.add({ targets: gh, alpha: 0, duration: 250, onComplete: () => gh.destroy() });
  }

  burst(x, y, tint, count, speed = 80) {
    const e = this.add.particles(x, y, 'pixel', {
      speed: { min: speed * 0.4, max: speed }, lifespan: 450, scale: { start: 1, end: 0 },
      tint, quantity: 0, emitting: false,
    }).setDepth(20);
    e.explode(count);
    this.time.delayedCall(600, () => e.destroy());
  }

  makeSnow() {
    this.add.particles(0, 0, 'pixel', {
      x: { min: 0, max: CFG.W + 40 }, y: -4, lifespan: 9000, frequency: 140,
      speedY: { min: 14, max: 28 }, speedX: { min: -14, max: -4 },
      alpha: { min: 0.2, max: 0.6 }, scale: 0.5,
    }).setDepth(2);
  }

  showTitle(text) {
    this.game.events.emit('title', text);
  }

  updateHud() {
    const t = this.time_, m = Math.floor(t / 60), s = Math.floor(t % 60).toString().padStart(2, '0');
    const hp = this.maxHp > 1 ? `  hp ${this.hp}/${this.maxHp}` : '';
    const ramp = !Save.has('rampage') ? '' : this.rampageT > 0 ? `  RAMPAGE ${this.rampageT.toFixed(1)}s`
      : this.exhaustT > 0 ? `  exhausted ${this.exhaustT.toFixed(1)}s`
      : this.rampageCd > 0 ? `  rampage in ${Math.ceil(this.rampageCd)}s` : '  rampage: Q';
    const shield = !Save.has('mountainHide') ? '' : this.shieldT > 0 ? `  SHIELD x${this.shieldCharges}`
      : this.shieldCd > 0 ? `  shield in ${Math.ceil(this.shieldCd)}s` : '  shield: F';
    // hide trial countdown while inside the boss chase (rooms 11-19)
    let trial = '';
    if (!Save.data.chaseTrialDone && this.roomIndex >= 10 && this.roomIndex <= 18 && this.chaseMark) {
      const left = CFG.TRIAL_TIME - (this.time_ - this.chaseMark.time);
      trial = this.trialOk() ? `  trial ${Math.floor(left / 60)}:${Math.floor(left % 60).toString().padStart(2, '0')}` : '  trial failed';
    }
    if (!Save.data.odinTrialDone && this.startRoom === 0 && this.roomIndex < CFG.ODIN_TRIAL_ROOM - 1) {   // the room-10 trial countdown
      const left2 = CFG.ODIN_TRIAL_TIME - t;
      trial += this.deaths === 0 && left2 > 0 ? `  odin trial ${Math.floor(left2 / 60)}:${Math.floor(left2 % 60).toString().padStart(2, '0')}` : '  odin trial failed';
    }
    this.game.events.emit('hud', `${m}:${s}  deaths ${this.deaths}${hp}${ramp}${shield}${trial}`);
  }
}


