// The Cyclone: a towering tornado that chases the goat from the left through rooms 101-120. Its funnel is a boss attack
// (touching it kills), and it spawns smaller tornadoes of its own:
//  - every 2-5 seconds a small tornado whirls up out of the ground just ahead of you,
//  - (runnerEvery) it spits out little dust devils that race along the floor at you - jump them.
// Touching any of its small tornadoes (GameScene.windTouch): 1st = stunned, 2nd = blown backwards,
// 3rd = flung into the Cyclone, which kills you and restarts the room.
// Room config (levels.js -> boss, with cyclone: true): { speed px/s, startX, firstDelay, minionEvery: [min, max], runnerEvery, finalStand }
// finalStand (room 120 only): after that many seconds the gale drives you into the right-hand corner and the Cyclone closes
// in... and at the last second the wind stops. The Cyclone falls apart, the exit opens and Jeff sets up shop.
class Cyclone {
  constructor(scene, cfg, groundY) {
    this.scene = scene;
    this.groundY = groundY;
    this.cfg = { speed: 30, startX: -40, firstDelay: 2.5, minionEvery: [2, 5], runnerEvery: 0, finalStand: 0, ...cfg };
    this.x = this.cfg.startX;                      // centre of the funnel
    this.t = 0; this.state = 'chase'; this.stateT = 0; this.stunT = 0;
    this.fade = 1;                                 // shrinks to 0 as it dies out at the end of room 120
    this.minionT = this.cfg.firstDelay;
    this.runnerT = this.cfg.runnerEvery ? this.cfg.firstDelay + 1.5 : Infinity;
    this.minions = []; this.runners = [];
    this.noDeflect = false;
    // bits of wreckage caught up in the wind, spiralling up the funnel
    this.debris = Array.from({ length: 16 }, (_, i) => ({
      h: Math.random(), a: i * 0.9, spd: 3 + Math.random() * 3, rise: 0.06 + Math.random() * 0.06,
      color: [0x6b5a48, 0x9a4a34, 0x4a4f5c][i % 3], size: 2 + (i % 3),
    }));
    this.gfx = scene.add.graphics().setDepth(9);
    scene.roomObjs.push(this.gfx);
  }

  // half the funnel's width at height y: narrow where it touches the ground, huge up in the clouds
  halfW(y) {
    const u = Phaser.Math.Clamp((this.groundY - y) / this.groundY, 0, 1.2);
    return (Cyclone.BASE + (Cyclone.TOP - Cyclone.BASE) * u) * this.fade;
  }
  front(y) { return this.x + this.halfW(y); }
  sway(u) { return Math.sin(this.t * 1.7 + u * 2.4) * (2 + u * 10); }   // the top sways more than the base

  // returns true if the player touched the funnel itself
  update(dt, p) {
    this.t += dt;
    const stunned = this.stunT > 0;
    if (stunned) this.stunT -= dt;
    else this.step(dt, p);
    this.updateMinions(dt, p, stunned);
    this.updateRunners(dt, p, stunned);
    this.draw();

    if (this.state !== 'chase' || this.scene.fling) return false;
    for (const y of [p.y, p.y + CFG.PH - 1]) {
      const h = this.halfW(y) - 3;                 // a little forgiving at the edges
      if (p.x < this.x + h && p.x + CFG.PW > this.x - h) return true;
    }
    return false;
  }

