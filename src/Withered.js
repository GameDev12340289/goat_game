// The Withered: a tall, charcoal-skinned figure that chases the player from the left and summons floor-to-ceiling spikes
// out of the floor, just like the popping spikes of room 5 (a jittering peek as a warning, then the pillar shoots up).
// Room config (levels.js -> boss, with withered: true): { speed px/s, startX, firstDelay, spikeEvery, warn, desperateAfter }
// desperateAfter (final room only): after that many seconds it stops and calls a wall of tall spikes across the whole floor.
// Nothing but a Tough Hide survives it: with one the spikes are reflected, pierce the Withered's heart and it drops its bones.
class Withered {
  constructor(scene, cfg, groundY) {
    this.scene = scene;
    this.groundY = groundY;
    this.cfg = { speed: 30, startX: -70, firstDelay: 3, spikeEvery: 5, warn: 1.4, desperateAfter: 0, ...cfg };
    this.x = this.cfg.startX;                      // centre of the body
    this.state = 'chase'; this.stateT = 0; this.t = 0; this.stunT = 0;
    this.spikeT = this.cfg.spikeEvery ? this.cfg.firstDelay : Infinity;
    this.attacks = []; this.wall = []; this.reflects = []; this.queue = []; this.queueT = 0;
    this.noDeflect = false;                        // the desperate spikes can't be shrugged off with the Mountain shield
    this.dead = false;

    this.sprite = scene.add.image(0, 0, 'withered').setOrigin(0.5, 1).setScale(Withered.SCALE).setDepth(9);
    this.gfx = scene.add.graphics().setDepth(8);
    this.lanceG = scene.add.graphics().setDepth(10);       // in front of the body, so the spike is seen going through the chest
    this.lance = null;
    scene.roomObjs.push(this.sprite, this.gfx, this.lanceG);
  }

  // returns true if the player was hit
  update(dt, p) {
    // waitUntilX: the fight doesn't begin until the player has walked that far (room 75: time to visit Jeff first)
    if (!this.started) {
      if (p.x < (this.cfg.waitUntilX || 0)) { this.sprite.setPosition(Math.round(this.x), CFG.H + 2); return false; }
      this.started = true;
      if (this.cfg.waitUntilX) this.scene.jeffLeaves();
    }
    this.t += dt;
    const stunned = this.stunT > 0;
    if (stunned) {
      this.stunT -= dt;
      if (this.stunT <= 0) this.sprite.clearTint();
      else this.sprite.setTint(Math.floor(this.stunT * 8) % 2 ? 0x9fd8ff : 0xffffff);
    }
    if (!stunned) this.step(dt, p);

    for (const a of this.attacks) if (!stunned) a.t += dt;
    this.attacks = this.attacks.filter(a => {
      if (a.t < this.cfg.warn + Withered.RISE + Withered.OUT + Withered.RETRACT) return true;
      a.sprites.forEach(s => s.destroy());
      return false;
    });
    this.animatePillars(p);

    const bob = this.state === 'chase' && !stunned ? Math.abs(Math.sin(this.t * 7)) * 2 : 0;
    this.sprite.setPosition(Math.round(this.x), CFG.H + 2 - Math.round(bob));
    this.draw();
    this.drawLance();

    // ---- collisions ----
    if (this.dead || this.state === 'pierced') return false;
    const hit = (x, y, w, h) => p.x < x + w && p.x + CFG.PW > x && p.y < y + h && p.y + CFG.PH > y;
    if (hit(this.x - Withered.HALF_W, CFG.H - Withered.HEIGHT, Withered.HALF_W * 2, Withered.HEIGHT)) return true;
    for (const a of this.attacks) {
      const h = this.pillarHeight(a.t, a.surface);
      if (h >= 5 && hit(a.col * CFG.TILE, a.surface - h, a.w * CFG.TILE, h)) return true;
    }
    if (this.state === 'despOut' && this.wallH >= 5)
      for (const c of this.wall) if (hit(c * CFG.TILE, this.groundY - this.wallH, CFG.TILE, this.wallH)) return true;
    return false;
  }

