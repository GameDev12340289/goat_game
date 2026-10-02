// GameScene: loading a room from LEVELS, building its tile grids and drawing its tiles and objects.
Object.assign(GameScene.prototype, {
  loadRoom(index) {
    this.roomObjs.forEach(o => o.destroy());
    this.roomObjs = [];
    this.roomIndex = index;
    this.noExtraLives = false; this.applyUpgrades();   // a Gambler's Coin penalty only lasts for the room it happened in
    this.hp = this.maxHp;                 // hit points refill at the start of every room
    this.bossHp = Save.has('odin') ? CFG.ODIN_BOSS_HITS : 1;   // Odin's Blessing: boss attacks need 3 hits to kill
    Save.unlock(index);
    if (index === GameScene.CHASE_FIRST && !this.chaseMark) this.chaseMark = { time: this.time_, deaths: this.deaths };  // boss chase trial starts here
    const room = this.room = LEVELS[index];

    this.tornadoWarned = false; this.brickStunT = 0;   // Stormlands: first brick just stuns, the rest cost a life
    this.roomT = 0; this.freeze = 0; this.frost.clear(); this.player.body.clearTint();
    const spawn = this.spawnPoint = this.parseRoom(room, index);
    this.drawRoom();
    this.drawPowder();
    this.rise = room.rise ? this.addRisingSpikes(room.rise) : null;

    this.boss = null; this.hornDrop = null; this.jeff = null;
    this.fling = null; this.windHits = 0;                            // the Cyclone: how many of its small tornadoes have caught you this room
    // room 75 stays shut until the elder goat's horns are picked up; the Cyclone's until the wind stops
    this.exitLocked = !!(room.boss && (room.boss.cornerX !== undefined || room.boss.finalStand)) || !!room.rescue;
    this.rescue = null; this.rescueDone = false;                     // the Elder Goat's last room: the Cyclone's rescue (rescue.js)
    // boss rooms: the shockwave travels along the floor the player spawns on
    this.groundY = this.floorBelow(spawn);
    if (room.boss) {
      const Kind = room.boss.cyclone ? Cyclone : Boss;
      this.boss = new Kind(this, room.boss, this.groundY);
      if (room.finale) this.addLeapPad(room.finale.leapX, this.groundY);
    }
    this.winds = room.winds ? new Gusts(this, room.winds, this.groundY) : null;   // the Wreckage: small tornadoes with no boss behind them
    this.bury = null;                                                             // the Wreckage's 3rd fling: rubble piled over the goat
    this.leaped = false; this.leapJeffSpawned = false; this.leapSafe = false;   // Jeff shows up (and the boss can't hurt you) once you land the mega-leap out of a boss chase
    if (room.merchant) this.spawnJeff(100);                                  // the Merchant's room: Jeff and his stall

    this.player.spawn(spawn.x, spawn.y);
    this.deadT = 0; this.transitioning = false;
  },

  // builds the tile grids and room objects from the level's rows; returns the player spawn point
  parseRoom(room, index) {
    this.grid = []; this.powder = [];     // solid tiles / powder snow tiles, indexed [row][col]
    this.spikes = []; this.crystals = []; this.coins = []; this.popSpikes = [];
    this.tornadoes = []; this.bricks = [];
    let spawn = { x: 16, y: 16 };
    for (let r = 0; r < CFG.ROWS; r++) {
      const line = (room.rows[r] || '').padEnd(CFG.COLS, '.');
      const row = [], pow = [];
      for (let c = 0; c < CFG.COLS; c++) {
        const ch = line[c], id = `${index}:${c},${r}`;
        const px = c * CFG.TILE, py = r * CFG.TILE;
        row.push(ch === '#');
        pow.push(ch === 'W');
        if (ch === '^') this.spikes.push({ x: px, y: py + 4, w: 8, h: 4, tx: px, ty: py });
        else if (ch === 'P') spawn = { x: px, y: py + CFG.TILE - CFG.PH };
        else if (ch === 'D') this.addCrystal(px, py);
        else if (ch === 'a' || ch === 'b') this.addPopSpike(px, py, ch === 'b' ? 0.5 : 0);
        else if (ch === 'S' && !this.collected.has(id)) this.addCoin(px, py, id);
        else if (ch === 'T') this.addTornado(px, py);
      }
      this.grid.push(row);
      this.powder.push(pow);
    }
    return spawn;
  },

  // y of the first solid tile directly under a point (the bottom of the screen if there's none)
  floorBelow({ x, y }) {
    const c = Math.floor(x / CFG.TILE);
    for (let r = Math.floor((y + CFG.PH) / CFG.TILE); r < CFG.ROWS; r++)
      if (this.isSolid(c, r)) return r * CFG.TILE;
    return CFG.H;
  },

  drawRoom() {
    const T = CFG.TILE, g = this.add.graphics().setDepth(5);
    this.roomObjs.push(g);
    for (let r = 0; r < CFG.ROWS; r++) {
      for (let c = 0; c < CFG.COLS; c++) {
        if (!this.grid[r][c]) continue;
        g.fillStyle(0x2b3a67); g.fillRect(c * T, r * T, T, T);
        if (((c * 7 + r * 13) % 5) === 0) { g.fillStyle(0x34467a); g.fillRect(c * T + 2, r * T + 2, 3, 2); }
        if (!this.isSolid(c, r - 1)) { g.fillStyle(0xdff3ff); g.fillRect(c * T, r * T, T, 2); }   // snow cap
        if (!this.isSolid(c, r + 1)) { g.fillStyle(0x1b2544); g.fillRect(c * T, r * T + T - 1, T, 1); }
      }
    }
    g.fillStyle(0xe8ecff);
    for (const s of this.spikes) {
      g.fillTriangle(s.tx, s.ty + 8, s.tx + 2, s.ty + 4, s.tx + 4, s.ty + 8);
      g.fillTriangle(s.tx + 4, s.ty + 8, s.tx + 6, s.ty + 4, s.tx + 8, s.ty + 8);
    }
  },

  // powder snow: drawn in front of the player so you look sunk into it, with puffs of snow rising off the surface
  drawPowder() {
    const T = CFG.TILE, isPow = (c, r) => this.isPowder(c, r);
    const g = this.add.graphics().setDepth(12);
    this.roomObjs.push(g);
    for (let r = 0; r < CFG.ROWS; r++) {
      for (let c = 0; c < CFG.COLS; c++) {
        if (!isPow(c, r)) continue;
        const x = c * T, y = r * T, n = (c * 5 + r * 11) % 4;
        g.fillStyle(0xdcecfa, 0.92); g.fillRect(x, y, T, T);
        g.fillStyle(0xbcd4ec, 0.9); g.fillRect(x + n * 2, y + 3 + (n % 2) * 3, 2, 2);
        g.fillStyle(0xffffff, 0.9); g.fillRect(x + 5 - n, y + 1 + ((c + r) % 3) * 2, 2, 1);
        if (!isPow(c, r - 1)) { g.fillStyle(0xffffff, 1); g.fillRect(x, y, T, 1); g.fillRect(x + n, y - 1, 3, 1); }
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
  },

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
  },

  // glowing launch pad: stepping on it triggers the finale's mega-leap
  addLeapPad(x, y) {
    const g = this.add.graphics().setDepth(6);
    this.roomObjs.push(g);
    g.fillStyle(0x8a5a10); g.fillRect(x, y - 2, 16, 2);
    g.fillStyle(0xffd23f); g.fillRect(x + 1, y - 3, 14, 1);
    g.fillStyle(0xfff4b0);
    for (const ax of [x + 3, x + 9]) g.fillTriangle(ax, y - 4, ax + 2, y - 7, ax + 4, y - 4);
    this.tweens.add({ targets: g, alpha: 0.5, yoyo: true, repeat: -1, duration: 350 });
  },

  // drawn behind the tiles, so the part still inside the floor is hidden
  addPopSpike(x, y, phase) {
    const sprite = this.add.image(x, y + 8, 'popspike').setOrigin(0).setDepth(4);
    this.roomObjs.push(sprite);
    this.popSpikes.push({ x, y, sprite, phase });
  },

  addCrystal(x, y) {
    const sprite = this.add.image(x, y, 'crystal').setOrigin(0).setDepth(8);
    this.tweens.add({ targets: sprite, y: y - 2, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.inOut' });
    this.roomObjs.push(sprite);
    this.crystals.push({ x, y, sprite, timer: 0, active: true });
  },

  addCoin(x, y, id) {
    const sprite = this.add.image(x, y, 'coin').setOrigin(0).setDepth(8);
    this.tweens.add({ targets: sprite, y: y - 2, yoyo: true, repeat: -1, duration: 500, ease: 'Sine.inOut' });
    this.tweens.add({ targets: sprite, scaleX: 0.3, x: x + 2.8, yoyo: true, repeat: -1, duration: 400, ease: 'Sine.inOut' });
    this.roomObjs.push(sprite);
    this.coins.push({ x, y, sprite, id });
  },

  // Stormlands 'T' tile: a little tornado that stands still and hurls a brick at wherever the goat is, on a timer
  addTornado(x, y) {
    const cx = x + 4, cy = y + 8;
    const sprite = this.add.image(cx, cy, 'tornado').setOrigin(0.5, 1).setDepth(6);
    this.tweens.add({ targets: sprite, x: cx - 1, yoyo: true, repeat: -1, duration: 220, ease: 'Sine.inOut' });   // a constant jitter, like it's spinning in place
    this.roomObjs.push(sprite);
    this.tornadoes.push({ x: cx, y: cy - 10, t: CFG.TORNADO_PERIOD * (0.3 + Math.random() * 0.7) });   // staggered so several don't throw in sync
  },
});