  // ---- behaviour --------------------------------------------------------------
  step(dt, p) {
    const cam = this.scene.cameras.main;
    if (this.state === 'chase') {
      this.x += this.cfg.speed * dt;
      this.minionT -= dt;
      if (this.minionT <= 0) this.minionT = this.spawnMinion(p) ? Phaser.Math.FloatBetween(...this.cfg.minionEvery) : 0.3;
      this.runnerT -= dt;
      if (this.runnerT <= 0) { this.spawnRunner(); this.runnerT = this.cfg.runnerEvery * (0.8 + Math.random() * 0.4); }
      if (this.cfg.finalStand && this.t >= this.cfg.finalStand) this.startCorner();
    } else if (this.state === 'corner' || this.state === 'hold') {
      cam.shake(60, this.state === 'hold' ? 0.008 : 0.004);
      if (p.state !== 'dead') {
        p.moveX(Cyclone.WIND * dt);                // a gale you can't run against
        const f = this.front(p.y) + 2;             // and the funnel shoves you along in front of it
        if (p.x < f) p.moveX(f - p.x);
      }
      if (this.state === 'corner') {
        const stopAt = CFG.W - CFG.PW - Cyclone.GAP - this.halfW(this.groundY - CFG.PH);
        this.x = Math.min(stopAt, this.x + Cyclone.CORNER_SPEED * dt);
        if (this.x >= stopAt) { this.state = 'hold'; this.stateT = Cyclone.HOLD_TIME; }
      } else {
        this.stateT -= dt;
        const cornered = p.x >= CFG.W - CFG.PW - 1;
        if (this.stateT <= 0 && (cornered || this.stateT < -2)) this.startCalm();
      }
    } else if (this.state === 'calm') {
      this.fade = Math.max(0, this.fade - dt / Cyclone.CALM_TIME);
      if (this.fade <= 0) this.finish();
    }
  }

  // room 120: the gale pins you in the corner
  startCorner() {
    this.state = 'corner';
    this.clearMinions();
    this.scene.cameras.main.shake(500, 0.012);
    this.scene.game.events.emit('title', 'The Cyclone drives you into the corner!');
  }

  // ...and at the last second, the wind just stops
  startCalm() {
    this.state = 'calm';
    this.scene.cameras.main.shakeEffect.reset();   // dead calm, all at once
    this.scene.burst(this.x, this.groundY - 40, 0xd4d9e6, 24, 140);
    this.scene.game.events.emit('title', '...and the wind stops.');
  }

  finish() {
    this.state = 'gone';
    this.scene.exitLocked = false;
    this.scene.spawnJeff(CFG.W / 2 - 20);          // the storm has passed: Jeff sets up his stall right here
    this.scene.game.events.emit('toast', 'The Cyclone is spent. Jeff sets up shop');
  }

  // the shield bounced it back: the Cyclone staggers and you're pushed out in front of the funnel
  deflect(p) {
    this.stunT = CFG.BOSS_STUN;
    const f = Math.ceil(this.front(p.y)) + 3;
    if (p.x < f && !this.scene.solidBox(f, p.y, CFG.PW, CFG.PH)) p.x = f;
    this.scene.cameras.main.shake(300, 0.01);
    this.scene.game.events.emit('title', 'The Cyclone staggers!');
  }

  // ---- small tornadoes -----------------------------------------------------------
  surfaceAt(col, fromY) {
    for (let r = Math.max(0, Math.floor(fromY / CFG.TILE)); r < CFG.ROWS; r++)
      if (this.scene.isSolid(col, r)) return r * CFG.TILE;
    return null;
  }

  // a small tornado whirls up on the ground a little way ahead of wherever you're heading
  spawnMinion(p) {
    const dir = Math.abs(p.vx) > 10 ? Math.sign(p.vx) : p.facing;
    const ahead = p.centerX + dir * Phaser.Math.Between(26, 42);
    const minX = Math.max(12, this.front(this.groundY) + 24);
    for (const off of [0, 8, -8, 16, -16, 24, -24]) {
      const x = Phaser.Math.Clamp(ahead + off, minX, CFG.W - 12);
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
      const s = Math.min(1, m.t / Cyclone.MINION_GROW) * Phaser.Math.Clamp((m.life - m.t) / 0.3, 0, 1);
      m.sprite.setScale(s).setFlipX(Math.floor(this.t * 12) % 2 === 0)
        .setPosition(Math.round(m.x + Math.sin(this.t * 30 + m.x) * 0.8), m.y);
      // live from the moment it appears: touching it at any size sets it off (the hitbox grows with the funnel)
      if (s > 0 && this.touching(p, m.x - 5 * s, m.y - 15 * s, 10 * s, 15 * s) && this.scene.windTouch()) m.t = Math.max(m.t, m.life - 0.3);
    }
    this.minions = this.minions.filter(m => {
      if (m.t < m.life) return true;
      m.sprite.destroy();
      return false;
    });
  }

