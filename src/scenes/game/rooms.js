// GameScene: loading a room from LEVELS, building its tile grids and drawing its tiles and objects.
Object.assign(GameScene.prototype, {
  // part: rooms with `parts: [{...}, {...}]` (room 171) are several screens in a row under one room number; each part's
  // settings are laid over the room's own, and leaving a part but the last loads the next one (see nextRoom)
  loadRoom(index, part = 0) {
    this.roomObjs.forEach(o => o.destroy());
    this.roomObjs = [];
    this.roomIndex = index; this.part = part;
    this.noExtraLives = false; this.applyUpgrades();   // a Gambler's Coin penalty only lasts for the room it happened in
    this.hp = this.maxHp;                 // hit points refill at the start of every room
    this.bossHp = Save.has('odin') ? CFG.ODIN_BOSS_HITS : 1;   // Odin's Blessing: boss attacks need 3 hits to kill
    Save.unlock(index);
    if (index === GameScene.CHASE_FIRST && !this.chaseMark) this.chaseMark = { time: this.time_, deaths: this.deaths };  // boss chase trial starts here
    const base = LEVELS[index];
    const room = this.room = base.parts ? { ...base, ...base.parts[part], parts: base.parts } : base;

    this.tornadoWarned = false; this.brickStunT = 0;   // Stormlands: first brick just stuns, the rest cost a life
    this.roomT = 0; this.freeze = 0; this.frost.clear(); this.player.body.clearTint();
    const spawn = this.spawnPoint = this.parseRoom(room, index);
    this.cameras.main.setZoom(CFG.ZOOM * (room.zoom || 1)).centerOn(CFG.W / 2, CFG.H / 2);   // zoomed-out rooms show a margin around the grid
    const cam = this.cameras.main;
    if (cam.postFX) cam.postFX.clear();                                                      // the tear's colour drain / warp only lasts for its room
    if (this.tearTween) { this.tearTween.stop(); this.tearTween = null; }
    if (this.tearTimer) { this.tearTimer.remove(); this.tearTimer = null; }
    if (room.zoom) this.drawMargins(spawn, room.debris ? 0x3a3f52 : room.tear ? 0xdadada : 0x16264d);
    if (room.debris) this.drawDebris();
    if (room.tear) this.drawTear();
    if (room.eye) this.drawEye();
    if (room.beyond) this.drawBeyond();
    if (room.ruins) this.drawRuins(spawn);
    this.drawRoom();
    this.drawPowder();
    this.rise = room.rise ? this.addRisingSpikes(room.rise) : null;

    this.boss = null; this.hornDrop = null; this.jeff = null;
    this.fling = null; this.windHits = 0;                            // the Cyclone: how many of its small tornadoes have caught you this room
    // room 75 stays shut until the elder goat's horns are picked up; the Cyclone's until the wind stops
    this.exitLocked = !!(room.boss && (room.boss.cornerX !== undefined || room.boss.finalStand || room.boss.ambush)) || !!room.rescue;   // room 170's: until you step through the portal
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
    if (room.merchant) this.spawnJeff(room.jeffX || 100, { stay: !!room.jeffStays });   // the Merchant's room: Jeff and his stall
    this.lightning = null;
    if (room.lightning) this.setupLightning(room.lightning);                     // the True Eye: a strike on your spot every 10s
    if (room.hint) this.time.delayedCall(700, () => this.toast(room.hint));

    this.swirl = null;
    if (room.swirl || room.debrisThrow) this.setupSwirl(room);                  // 171: swarms of debris / debris thrown ever faster
    this.player.spawn(spawn.x, room.fallIn ? 0 : spawn.y);                      // (the ceiling is solid in rooms that don't exit through the top)
    if (room.fallIn) { this.player.safe = { x: spawn.x, y: spawn.y }; this.player.vy = 60; }   // 172: you drop in from the top of the screen
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

  // zoomed-out rooms (room.zoom) show more than the 40x23 grid: a rock wall continues the left edge, the floor runs on past
  // the right (where the exit is) and underneath, and a backdrop fills the sky so the arena looks bigger than it is
  drawMargins(spawn, sky = 0x16264d) {
    const T = CFG.TILE, fy = this.floorBelow(spawn), g = this.add.graphics().setDepth(0);
    this.roomObjs.push(g);
    g.fillStyle(sky); g.fillRect(-180, -110, CFG.W + 360, CFG.H + 220);
    const rock = this.add.graphics().setDepth(5);
    this.roomObjs.push(rock);
    rock.fillStyle(0x2b3a67); rock.fillRect(-180, fy, CFG.W + 360, CFG.H + 110 - fy);     // ground, also below the grid
    rock.fillRect(-180, -110, 180, CFG.H + 220);                                          // the wall on the left
    rock.fillStyle(0xdff3ff); rock.fillRect(CFG.W, fy, 180, 2);                          // snow cap on the right-hand floor
    rock.fillStyle(0x34467a);
    for (let x = -176; x < CFG.W + 180; x += 24) rock.fillRect(x + (x & 7), fy + 8 + ((x >> 3) & 3) * 6, 5, 2);
    for (let y = -106; y < CFG.H + 106; y += 20) rock.fillRect(-170 + ((y >> 2) & 15) * 4, y, 6, 2);
  },

  // room 172 (room.beyond): a clear dawn after the storm - sky bands, a low sun and a few soft clouds
  drawBeyond() {
    const g = this.add.graphics().setDepth(1);
    this.roomObjs.push(g);
    const bands = [0x23447a, 0x35609a, 0x5a86b8, 0x8fb0cc, 0xcfc4b4, 0xf2c995];
    const top = -60, h = (CFG.H + 70) / bands.length;
    bands.forEach((c, i) => { g.fillStyle(c); g.fillRect(-100, top + i * h, CFG.W + 200, h + 1); });
    g.fillStyle(0xfff0c8, 0.25); g.fillCircle(240, 136, 34);
    g.fillStyle(0xfff0c8, 0.9); g.fillCircle(240, 136, 18);
    for (let i = 0; i < 9; i++) {
      const x = -40 + i * 46, y = 14 + (i * 37) % 70, w = Phaser.Math.Between(36, 64);
      const cloud = this.add.ellipse(x, y, w, w * 0.32, 0xffffff, 0.55).setDepth(2);
      this.tweens.add({ targets: cloud, x: x + 14, yoyo: true, repeat: -1, duration: 5000 + i * 400, ease: 'Sine.inOut' });
      this.roomObjs.push(cloud);
    }
  },

  // harmless ruins (room.ruins): purely scenery - pillars, wall stubs, arches and rubble standing on the floor (some far
  // behind, paler), plus broken chunks floating in the sky. Nothing here is solid or can hurt you.
  drawRuins(spawn) {
    const fy = this.floorBelow(spawn), stone = [0x7b8299, 0x6a7088, 0x8a90a8], dark = 0x4a5068;
    let seed = 1729;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const between = (a, b) => Math.floor(a + rnd() * (b - a + 1));
    const far = this.add.graphics().setDepth(2), near = this.add.graphics().setDepth(4);
    this.roomObjs.push(far, near);

    const pillar = (g, x, h, w, c) => {
      g.fillStyle(c); g.fillRect(x - 1, fy - 3, w + 2, 3); g.fillRect(x, fy - h, w, h - 3);
      g.fillStyle(dark, 0.5); g.fillRect(x + 1, fy - h + 2, 1, h - 6); g.fillRect(x + w - 2, fy - h + 4, 1, h - 8);
      g.fillStyle(c); g.fillTriangle(x, fy - h, x + w, fy - h, x + (rnd() < 0.5 ? 1 : w - 1), fy - h - between(2, 5));   // snapped top
    };
    const wall = (g, x, w, h, c) => {
      g.fillStyle(c);
      for (let i = 0; i < w; i += 4) g.fillRect(x + i, fy - Math.max(5, h - between(0, 9)), 4, 99);   // jagged crown, hidden below the floor
      g.fillStyle(0x1b2544, 0.9); g.fillRect(x + (w >> 1) - 2, fy - h + 8, 5, 7);                        // window
      g.fillStyle(dark, 0.45); g.fillRect(x, fy - 4, w, 1); g.fillRect(x + 3, fy - 10, w - 6, 1);
    };
    const arch = (g, x, c) => {
      pillar(g, x, 30, 5, c); pillar(g, x + 17, 22, 5, c);
      g.fillStyle(c); g.fillRect(x - 1, fy - 34, 12, 4); g.fillTriangle(x + 10, fy - 34, x + 14, fy - 34, x + 10, fy - 30);
    };
    const rubble = (g, x, c) => {
      for (let i = 0; i < 6; i++) { g.fillStyle(i % 2 ? c : stone[1]); g.fillRect(x + between(0, 14), fy - between(1, 4), between(2, 5), between(1, 3)); }
      g.fillStyle(c); g.fillRect(x + 2, fy - 3, 12, 3);
    };
    const fallen = (g, x, c) => { g.fillStyle(c); g.fillRect(x, fy - 5, 22, 5); g.fillStyle(dark, 0.5); g.fillRect(x + 2, fy - 4, 18, 1); g.fillRect(x + 22, fy - 4, 2, 3); };

    // far row: paler and taller, up against the sky
    for (let x = -80; x < CFG.W + 80; x += between(34, 52)) {
      const k = between(0, 2);
      if (k === 0) pillar(far, x, between(30, 52), 7, 0x4d5d86);
      else if (k === 1) wall(far, x, between(22, 36), between(24, 40), 0x4d5d86);
      else arch(far, x, 0x4d5d86);
    }
    // near row: scattered along the whole floor, leaving a gap around Jeff's stall
    const jx = this.room.jeffX || 100;
    for (let x = -70; x < CFG.W + 70; x += between(20, 36)) {
      if (Math.abs(x - jx) < 44 || (x > 0 && x < 40)) continue;
      const k = between(0, 4);
      if (k === 0) pillar(near, x, between(14, 34), 6, stone[between(0, 2)]);
      else if (k === 1) wall(near, x, between(18, 32), between(12, 22), stone[between(0, 2)]);
      else if (k === 2) arch(near, x, stone[between(0, 2)]);
      else if (k === 3) rubble(near, x, stone[between(0, 2)]);
      else fallen(near, x, stone[between(0, 2)]);
    }
    // chunks of stone drifting high in the sky
    for (let i = 0; i < 9; i++) {
      const x = -50 + i * 46 + between(-8, 8), y = between(8, 70), w = between(8, 18), h = between(4, 8);
      const chunk = this.add.graphics({ x, y }).setDepth(3);
      chunk.fillStyle(stone[i % 3]); chunk.fillRect(0, 0, w, h); chunk.fillTriangle(0, h, w, h, w >> 1, h + between(3, 6));
      chunk.fillStyle(dark, 0.4); chunk.fillRect(1, 1, w - 2, 1);
      this.tweens.add({ targets: chunk, y: y + between(3, 6), yoyo: true, repeat: -1, duration: 2200 + i * 260, ease: 'Sine.inOut' });
      this.roomObjs.push(chunk);
    }
  },

  // the Debris Fields (room.debris): a grey, hazy sky, wreckage blowing across the screen and little heaps of it on the floor
  drawDebris() {
    const g = this.add.graphics().setDepth(1);
    this.roomObjs.push(g);
    for (let i = 0; i < 7; i++) {                                    // low dusty haze
      g.fillStyle(0x6a6f82, 0.3); g.fillEllipse(-30 + i * 55, 40 + (i * 29) % 60, 120, 26);
    }
    const bits = this.add.particles(0, 0, 'pixel', {
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-90, 0, 40, CFG.H) },
      lifespan: { min: 3500, max: 5000 }, frequency: 120, speedX: { min: 50, max: 95 }, speedY: { min: -12, max: 14 },
      rotate: { start: 0, end: 360 }, tint: [0x6b5a48, 0x9a4a34, 0x4a4f5c, 0x8a7a66], scale: { min: 0.7, max: 1.8 }, alpha: { start: 1, end: 0.4 },
    }).setDepth(11);
    this.roomObjs.push(bits);
    const fy = this.floorBelow(this.spawnPoint), heaps = this.add.graphics().setDepth(4);   // heaps of planks and slate, behind the tiles' cap
    this.roomObjs.push(heaps);
    let seed = 31 + this.roomIndex * 17;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 9; i++) {
      const x = -60 + rnd() * (CFG.W + 120), w = 8 + rnd() * 14;
      heaps.fillStyle(i % 2 ? 0x5a4a3a : 0x4a4f5c); heaps.fillRect(x, fy - 3, w, 3);
      heaps.fillStyle(0x7a6a58); heaps.fillRect(x + 2, fy - 5, w * 0.5, 2);
      if (rnd() < 0.5) { heaps.fillStyle(0x5a4a3a); heaps.fillTriangle(x + w * 0.5, fy - 4, x + w + 3, fy - 8 - rnd() * 6, x + w + 5, fy - 3); }   // a leaning plank
    }
  },

  // the dimensional tear (room.tear): everything drained of colour and a blank pale void in the middle - the room itself is
  // left clean. The warping is all around it: out in the margins and the strip above, heavily stretched, tilted and flickering
  // copies of things from the storm, with glitch slices tearing through the margins only.
  drawTear() {
    const cam = this.cameras.main, W = CFG.W, H = CFG.H;
    if (cam.postFX) cam.postFX.addColorMatrix().grayscale(1);
    const spots = [];                                                // the margins (dense) and a thin strip above the room
    for (let i = 0; i < 24; i++) spots.push([-78 + (i % 4) * 18, 10 + (i >> 2) * 30], [W + 6 + (i % 4) * 18, 10 + (i >> 2) * 30]);
    for (let i = 0; i < 8; i++) spots.push([i * 46 - 10, -6]);
    spots.forEach(([x, y], i) => {
      const key = ['tornado', 'jeff', 'player', 'tornado', 'hair'][i % 5];
      const o = this.add.image(x, y + (i % 3) * 14, key).setOrigin(0.5, 1).setDepth(3).setAlpha(0.4 + (i % 4) * 0.12);
      o.setScale(0.3 + (i % 5) * 0.7, 2 + (i % 6) * 2).setAngle((i * 53) % 90 - 45).setFlipY(i % 3 === 0).setFlipX(i % 2 === 0);   // stretched and tilted
      this.tweens.add({
        targets: o, x: x + ((i * 13) % 25) - 12, scaleX: o.scaleX * (2.2 - (i % 3) * 0.6), scaleY: o.scaleY * (0.6 + (i % 4) * 0.3),
        angle: o.angle + ((i % 2) ? 28 : -28), yoyo: true, repeat: -1, duration: 600 + (i * 211) % 1300, ease: 'Sine.inOut',
      });
      this.roomObjs.push(o);
    });
    const slices = [];                                               // horizontal glitch bars that tear across the margins
    for (let i = 0; i < 12; i++) {
      const bar = this.add.rectangle(0, 0, 70 + (i % 3) * 20, 2 + i % 3 * 3, i % 2 ? 0x000000 : 0xffffff, 0.45).setDepth(19).setVisible(false);
      slices.push(bar); this.roomObjs.push(bar);
    }
    this.tearTimer = this.time.addEvent({
      delay: 200, loop: true, callback: () => {
        slices.forEach((b, i) => {
          const on = Math.random() < 0.45; b.setVisible(on);
          if (on) b.setPosition(i % 2 ? -36 + Phaser.Math.Between(-20, 20) : W + 36 + Phaser.Math.Between(-20, 20), Phaser.Math.Between(-10, H + 10));
        });
      },
    });
  },

  // the True Eye of the Storm (room.eye): a clear sky glowing overhead, with the grey wall of the storm drifting slowly past
  // at both edges and a few bright motes floating up. Dead calm.
  drawEye() {
    const g = this.add.graphics().setDepth(1);
    this.roomObjs.push(g);
    [0x1a2f5c, 0x24427a, 0x3a64a0, 0x6a9acb, 0xa8d0ee].forEach((c, i) => {      // the sky brightens toward the middle
      g.fillStyle(c, 1); g.fillEllipse(CFG.W / 2, CFG.H * 0.55, CFG.W * (1.6 - i * 0.28), CFG.H * (2.2 - i * 0.4));
    });
    for (let i = 0; i < 18; i++) {
      const m = this.room.zoom ? (1 - this.room.zoom) * 150 : 0;                                         // zoomed out: the storm wall sits out in the margins
      const left = i % 2 === 0, x = left ? Phaser.Math.Between(-10, 36) - m : Phaser.Math.Between(CFG.W - 36, CFG.W + 10) + m;
      const y = (i >> 1) * 22 + Phaser.Math.Between(-6, 6), w = Phaser.Math.Between(40, 70), h = Phaser.Math.Between(22, 40);
      const cloud = this.add.ellipse(x, y, w, h, i % 3 ? 0x8a92a6 : 0x6e7688, 0.75).setDepth(2);
      this.tweens.add({ targets: cloud, y: y + (left ? 8 : -8), x: x + (left ? 4 : -4), yoyo: true, repeat: -1, duration: 2600 + i * 120, ease: 'Sine.inOut' });
      this.roomObjs.push(cloud);
    }
    const motes = this.add.particles(0, 0, 'pixel', {
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(40, CFG.H - 30, CFG.W - 80, 10) },
      lifespan: { min: 2500, max: 4000 }, frequency: 220, speedY: { min: -14, max: -5 }, speedX: { min: -4, max: 4 },
      alpha: { start: 0.9, end: 0 }, scale: { start: 1, end: 0.3 },
    }).setDepth(3);
    this.roomObjs.push(motes);
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