  // ---- behaviour --------------------------------------------------------------
  step(dt, p) {
    const cam = this.scene.cameras.main;
    if (this.state === 'chase') {
      this.x += this.cfg.speed * dt;
      this.spikeT -= dt;
      if (this.spikeT <= 0) this.spikeT = this.spawnAttack(p) ? this.cfg.spikeEvery * (0.8 + Math.random() * 0.4) : 0.4;
      if (this.cfg.desperateAfter && this.t >= this.cfg.desperateAfter) this.startDesperate();
    } else if (this.state === 'despWarn') {
      cam.shake(60, 0.004);
      this.stateT -= dt;
      if (this.stateT <= 0) Save.has('toughHide') ? this.startReflect(p) : this.startWall();
    } else if (this.state === 'despOut') {
      this.stateT -= dt;
      this.wallH = Math.min(this.groundY, this.wallH + this.groundY * dt / 0.15);
      if (this.stateT <= 0) this.startDesperate();          // survived (e.g. Rampage): it just tries again
    } else if (this.state === 'reflect') {
      this.queueT -= dt;
      while (this.queue.length && this.queueT <= 0) { this.reflects.push({ sprite: this.makePillar(this.queue.shift(), 0x9fe8ff), born: this.t, t: 0 }); this.queueT += 0.03; }
      if (this.lance && !this.lance.done) {                 // the reflected spike flies at the heart and goes clean through
        this.lance.tip -= Withered.LANCE_SPEED * dt;
        if (this.lance.tip <= this.x - 14) { this.lance.tip = this.x - 14; this.lance.done = true; }
      }
      if (!this.queue.length && this.reflects.every(r => r.t > 0.15) && this.lance && this.lance.done) this.startPierce();
    } else if (this.state === 'pierced') {
      this.stateT -= dt;
      if (Math.floor(this.stateT * 12) % 2) this.sprite.setTint(0xff6a5a); else this.sprite.clearTint();
      if (this.stateT <= 0) this.die();
    }
  }

  // ---- popping pillars (room 5 style) -----------------------------------------
  surfaceAt(col, fromY) {
    for (let r = Math.max(0, Math.floor(fromY / CFG.TILE)); r < CFG.ROWS; r++)
      if (this.scene.isSolid(col, r)) return r * CFG.TILE;
    return null;
  }

  makePillar(col, tint) {
    const s = this.scene.add.image(col * CFG.TILE, CFG.H, 'popspike').setOrigin(0).setDepth(4);
    if (tint) s.setTint(tint);
    this.scene.roomObjs.push(s);
    return s;
  }

  spawnAttack(p) {
    const T = CFG.TILE;
    const first = Math.ceil((this.x + 20) / T) + 1;            // never right underneath the Withered
    const aim = Math.floor((p.centerX + p.vx * 0.8) / T);
    for (const off of [0, 3, -3, 6, -6, 9, -9]) {
      const col = Phaser.Math.Clamp(aim + off - 1, Math.max(2, first), CFG.COLS - 3);
      const surface = this.surfaceAt(col, p.y + CFG.PH);
      if (surface === null) continue;
      const sprites = [0, 1, 2].map(i => this.makePillar(col + i));
      this.attacks.push({ col, w: 3, t: 0, surface, sprites });
      return true;
    }
    return false;
  }

  // same shape as the popping spikes: jitter warning, quick rise, hold, retract
  pillarHeight(t, max) {
    const { warn } = this.cfg, R = Withered.RISE, O = Withered.OUT, D = Withered.RETRACT;
    if (t < warn) return 2 + (Math.floor(t * 30) % 2);
    if (t < warn + R) return 2 + (max - 2) * (t - warn) / R;
    if (t < warn + R + O) return max;
    if (t < warn + R + O + D) return max * (1 - (t - warn - R - O) / D);
    return 0;
  }

  animatePillars(p) {
    for (const a of this.attacks) {
      const h = Math.round(this.pillarHeight(a.t, a.surface));
      a.sprites.forEach(s => { s.setVisible(h > 0); s.y = a.surface - h; });
    }
    if (this.state === 'despOut') {
      const h = Math.round(this.wallH);
      this.wallSprites.forEach(s => { s.setVisible(h > 0); s.y = this.groundY - h; });
    }
    for (const r of this.reflects) {
      r.t = this.t - r.born;
      const h = Math.round(Math.min(1, r.t / 0.12) * this.groundY);
      r.sprite.y = this.groundY - h;
    }
  }

  // ---- the desperate move (final room) ------------------------------------------
  startDesperate() {
    this.clearWall();
    this.state = 'despWarn'; this.stateT = Withered.DESP_WARN; this.noDeflect = true;
    this.sprite.setTexture('witheredRaised');
    this.scene.cameras.main.shake(400, 0.01);
    this.scene.game.events.emit('title', 'The Withered makes a desperate move!');
    const first = Math.ceil((this.x + 18) / CFG.TILE);
    this.wall = [];
    for (let c = first; c < CFG.COLS; c++) this.wall.push(c);
  }

  startWall() {                                    // no Tough Hide: the tall spikes just erupt across the whole floor
    this.state = 'despOut'; this.stateT = Withered.DESP_OUT; this.wallH = 0;
    this.wallSprites = this.wall.map(c => this.makePillar(c));
    this.scene.game.events.emit('title', 'Only a Tough Hide survives this...');
  }

  clearWall() {
    (this.wallSprites || []).forEach(s => s.destroy());
    this.wallSprites = []; this.wallH = 0;
  }

