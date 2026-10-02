// Small tornadoes: the ones that whirl up out of the ground just ahead of you, and the dust devils that race along the
// floor. Touching either goes through GameScene.windTouch (1st = stunned, 2nd = blown backwards, 3rd = flung).
// The Cyclone owns one and decides when to spawn them itself (no cfg). The Wreckage rooms (121-150) have no boss, so
// the room's own Gusts runs its timers - room config (levels.js -> winds): { firstDelay, every: [min, max], runnerEvery }
// and runners roll in from the left edge of the screen.
class Gusts {
  constructor(scene, cfg = null, groundY = 0) {
    this.scene = scene;
    this.groundY = groundY;
    this.cfg = cfg && { firstDelay: 2, every: [2.5, 5], runnerEvery: 0, ...cfg };
    this.t = 0;
    this.minionT = cfg ? this.cfg.firstDelay : Infinity;
    this.runnerT = cfg && this.cfg.runnerEvery ? this.cfg.firstDelay + 1.5 : Infinity;
    this.minions = []; this.runners = [];
  }

  // stunned: the Cyclone is staggered, so its tornadoes freeze in place with it
  update(dt, p, stunned = false) {
    this.t += dt;
    if (this.cfg && !stunned && !this.scene.fling) {
      this.minionT -= dt;
      if (this.minionT <= 0) this.minionT = this.spawnMinion(p, 12) ? Phaser.Math.FloatBetween(...this.cfg.every) : 0.3;
      this.runnerT -= dt;
      if (this.runnerT <= 0) { this.spawnRunner(-4, this.groundY); this.runnerT = this.cfg.runnerEvery * (0.8 + Math.random() * 0.4); }
    }
    this.updateMinions(dt, p, stunned);
    this.updateRunners(dt, p, stunned);
  }

  surfaceAt(col, fromY) {
    for (let r = Math.max(0, Math.floor(fromY / CFG.TILE)); r < CFG.ROWS; r++)
      if (this.scene.isSolid(col, r)) return r * CFG.TILE;
    return null;
  }

  // a small tornado whirls up on the ground a little way ahead of wherever you're heading (never left of minX)
  spawnMinion(p, minX) {
    const dir = Math.abs(p.vx) > 10 ? Math.sign(p.vx) : p.facing;
    const ahead = p.centerX + dir * Phaser.Math.Between(26, 42);
    for (const off of [0, 8, -8, 16, -16, 24, -24]) {
      const x = Phaser.Math.Clamp(ahead + off, Math.max(12, minX), CFG.W - 12);
      if (Math.abs(x - p.centerX) < 14) continue;               // never right on top of you
      const surface = this.surfaceAt(Math.floor(x / CFG.TILE), p.y + CFG.PH - 4);
      if (surface === null) continue;
      const sprite = this.scene.add.image(x, surface, 'tornado').setOrigin(0.5, 1).setDepth(8).setScale(0);
      this.scene.roomObjs.push(sprite);
      this.minions.push({ x, y: surface, t: 0, life: Phaser.Math.FloatBetween(2.6, 3.4), sprite });
      this.scene.burst(x, surface - 2, 0xbfc6d6, 8, 50);
      return true;
    }
    return false;
  }

  updateMinions(dt, p, stunned) {
    for (const m of this.minions) {
      if (!stunned) m.t += dt;
      const s = Math.min(1, m.t / Gusts.MINION_GROW) * Phaser.Math.Clamp((m.life - m.t) / 0.3, 0, 1);
      m.sprite.setScale(s).setFlipX(Math.floor(this.t * 12) % 2 === 0)
        .setPosition(Math.round(m.x + Math.sin(this.t * 30 + m.x) * 0.8), m.y);
      // live from the moment it appears: touching it at any size sets it off (the hitbox grows with the funnel)
      if (!m.hit && s > 0 && this.touching(p, m.x - 5 * s, m.y - 15 * s, 10 * s, 15 * s) && this.scene.windTouch()) {
        m.hit = true;                                                // it blows itself out - and can't catch you again while it fades
        m.t = Math.max(m.t, m.life - 0.3);
      }
    }
    this.minions = this.minions.filter(m => {
      if (m.t < m.life) return true;
      m.sprite.destroy();
      return false;
    });
  }

  // a dust devil that races along the floor (and off the edge of any pit)
  spawnRunner(x, y) {
    const sprite = this.scene.add.image(x, y, 'tornado').setOrigin(0.5, 1).setDepth(8)
      .setScale(Gusts.RUNNER_SCALE).setTint(0xc8b8a0);
    this.scene.roomObjs.push(sprite);
    this.runners.push({ x, y, vy: 0, sprite });
  }

  updateRunners(dt, p, stunned) {
    const T = CFG.TILE;
    for (const r of this.runners) {
      if (!stunned) {
        r.x += Gusts.RUNNER_SPEED * dt;
        const s = this.surfaceAt(Math.floor(r.x / T), r.y - 12);   // looks a tile up, so it hops onto hurdles
        if (s !== null && s <= r.y) { r.y = s; r.vy = 0; }
        else { r.vy += CFG.GRAVITY * dt; r.y = s === null ? r.y + r.vy * dt : Math.min(s, r.y + r.vy * dt); }
      }
      r.sprite.setPosition(Math.round(r.x), Math.round(r.y)).setFlipX(Math.floor(this.t * 14) % 2 === 0);
      if (!r.hit && this.touching(p, r.x - 4, r.y - 10, 8, 10) && this.scene.windTouch()) r.hit = true;
    }
    this.runners = this.runners.filter(r => {
      if (!r.hit && r.x < CFG.W + 10 && r.y < CFG.H + 20) return true;
      r.sprite.destroy();
      return false;
    });
  }

  clear() {
    for (const m of [...this.minions, ...this.runners]) {
      this.scene.burst(m.x, m.y - 6, 0xbfc6d6, 6, 50);
      m.sprite.destroy();
    }
    this.minions = []; this.runners = [];
  }

  touching(p, x, y, w, h) { return p.state !== 'dead' && p.x < x + w && p.x + CFG.PW > x && p.y < y + h && p.y + CFG.PH > y; }
}

Gusts.MINION_GROW = 0.5;                  // seconds a small tornado takes to whirl up to full size
Gusts.RUNNER_SPEED = 75; Gusts.RUNNER_SCALE = 0.7;
