// GameScene: the True Eye's lightning (room.lightning = { every, warn, width }). Every `every` seconds the patch of ground you
// are standing on is marked with a flashing column for `warn` seconds - then a bolt comes down on it. Be out of the column
// when it lands (a hit goes through hurt(), so Tough Hide and the shield work as for any hazard).
Object.assign(GameScene.prototype, {
  setupLightning(cfg) {
    const g = this.add.graphics().setDepth(18);
    this.roomObjs.push(g);
    const c = { every: 10, warn: 1.4, width: 28, ...cfg };
    this.lightning = { g, cfg: c, phase: 'wait', timer: c.every, t: 0, x: 0, zigzag: [], hitDone: false, blocks: 0 };   // blocks: bolts the shield has stopped this room
  },

  updateLightning(dt) {
    const L = this.lightning;
    if (!L) return;
    const c = L.cfg, g = L.g, p = this.player, floor = this.groundY, half = c.width / 2;
    g.clear();
    if (L.phase === 'wait') {
      L.timer -= dt;
      if (L.timer > 0) return;
      L.phase = 'warn'; L.t = 0;
      L.x = Phaser.Math.Clamp(Math.round(p.centerX), half, CFG.W - half);   // the spot where you stand right now
      return;
    }
    L.t += dt;
    const left = L.x - half;
    if (L.phase === 'warn') {
      const k = Math.min(1, L.t / c.warn);
      const pulse = 0.5 + 0.5 * Math.sin(L.t * (12 + 24 * k));            // flickers faster as the strike nears
      g.fillStyle(0xffe27a, 0.22 + 0.3 * pulse); g.fillRect(left, 0, c.width, floor);
      g.fillStyle(0xfff6c0, 0.25 + 0.45 * pulse); g.fillRect(left, floor - 2, c.width, 2);
      g.lineStyle(1, 0xfff6c0, 0.5 + 0.4 * pulse); g.strokeRect(left + 0.5, 0.5, c.width - 1, floor - 1);
      g.lineStyle(1, 0xffffff, 0.8); g.strokeEllipse(L.x, floor - 1, c.width * (1.5 - 0.5 * k), 6);   // a ring closing in on the spot
      if (L.t >= c.warn) this.lightningStrike(L);
    } else {
      const k = Math.min(1, L.t / LIGHTNING_STRIKE_TIME);
      g.fillStyle(0xffffff, 0.45 * (1 - k)); g.fillRect(left, 0, c.width, floor);
      const pts = L.zigzag;
      for (const [w, col] of [[5 * (1 - k) + 1, 0xfff6b0], [2, 0xffffff]]) {
        g.lineStyle(w, col, 1); g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
        g.strokePath();
      }
      if (!L.hitDone) { L.hitDone = true; if (this.overlapsPlayer(left, 0, c.width, floor)) this.lightningHit(); }
      if (L.t >= LIGHTNING_STRIKE_TIME) { L.phase = 'wait'; L.timer = c.every; }
    }
  },

  // A bolt is no ordinary hazard: it goes straight through Tough Hide (and any extra hit points) and kills outright - only
  // Rampage / a lucky coin make you untouchable. The Mountain Toughened Hide shield deflects it, but only twice: the second
  // bolt it stops makes the shield's walls implode and the room restarts.
  lightningHit() {
    const p = this.player;
    if (p.state === 'dead' || this.invincible) return;
    if (this.shieldT > 0) {
      this.lightning.blocks++;
      if (this.lightning.blocks < 2) {
        this.graceT = CFG.SHIELD_GRACE; p.invuln = Math.max(p.invuln, CFG.SHIELD_GRACE);
        this.burstAtPlayer(0x9fe8ff, 18, 140);
        this.cameras.main.shake(150, 0.008);
        this.toast('The shield deflects the lightning - it cannot take another');
        return;
      }
      this.shieldT = 0; this.shieldCd = CFG.SHIELD_COOLDOWN; this.shieldCharges = 0;
      this.implodeShield();
      this.showTitle('The shield implodes!');
    }
    this.killPlayer(true);
  },

  // the shield's bubble collapses in on the goat
  implodeShield() {
    const p = this.player, ring = this.add.graphics().setDepth(26);
    this.roomObjs.push(ring);
    const s = { r: 14 };
    this.tweens.add({
      targets: s, r: 0, duration: 260, ease: 'Cubic.in',
      onUpdate: () => { ring.clear(); ring.lineStyle(2, 0xd8f8ff, 1); ring.strokeCircle(p.centerX, p.centerY, s.r); },
      onComplete: () => { this.burst(p.centerX, p.centerY, 0xd8f8ff, 26, 160); ring.destroy(); },
    });
    this.cameras.main.shake(400, 0.016);
  },

  lightningStrike(L) {
    L.phase = 'strike'; L.t = 0; L.hitDone = false;
    L.zigzag = [];
    for (let y = 0, x = L.x; y < this.groundY; y += 12) {
      L.zigzag.push({ x, y });
      x = Phaser.Math.Clamp(L.x + Phaser.Math.Between(-9, 9), L.x - 10, L.x + 10);
    }
    L.zigzag.push({ x: L.x, y: this.groundY });
    this.cameras.main.flash(140, 255, 255, 220);
    this.cameras.main.shake(300, 0.012);
    this.burst(L.x, this.groundY - 2, 0xfff6b0, 22, 150);
    this.burst(L.x, this.groundY - 2, 0xffffff, 10, 90);
  },
});