  // a dust devil rolls out of the base of the Cyclone and races along the floor (and off the edge of any pit)
  spawnRunner() {
    const x = this.front(this.groundY) + 4;
    const sprite = this.scene.add.image(x, this.groundY, 'tornado').setOrigin(0.5, 1).setDepth(8)
      .setScale(Cyclone.RUNNER_SCALE).setTint(0xc8b8a0);
    this.scene.roomObjs.push(sprite);
    this.runners.push({ x, y: this.groundY, vy: 0, sprite });
  }

  updateRunners(dt, p, stunned) {
    const T = CFG.TILE;
    for (const r of this.runners) {
      if (!stunned) {
        r.x += Cyclone.RUNNER_SPEED * dt;
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

  clearMinions() {
    for (const m of [...this.minions, ...this.runners]) {
      this.scene.burst(m.x, m.y - 6, 0xbfc6d6, 6, 50);
      m.sprite.destroy();
    }
    this.minions = []; this.runners = [];
  }

  touching(p, x, y, w, h) { return p.state !== 'dead' && p.x < x + w && p.x + CFG.PW > x && p.y < y + h && p.y + CFG.PH > y; }

  // ---- drawing ----------------------------------------------------------------
  draw() {
    const g = this.gfx;
    g.clear();
    if (this.state === 'gone') return;
    const top = -12, bottom = this.groundY, N = 22, bandH = (bottom - top) / N, a0 = this.fade;
    const stun = this.stunT > 0;
    const shades = stun ? [0x9fd8ff, 0xd8f4ff, 0x7fb8e8] : [0x6e7688, 0x8a92a6, 0x5a6172];

    g.fillStyle(0x8a7a66, 0.5 * a0);                                              // dust kicked up around the base
    g.fillEllipse(this.x + this.sway(0), bottom - 2, (Cyclone.BASE * 2 + 26) * a0, 10 * a0);

    for (let i = N; i >= 0; i--) {                                                // spinning bands, top down
      const u = i / N, y = bottom - i * bandH, hw = this.halfW(y), cx = this.x + this.sway(u);
      g.fillStyle(shades[(i + Math.floor(this.t * 14)) % 3], 0.92 * a0);
      g.fillEllipse(cx, y, hw * 2, bandH * 2.2);
      const a = this.t * 9 + i * 0.7;                                             // wind streaks sweeping round the front
      if (Math.cos(a) > 0) {
        g.fillStyle(0xd4d9e6, 0.85 * a0);
        g.fillRect(Math.round(cx + Math.sin(a) * hw * 0.85) - 3, Math.round(y), 6, 1);
      }
    }

    for (const d of this.debris) {                                                // wreckage spiralling up the funnel
      const h = (d.h + this.t * d.rise) % 1, y = bottom - h * (bottom - top);
      const a = this.t * d.spd + d.a, cx = this.x + this.sway(h);
      g.fillStyle(d.color, (Math.cos(a) > 0 ? 1 : 0.45) * a0);
      g.fillRect(Math.round(cx + Math.sin(a) * this.halfW(y) * 1.1), Math.round(y), d.size, d.size);
    }
  }
}

Cyclone.BASE = 12; Cyclone.TOP = 64;      // half-width of the funnel at the ground / at the top of the screen
Cyclone.MINION_GROW = 0.5;                 // seconds a small tornado takes to whirl up to full size
Cyclone.RUNNER_SPEED = 75; Cyclone.RUNNER_SCALE = 0.7;
Cyclone.WIND = 140;                        // room 120's gale, px/s (faster than you can run)
Cyclone.CORNER_SPEED = 60; Cyclone.GAP = 6; Cyclone.HOLD_TIME = 0.8; Cyclone.CALM_TIME = 2;
