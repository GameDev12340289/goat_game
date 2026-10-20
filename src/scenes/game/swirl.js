// GameScene: the Eye of the Storm's debris (room 171).
//  room.swirl = { every: [min, max], chance }   Part 1, the Debris Storm: a swarm of swirling debris sweeps across the screen
//    every few seconds. Each time a swarm passes the goat it has `chance` (20%) of shaking a chunk loose that drops on the
//    goat's spot.
//  room.debrisThrow = { first, every, factor, min, speed, speedUp, maxSpeed }   Part 2, the Stairwell: the storms hurl debris
//    at the goat, faster and faster - the gap between throws shrinks by `factor` each time (down to `min`) and the debris
//    speeds up by `speedUp` (up to `maxSpeed`).
// Chunks and thrown debris are ordinary hazards (hurt(): Tough Hide / the shield soak them up).
const SWIRL_COLORS = [0x6b5a48, 0x9a4a34, 0x4a4f5c, 0x8a7a66];

Object.assign(GameScene.prototype, {
  setupSwirl(room) {
    const g = this.add.graphics().setDepth(12);
    this.roomObjs.push(g);
    const s = this.swirl = { g, t: 0, swarms: [], chunks: [], thrown: [] };
    if (room.swirl) Object.assign(s, { every: room.swirl.every, chance: room.swirl.chance, next: 1.5 });
    if (room.debrisThrow) {
      const d = this.debrisCfg = room.debrisThrow;
      Object.assign(s, { next: d.first, gap: d.every, speed: d.speed });
    }
    this.hasThrow = !!room.debrisThrow; this.hasSwarms = !!room.swirl;
  },

  updateSwirl(dt) {
    const s = this.swirl, p = this.player;
    s.t += dt;
    s.next -= dt;
    if (s.next <= 0) {
      if (this.hasSwarms) { this.spawnSwarm(); s.next = Phaser.Math.FloatBetween(...s.every); }
      else {
        const d = this.debrisCfg;
        this.throwDebris(s.speed);
        s.gap = Math.max(d.min, s.gap * d.factor); s.speed = Math.min(d.maxSpeed, s.speed * d.speedUp);
        s.next = s.gap;
      }
    }
    const g = s.g;
    g.clear();
    this.updateSwarms(dt, g, p);
    this.updateChunks(dt, g, p);
    this.updateThrown(dt, p);
  },

  // a swarm of debris circling its own centre as it sweeps across the room from one side, at a height above the goat's head
  spawnSwarm() {
    const dir = Math.random() < 0.5 ? 1 : -1, y = Phaser.Math.Between(30, this.groundY - 28);
    const bits = Array.from({ length: 12 }, (_, i) => ({
      a: Math.random() * 6.28, r: 5 + Math.random() * 16, spd: (3 + Math.random() * 3) * (i % 2 ? 1 : -1),
      size: 2 + (i % 3), color: SWIRL_COLORS[i % 4],
    }));
    this.swirl.swarms.push({ x: dir > 0 ? -34 : CFG.W + 34, y, dir, speed: Phaser.Math.Between(55, 85), bits, passed: false });
  },

  updateSwarms(dt, g, p) {
    const s = this.swirl;
    for (const w of s.swarms) {
      w.x += w.dir * w.speed * dt;
      for (const b of w.bits) {
        b.a += b.spd * dt;
        g.fillStyle(b.color, 0.95);
        g.fillRect(Math.round(w.x + Math.cos(b.a) * b.r * 1.6), Math.round(w.y + Math.sin(b.a) * b.r * 0.6), b.size, b.size);
      }
      // it just went past the goat: one in five times it shakes a chunk loose
      if (!w.passed && p.state !== 'dead' && (w.dir > 0 ? w.x >= p.centerX : w.x <= p.centerX)) {
        w.passed = true;
        if (Math.random() < s.chance) {
          s.chunks.push({ x: Math.round(p.centerX + Phaser.Math.Between(-3, 3)), y: w.y, vy: 0, size: 7 });
          this.burst(p.centerX, w.y, 0x8a7a66, 6, 50);
        }
      }
    }
    s.swarms = s.swarms.filter(w => w.x > -50 && w.x < CFG.W + 50);
  },

  updateChunks(dt, g, p) {
    const s = this.swirl;
    for (const c of s.chunks) {
      c.vy += 520 * dt; c.y += c.vy * dt;
      g.fillStyle(0x3a3a44); g.fillRect(Math.round(c.x - c.size / 2), Math.round(c.y), c.size, c.size);
      g.fillStyle(0x6b5a48); g.fillRect(Math.round(c.x - c.size / 2) + 1, Math.round(c.y) + 1, c.size - 3, 2);
      if (!c.done && this.overlapsPlayer(c.x - c.size / 2, c.y, c.size, c.size)) { c.done = true; this.burst(c.x, c.y, 0xcfd6e0, 10, 90); this.hurt(); }
      if (c.y >= this.groundY - 2) { c.done = true; this.burst(c.x, this.groundY - 2, 0x8a8a94, 5, 60); }
    }
    s.chunks = s.chunks.filter(c => !c.done);
  },

  // the Stairwell: a piece of debris flung at where the goat is, from the storm wall on either side
  throwDebris(speed) {
    const p = this.player, fromLeft = Math.random() < 0.5;
    const x = fromLeft ? -8 : CFG.W + 8, y = Phaser.Math.Between(0, CFG.H - 20);
    const dx = p.centerX - x, dy = p.centerY - y, dist = Math.max(1, Math.hypot(dx, dy)), v = speed / dist;
    const sprite = this.add.image(x, y, 'brick').setOrigin(0.5).setDepth(9).setTint(SWIRL_COLORS[Math.floor(Math.random() * 4)]).setScale(1.2);
    this.roomObjs.push(sprite);
    this.swirl.thrown.push({ x, y, vx: dx * v, vy: dy * v, sprite, life: 7 });
  },

  updateThrown(dt, p) {
    const s = this.swirl;
    for (const b of s.thrown) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      b.sprite.setPosition(Math.round(b.x), Math.round(b.y)).angle += 420 * dt;
      if (!b.hit && this.overlapsPlayer(b.x - 3, b.y - 3, 6)) { b.hit = true; this.burst(b.x, b.y, 0x9a4a34, 8, 80); this.hurt(); }
    }
    s.thrown = s.thrown.filter(b => {
      if (!b.hit && b.life > 0 && b.x > -20 && b.x < CFG.W + 20 && b.y > -20 && b.y < CFG.H + 20) return true;
      b.sprite.destroy();
      return false;
    });
  },
});