  // Tough Hide: the spikes turn around and race back along the floor to the Withered
  startReflect(p) {
    this.state = 'reflect'; this.wall = [];
    const pcol = Math.floor(p.centerX / CFG.TILE), wcol = Math.floor(this.x / CFG.TILE);
    this.queue = [];
    for (let c = pcol - 2; c >= wcol - 1; c--) this.queue.push(c);
    this.queueT = 0;
    this.lance = { tip: p.centerX - 4, done: false };
    this.scene.game.events.emit('toast', 'Your hide reflects the spikes!');
    this.scene.cameras.main.shake(300, 0.01);
    this.scene.burst(p.centerX, p.centerY, 0x9fe8ff, 18, 120);
  }

  startPierce() {
    this.state = 'pierced'; this.stateT = 1.6;
    this.scene.cameras.main.shake(500, 0.016);
    this.scene.game.events.emit('title', 'The Withered is pierced through the heart!');
    this.scene.burst(this.x, CFG.H - 80, 0xff5a3c, 26, 140);
  }

  die() {
    this.state = 'dead'; this.dead = true; this.sprite.clearTint();
    this.scene.tweens.add({ targets: this.sprite, alpha: 0, duration: 900 });
    this.reflects.forEach(r => this.scene.tweens.add({ targets: r.sprite, alpha: 0, duration: 700 }));
    this.scene.dropBones(this.x, CFG.H - 60);
  }

  // the shield bounced an attack back: stunned, and every summoned pillar is snuffed out
  deflect(p) {
    this.stunT = CFG.BOSS_STUN;
    this.attacks.forEach(a => a.sprites.forEach(s => s.destroy()));
    this.attacks = [];
    if (p.x < this.x + Withered.HALF_W + 2 && !this.scene.solidBox(this.x + Withered.HALF_W + 3, p.y, CFG.PW, CFG.PH))
      p.x = this.x + Withered.HALF_W + 3;
    this.scene.cameras.main.shake(300, 0.01);
    this.scene.game.events.emit('title', 'The Withered recoils!');
  }

  // the big reflected spike: a shaft and an arrowhead at heart height, its tip ends up out of the Withered's back
  drawLance() {
    const g = this.lanceG;
    g.clear();
    if (!this.lance) return;
    const a = this.dead ? this.sprite.alpha : 1, y = Withered.HEART_Y, t = this.lance.tip, len = 70;
    g.fillStyle(0x7fd0ff, 0.45 * a); g.fillRect(t + 8, y - 3, len, 7);                    // glow
    g.fillStyle(0xd8f8ff, a); g.fillRect(t + 10, y - 1, len, 3);                          // shaft
    g.fillTriangle(t, y, t + 12, y - 5, t + 12, y + 5);                                   // head
    if (this.state === 'pierced' || this.dead) { g.fillStyle(0xff5a3c, a); g.fillRect(this.x - 2, y - 2, 4, 5); }   // blood on the shaft
  }

  draw() {
    const g = this.gfx;
    g.clear();
    for (const a of this.attacks) {
      if (a.t >= this.cfg.warn) continue;                          // warning: red tint on the column and floor
      const on = Math.floor(a.t * (a.t < this.cfg.warn - 0.5 ? 5 : 10)) % 2 === 0;
      g.fillStyle(0xff2020, on ? 0.16 : 0.05); g.fillRect(a.col * CFG.TILE, 0, a.w * CFG.TILE, a.surface);
      g.fillStyle(0xff4040, on ? 0.9 : 0.4); g.fillRect(a.col * CFG.TILE, a.surface - 2, a.w * CFG.TILE, 2);
    }
    if (this.state === 'despWarn' && this.wall.length) {           // the whole floor to the right lights up
      const on = Math.floor(this.stateT * 8) % 2 === 0, x = this.wall[0] * CFG.TILE;
      g.fillStyle(0xff2020, on ? 0.3 : 0.12); g.fillRect(x, 0, CFG.W - x, this.groundY);
      g.fillStyle(0xff4040, on ? 1 : 0.5); g.fillRect(x, this.groundY - 2, CFG.W - x, 2);
    }
    if (this.state === 'pierced' || this.dead) {                    // the heart, glowing where the spike went through
      g.fillStyle(0xff6a5a, this.dead ? 0.0 : 0.9); g.fillCircle(this.x, CFG.H - 80, 4);
    }
  }
}

Withered.SCALE = 2;                 // sprite is drawn 14x56 and shown 28x112
Withered.HALF_W = 13; Withered.HEIGHT = 110;
Withered.RISE = 0.1; Withered.OUT = 0.7; Withered.RETRACT = 0.15;
Withered.HEART_Y = 104; Withered.LANCE_SPEED = 380;
Withered.DESP_WARN = 2.4; Withered.DESP_OUT = 1.3;

