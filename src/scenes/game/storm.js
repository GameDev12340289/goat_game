// GameScene: Stormlands tornadoes and their bricks, and the small tornadoes' wind (stun, push, fling) - into the Cyclone
// in its rooms, or into the ceiling and buried under the rubble in the Wreckage.
Object.assign(GameScene.prototype, {
  updateTornadoes(dt) {
    for (const t of this.tornadoes) {
      t.t -= dt;
      if (t.t <= 0) { t.t = CFG.TORNADO_PERIOD; this.throwBrick(t); }
    }
    for (const b of this.bricks) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      b.sprite.setPosition(Math.round(b.x), Math.round(b.y));
      b.sprite.angle += 480 * dt;
    }
    this.bricks = this.bricks.filter(b => {
      if (b.life > 0 && b.x > -10 && b.x < CFG.W + 10 && b.y > -10 && b.y < CFG.H + 10) return true;
      b.sprite.destroy();
      return false;
    });
    for (const b of this.bricks) if (!b.hit && this.overlapsPlayer(b.x - 3, b.y - 3, 6)) { b.hit = true; this.brickHit(); }
  },

  throwBrick(t) {
    const p = this.player;
    const dx = p.centerX - t.x, dy = p.centerY - t.y, dist = Math.max(1, Math.hypot(dx, dy));
    const v = CFG.TORNADO_BRICK_SPEED / dist;
    const sprite = this.add.image(t.x, t.y, 'brick').setOrigin(0.5).setDepth(9);
    this.roomObjs.push(sprite);
    this.bricks.push({ x: t.x, y: t.y, vx: dx * v, vy: dy * v, sprite, life: 4 });
    this.burst(t.x, t.y, 0x9a4a34, 6, 60);
  },

  // the first brick that ever clips you in a room just stuns you; every one after is a real hit
  brickHit() {
    const p = this.player;
    if (p.state === 'dead' || p.invuln > 0 || this.invincible) return;
    if (this.tryDeflect()) return;
    if (this.tornadoWarned) return this.hurt();
    this.tornadoWarned = true;
    this.brickStunT = CFG.TORNADO_STUN;
    p.invuln = CFG.HURT_INVULN;
    this.burstAtPlayer(0xffa060, 10, 90);
    this.cameras.main.shake(150, 0.006);
    this.toast('A brick clips you - stunned!');
  },

  // one of the Cyclone's small tornadoes caught you: the 1st stuns you, the 2nd blows you backwards and the 3rd
  // flings you into the Cyclone itself. Returns true if the touch counted (so the little tornado blows itself out).
  windTouch() {
    const p = this.player;
    if (p.state === 'dead' || this.fling || this.invincible || p.invuln > 0) return false;   // one touch at a time
    if (this.tryDeflect()) return true;
    this.windHits++;
    this.burstAtPlayer(0xd4d9e6, 12, 100);
    this.cameras.main.shake(150, 0.006);
    if (this.windHits === 1) {
      this.brickStunT = CFG.CYCLONE_STUN;
      p.invuln = CFG.CYCLONE_TOUCH_IFRAME;
      this.toast('Caught in the wind - stunned!');
    } else if (this.windHits === 2) {
      p.state = 'normal'; p.dashTimer = 0; p.varJump = 0; p.remX = 0; p.remY = 0;
      p.vx = -CFG.CYCLONE_PUSH_VX; p.vy = CFG.CYCLONE_PUSH_VY;
      p.wallJumpLock = CFG.CYCLONE_PUSH_LOCK; p.wallJumpDir = -1;     // no steering out of it for a moment
      p.invuln = CFG.CYCLONE_TOUCH_IFRAME;
      this.toast('The wind hurls you backwards! Once more and it takes you');
    } else {
      p.state = 'fling';
      this.fling = { t: 0, x0: p.x, y0: p.y, ghostT: 0 };
      this.cameras.main.shake(400, 0.012);
      if (this.boss instanceof Cyclone) this.showTitle('The storm flings you into the Cyclone!');
      else {                                                            // no Cyclone to throw you into: up into the ceiling instead
        Object.assign(this.fling, { ceiling: true, phase: 'up', ceilY: this.ceilingAbove(p), vx: Phaser.Math.Between(-30, 30) });
        this.showTitle('The wind slams you into the ceiling!');
      }
    }
    return true;
  },

  // y of the underside of whatever is directly above the goat (the top of the screen if nothing is)
  ceilingAbove(p) {
    const c = Math.floor(p.centerX / CFG.TILE);
    for (let r = Math.floor(p.y / CFG.TILE) - 1; r >= 0; r--)
      if (this.grid[r] && this.grid[r][c]) return (r + 1) * CFG.TILE;
    return 0;
  },

  // the Wreckage's 3rd fling: hurled up into the ceiling, dropped back to the floor, and the cracked ceiling comes down
  // on top of you in a pile of rubble. Then the room restarts.
  updateCeilingFling(dt) {
    const f = this.fling, p = this.player;
    if (this.winds) this.winds.update(dt, p);
    if (f.phase === 'up') {
      const u = Math.min(1, f.t / CFG.WRECK_FLING_UP);
      p.x = Math.round(Phaser.Math.Clamp(f.x0 + f.vx * u, 0, CFG.W - CFG.PW));
      p.y = Math.round(f.y0 + (f.ceilY - f.y0) * (1 - (1 - u) * (1 - u)));   // fast at first, slamming into the top
      f.ghostT -= dt;
      if (f.ghostT <= 0) { f.ghostT = 0.04; this.spawnGhost(p); }
      if (u >= 1) {
        f.phase = 'fall'; f.vy = 0;
        f.floorY = this.floorBelow({ x: p.centerX, y: p.y }) - CFG.PH;
        this.cameras.main.shake(300, 0.014);
        this.burst(p.centerX, f.ceilY + 2, 0xcfd6e0, 18, 120);
      }
    } else if (f.phase === 'fall') {
      f.vy += CFG.GRAVITY * dt;
      p.y = Math.min(f.floorY, p.y + f.vy * dt);
      if (p.y >= f.floorY || p.y > CFG.H) { f.phase = 'bury'; f.buryT = CFG.WRECK_BURY_TIME; this.startBury(p, f.ceilY); }
    } else {
      f.buryT -= dt;
      this.updateBury(dt);
      if (f.buryT <= 0) {
        this.fling = null; this.windHits = 0; this.brickStunT = 0; p.state = 'normal';
        this.killPlayer(true);
      }
    }
    p.facing = 1; p.sync();
    this.updateHud();
  },

  // rubble rains from the cracked ceiling and piles into a mound over the goat
  startBury(p, ceilY) {
    this.cameras.main.shake(600, 0.012);
    this.showTitle('The ceiling comes down on you!');
    const g = this.add.graphics().setDepth(13);
    this.roomObjs.push(g);
    const colors = [0x3a3a44, 0x45454f, 0x2e2e36, 0x50505c], cx = p.centerX, ground = p.y + CFG.PH;
    const rows = 5, rowH = 5, debris = [];
    for (let row = 0; row < rows; row++) {
      const half = Phaser.Math.Linear(14, 2, row / (rows - 1));
      for (let ox = -half; ox <= half; ox += 5) {
        debris.push({
          x: cx + ox + (Math.random() * 2 - 1), y: ceilY - Math.random() * 50, vy: 20 + Math.random() * 30,
          w: 5 + Math.floor(Math.random() * 3), h: 5 + Math.floor(Math.random() * 3),
          color: colors[Math.floor(Math.random() * colors.length)],
          targetY: ground - row * rowH - Math.random() * 2, landed: false,
        });
      }
    }
    this.bury = { g, debris };
  },

  updateBury(dt) {
    const { g, debris } = this.bury;
    g.clear();
    for (const d of debris) {
      if (!d.landed) {
        d.vy += CFG.WRECK_DEBRIS_GRAVITY * dt; d.y += d.vy * dt;
        if (d.y >= d.targetY) { d.y = d.targetY; d.landed = true; this.burst(d.x, d.y, 0x8a8a94, 3, 60); }
      }
      g.fillStyle(d.color, 1);
      g.fillRect(Math.round(d.x - d.w / 2), Math.round(d.y - d.h), d.w, d.h);
    }
  },

  // the 3rd touch: you're swept up in an arc into the heart of the Cyclone, and that's the end of this attempt
  updateFling(dt) {
    if (this.fling.ceiling) { this.time_ += dt; this.fling.t += dt; return this.updateCeilingFling(dt); }
    const f = this.fling, p = this.player, b = this.boss;
    this.time_ += dt; f.t += dt;
    if (b) b.update(dt, p);
    const u = Math.min(1, f.t / CFG.CYCLONE_FLING_TIME);
    const tx = (b ? b.x : f.x0 - 60) - CFG.PW / 2, ty = b ? b.groundY - 60 : f.y0;
    p.x = Math.round(f.x0 + (tx - f.x0) * u);
    p.y = Math.round(f.y0 + (ty - f.y0) * u - Math.sin(u * Math.PI) * 24);
    p.facing = 1; p.sync();
    f.ghostT -= dt;
    if (f.ghostT <= 0) { f.ghostT = 0.04; this.spawnGhost(p); }
    if (u >= 1) { this.fling = null; this.windHits = 0; this.brickStunT = 0; p.state = 'normal'; this.killPlayer(true); }   // the count starts over: next touch is a stun again
    this.updateHud();
  },
});