// Wall spikes (room.wallSpikes = { every, warn, len }), rooms 181-199: every `every` seconds a patch of wall near the goat
// shows a flickering tip for `warn` seconds, then a row of spikes lunges out of it, holds, and slides back. Any wall will do:
// the room's edges, hurdles, the climb walls. A hit goes through hurt() like any other hazard.
Object.assign(GameScene.prototype, {
  setupWallSpikes(cfg) {
    const g = this.add.graphics().setDepth(6);
    this.roomObjs.push(g);
    const c = { every: 3.5, warn: 0.7, len: 3, ...cfg };
    this.wallSpikes = { g, cfg: c, timer: c.every, list: [] };
  },

  // a random wall cell near the goat: an open tile with solid rock on one side. Returns { x, y, dir, len } or null
  pickWallSpot() {
    const T = CFG.TILE, p = this.player, len = this.wallSpikes.cfg.len, spots = [];
    for (let r = 1; r < CFG.ROWS - 2; r++) {
      for (let c = 0; c < CFG.COLS; c++) {
        if (this.isSolid(c, r) || Math.abs(c * T + 4 - p.centerX) > 90 || Math.abs(r * T + 4 - p.centerY) > 44) continue;
        for (const dir of [1, -1]) {
          if (!this.isSolid(c - dir, r)) continue;                       // the wall it grows out of
          let n = 0;
          while (n < len && !this.isSolid(c + dir * n, r)) n++;          // how far it can reach before the next wall
          if (n >= 2) spots.push({ x: dir > 0 ? c * T : (c + 1) * T, y: r * T, dir, len: n * T });
        }
      }
    }
    return spots.length ? Phaser.Utils.Array.GetRandom(spots) : null;
  },

  // returns true if a spike caught the player
  updateWallSpikes(dt) {
    const W = this.wallSpikes, c = W.cfg, g = W.g;
    W.timer -= dt;
    if (W.timer <= 0) {
      W.timer = c.every;
      const s = this.pickWallSpot();
      if (s) W.list.push({ ...s, t: 0 });
    }
    g.clear();
    let hit = false;
    for (const s of W.list) {
      s.t += dt;
      const t = s.t - c.warn;
      let L;
      if (t < 0) L = 2 + (Math.floor(s.t * 30) % 2);                                    // peeking tip + jitter: the warning
      else if (t < 0.1) L = 2 + (s.len - 2) * t / 0.1;
      else if (t < 0.7) L = s.len;
      else L = Math.max(0, s.len * (1 - (t - 0.7) / 0.15));
      s.done = t >= 0.85;
      if (L <= 0) continue;
      g.fillStyle(t < 0 ? 0xe8443c : 0xe8ecff);
      const x0 = s.x, d = s.dir;
      for (const dy of [0, 4]) g.fillTriangle(x0, s.y + dy, x0, s.y + dy + 4, x0 + d * L, s.y + dy + 2);
      if (t >= 0 && L >= 5 && this.overlapsPlayer(d > 0 ? x0 : x0 - L, s.y, L, CFG.TILE)) hit = true;
    }
    W.list = W.list.filter(s => !s.done);
    return hit;
  },
});

const LIGHTNING_STRIKE_TIME = 0.28;   // seconds the bolt stays on screen (the hit is checked on its first frame)
