// GameScene: Stormlands tornadoes and their bricks, and the Cyclone boss's wind (stun, push, fling).
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
    if (p.state === 'dead' || this.fling || this.invincible) return false;
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
      this.showTitle('The storm flings you into the Cyclone!');
    }
    return true;
  },

  // the 3rd touch: you're swept up in an arc into the heart of the Cyclone, and that's the end of this attempt
  updateFling(dt) {
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
