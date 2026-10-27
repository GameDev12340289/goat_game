// The colourless hand (rooms 231-235). It doesn't run after you: every so often the sky flashes red where it is about to
// strike, then the sky rips open and a small grey hand gropes blindly through the air for a few seconds, grabbing at
// nothing in particular (touch it and you die), before it pulls back and the rift seals itself. Then the wait starts again.
// Room config: boss: { hand: true, firstDelay, every, warn, grasp, seek, size }
//   every: seconds between attacks   warn: red flash before the rip   grasp: how long it gropes
//   seek: 0..1 chance that a grope is aimed at where you are (0 = fully blind)   size: scale of the hand (default 0.5)
class Hand extends Boss {
  constructor(scene, cfg, groundY) {
    super(scene, cfg, groundY);
    Object.assign(this.cfg, { every: 6, warn: 1.2, grasp: 3, seek: 0, size: 0.5, crush: 0, crushWarn: 1.8, ...cfg });
    this.zx = 0; this.zw = 56; this.slabY = -10; this.slabY0 = 0; this.mistT = 0;
    this.sprite.setVisible(false);                         // the goat sprite is never shown; the hand is painted below
    this.hg = scene.add.graphics().setDepth(15);
    scene.roomObjs.push(this.hg);
    this.state = 'idle'; this.stateT = this.cfg.firstDelay;
    this.rx = CFG.W / 2; this.rift = 0; this.age = 0;
    this.tip = { x: 0, y: 0 }; this.goal = { x: 0, y: 0 }; this.goalT = 0; this.ang = 0;
  }

  // returns true if the player was caught
  update(dt, p) {
    this.t += dt;
    if (this.state === 'idle') {
      this.rift = Math.max(0, this.rift - dt * 3);
      this.stateT -= dt;
      if (this.stateT <= 0) { if (Math.random() < this.cfg.crush) this.startCrush(p); else this.startWarn(p); }
    } else if (this.state === 'cwarn' || this.state === 'cpull' || this.state === 'cdown') {
      return this.updateCrush(dt, p);
    } else if (this.state === 'warn') {
      this.stateT -= dt;
      if (this.stateT <= 0) this.startGrasp();
    } else if (this.state === 'grasp') {
      this.age += dt;
      this.rift = Math.min(1, this.rift + dt * 3);
      this.grope(dt, p);
      if (this.age >= this.cfg.grasp) { this.state = 'vanish'; this.stateT = 0.6; }
    } else {                                               // vanish: the hand pulls back up into the rift, which seals
      this.stateT -= dt;
      this.rift = Math.max(0, this.rift - dt * 2.5);
      const k = Math.max(0, this.stateT / 0.6);
      this.tip.x = this.rx + (this.tip.x - this.rx) * (1 - dt * 6); this.tip.y = 14 + (this.tip.y - 14) * (1 - dt * 6);
      if (this.stateT <= 0) { this.state = 'idle'; this.stateT = this.cfg.every * (0.85 + Math.random() * 0.3); this.age = 0; }
      if (k <= 0) this.rift = 0;
    }
    this.draw();
    return this.state === 'grasp' && this.age > 0.4 && this.touches(p);
  }

  // ---- the second attack: the hand grasps the sky and drags a slab of it down onto a patch of floor --------------------
  // the patch flashes red while the hand pulls (cwarn); get off it. Then the sky slams down (cpull) and sits there for a
  // moment (cdown) - anyone still under it is crushed into mist.
  startCrush(p) {
    this.state = 'cwarn'; this.stateT = this.cfg.crushWarn; this.rift = 0;
    this.zx = Phaser.Math.Clamp(p.centerX + p.vx * 0.5 + Phaser.Math.Between(-10, 10), this.zw / 2 + 8, CFG.W - this.zw / 2 - 8);
    this.slabY = -10; this.noDeflect = true;
    this.scene.game.events.emit('toast', 'The hand grasps the sky...');
  }

  inZone(p) { return p.x < this.zx + this.zw / 2 && p.x + CFG.PW > this.zx - this.zw / 2; }

  updateCrush(dt, p) {
    let hit = false;
    this.stateT -= dt;
    if (this.state === 'cwarn') {
      const u = 1 - this.stateT / this.cfg.crushWarn;
      this.rift = Math.min(1, this.rift + dt * 3);
      this.slabY = -10 + 40 * u * u + Math.sin(this.t * 40) * u * 1.5;            // the hand drags it down a little, straining
      if (this.stateT <= 0) { this.state = 'cpull'; this.stateT = 0.22; this.slabY0 = this.slabY; }
    } else if (this.state === 'cpull') {
      const u = Math.min(1, 1 - this.stateT / 0.22);
      this.slabY = this.slabY0 + (this.groundY - this.slabY0) * u * u;
      hit = this.slabY >= p.y && this.inZone(p);
      if (this.stateT <= 0) {
        this.state = 'cdown'; this.stateT = 0.9; this.slabY = this.groundY;
        this.scene.cameras.main.shake(450, 0.016);
        this.scene.burst(this.zx, this.groundY - 2, 0xe8e8e8, 22, 90);
      }
    } else {
      this.mistT -= dt;
      if (this.mistT <= 0) { this.mistT = 0.1; this.scene.burst(this.zx + Phaser.Math.Between(-24, 24), this.groundY - Phaser.Math.Between(2, 20), 0xdcdcdc, 3, 30); }
      hit = this.inZone(p);
      if (this.stateT <= 0) { this.state = 'idle'; this.stateT = this.cfg.every * (0.85 + Math.random() * 0.3); this.noDeflect = false; }
    }
    if (hit) this.scene.burst(p.centerX, p.centerY, 0xf0f0f0, 30, 70);              // crushed into mist
    this.draw();
    return hit;
  }

  drawCrush(g) {
    const zx = this.zx, zw = this.zw, x0 = zx - zw / 2, fy = this.groundY, s = this.cfg.size;
    if (this.state === 'cwarn') {                                                    // the patch of floor that is about to be crushed
      const u = 1 - this.stateT / this.cfg.crushWarn, on = Math.floor(this.t * (u > 0.6 ? 16 : 8)) % 2 === 0;
      g.fillStyle(0xff2020, on ? 0.45 : 0.15); g.fillRect(x0, fy - 70, zw, 70);
      g.fillStyle(0xff2020, on ? 0.9 : 0.5); g.fillRect(x0, fy - 3, zw, 3);
      g.lineStyle(1, 0xff6060, on ? 1 : 0.4); g.strokeRect(x0 + 0.5, fy - 69.5, zw - 1, 69);
    }
    if (this.rift > 0 && this.state === 'cwarn') Hand.rift(g, zx, this.rift, this.t, 50, 0.3);
    const by = this.slabY;                                                           // the slab of sky: pale, with a torn, jagged bottom
    g.fillStyle(0xf2f2f2, 0.97); g.fillRect(x0, -60, zw, by + 60);
    g.fillStyle(0xbdbdbd, 1); g.fillRect(x0, -60, 2, by + 60); g.fillRect(x0 + zw - 2, -60, 2, by + 60);
    g.fillStyle(0x6a6a6a, 1);
    for (let i = 0; i < 7; i++) g.fillTriangle(x0 + i * zw / 7, by, x0 + (i + 1) * zw / 7, by, x0 + (i + 0.5) * zw / 7, by + 5 + (i % 3) * 3);
    g.lineStyle(Math.max(3, 14 * s), 0x3a3a3a, 1); g.lineBetween(zx, -8, zx, by - 12);   // the arm coming down from the top of the sky
    g.lineStyle(Math.max(2, 11 * s), 0x9a9a9a, 1); g.lineBetween(zx, -8, zx, by - 12);
    g.save(); g.translateCanvas(zx, by + 6); g.rotateCanvas(Math.PI / 2);            // fingers clamped over the torn edge
    Hand.paint(g, 0, 40 * s, this.t, { s, spread: 0.15 });
    g.restore();
  }

  startWarn(p) {
    this.state = 'warn'; this.stateT = this.cfg.warn;
    this.rx = Phaser.Math.Clamp(p.centerX + p.vx * 0.5 + Phaser.Math.Between(-30, 30), 40, CFG.W - 40);
    this.scene.game.events.emit('toast', 'The sky is bleeding...');
  }

  startGrasp() {
    this.state = 'grasp'; this.age = 0; this.rift = 0; this.goalT = 0;
    this.tip = { x: this.rx, y: 16 };
    this.scene.cameras.main.shake(300, 0.008);
    this.scene.cameras.main.flash(120, 255, 255, 255);
  }

  // it can't see: every half second it picks somewhere to snatch at, mostly at random
  grope(dt, p) {
    this.goalT -= dt;
    if (this.goalT <= 0) {
      this.goalT = 0.5 + Math.random() * 0.25;
      const seek = Math.random() < this.cfg.seek;
      this.goal = seek
        ? { x: p.centerX + Phaser.Math.Between(-12, 12), y: p.centerY + Phaser.Math.Between(-10, 6) }
        : { x: Phaser.Math.Clamp(this.rx + Phaser.Math.Between(-95, 95), 12, CFG.W - 12), y: Phaser.Math.Between(50, this.groundY - 8) };
    }
    const k = Math.min(1, dt * 4.5);
    this.tip.x += (this.goal.x - this.tip.x) * k; this.tip.y += (this.goal.y - this.tip.y) * k;
  }

  // the hand's body is about one palm across, sitting just behind the fingertips
  centre() {
    const s = this.cfg.size * 40, a = this.ang;
    return { x: this.tip.x - Math.cos(a) * s * 0.6, y: this.tip.y - Math.sin(a) * s * 0.6 };
  }

  touches(p) {
    const c = this.centre(), r = this.cfg.size * 30;
    return Math.hypot(c.x - p.centerX, c.y - p.centerY) < r;
  }

  // a shield deflecting the hand makes it recoil into the rift
  deflect() {
    if (this.state === 'grasp') { this.state = 'vanish'; this.stateT = 0.6; }
    this.scene.cameras.main.shake(300, 0.01);
    this.scene.game.events.emit('title', 'The hand recoils!');
  }

  draw() {
    const g = this.hg, s = this.cfg.size;
    g.clear();
    if (this.state === 'warn') {                           // the spot flashes red, faster just before it rips
      const u = 1 - this.stateT / this.cfg.warn, on = Math.floor(this.t * (u > 0.7 ? 16 : 8)) % 2 === 0;
      g.fillStyle(0xff2020, on ? 0.12 : 0.04); g.fillRect(-60, -20, CFG.W + 120, CFG.H + 40);
      g.fillStyle(0xff2020, on ? 0.5 : 0.2); g.fillRect(this.rx - 1 - u * 4, 0, 2 + u * 8, CFG.H);
      g.lineStyle(1, 0xff6060, on ? 1 : 0.4); g.strokeRect(this.rx - 14, 0, 28, this.groundY);
    }
    if (this.state === 'cwarn' || this.state === 'cpull' || this.state === 'cdown') return this.drawCrush(g);
    if (this.rift > 0) Hand.rift(g, this.rx, this.rift, this.t, this.groundY * 0.45, 0.3);
    if (this.state === 'grasp' || this.state === 'vanish') {
      const dx = this.tip.x - this.rx, dy = this.tip.y - 14;
      this.ang = Math.atan2(dy, dx || 0.01);
      const wrist = { x: this.tip.x - Math.cos(this.ang) * 24 * s * 1.3, y: this.tip.y - Math.sin(this.ang) * 24 * s * 1.3 };
      g.lineStyle(Math.max(3, 14 * s), 0x3a3a3a, 1); g.lineBetween(this.rx, 6, wrist.x, wrist.y);          // the arm, trailing back to the rift
      g.lineStyle(Math.max(2, 11 * s), 0x9a9a9a, 1); g.lineBetween(this.rx, 6, wrist.x, wrist.y);
      const open = 0.5 + 0.5 * Math.sin(this.t * 7);                                                     // fingers clutching and opening
      g.save(); g.translateCanvas(this.tip.x, this.tip.y); g.rotateCanvas(this.ang);
      Hand.paint(g, 0, 40 * s, this.t, { s, spread: open, c: this.stunT > 0 ? 0x9fd8ff : 0xd2d2d2 });
      g.restore();
    }
  }

  // the black, jagged wound in the sky: centre x, how open it is (0..1), time, how far down it runs, width factor
  static rift(g, cx, u, t, bottom, wide = 1) {
    const n = 14, len = bottom * u, pts = [];
    for (let i = 0; i <= n; i++) {
      const y = -20 + (len + 20) * i / n, bulge = Math.sin(Math.PI * i / n) * (4 + 20 * u) * wide;
      pts.push({ x: cx + Math.sin(i * 1.9 + t * 3) * 4 + (i % 2 ? 1 : -1) * 3, y, w: bulge * (0.6 + 0.4 * Math.sin(i * 2.3 + t * 8) ** 2) });
    }
    g.fillStyle(0xffffff, 0.35 * u); g.fillEllipse(cx, len * 0.5, 70 * u * wide, len + 20);               // light spilling out around it
    g.fillStyle(0x000000, 1);
    g.fillPoints([...pts.map(q => ({ x: q.x - q.w, y: q.y })), ...pts.slice().reverse().map(q => ({ x: q.x + q.w, y: q.y }))], true);
    g.lineStyle(1, 0xffffff, 0.9);
    g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q.x - q.w, q.y) : g.moveTo(q.x - q.w, q.y))); g.strokePath();
    g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q.x + q.w, q.y) : g.moveTo(q.x + q.w, q.y))); g.strokePath();
  }

  // paints a hand reaching to the right, fingertips at tipX and the bottom of the palm at botY
  // o: { s scale, spread 0..1, c fill, sh shade, arm: draw the forearm to armFrom (a world x), ol outline }
  static paint(g, tipX, botY, t, o = {}) {
    const s = o.s || 1, spread = o.spread || 0, c = o.c || 0xd2d2d2, sh = o.sh || 0x8c8c8c, ol = o.ol || 0x3a3a3a;
    const R = (x, y, w, h, col) => { g.fillStyle(col); g.fillRect(Math.round(tipX + x * s), Math.round(botY + y * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))); };
    if (o.arm) {                                                                                          // forearm, trailing back to armFrom
      const x0 = o.armFrom !== undefined ? (o.armFrom - tipX) / s : -130;
      R(x0, -56, -50 - x0, 36, ol); R(x0, -55, -50 - x0, 34, sh); R(x0, -55, -50 - x0, 14, c);
    }
    R(-63, -65, 38, 52, ol); R(-62, -64, 36, 50, c); R(-62, -24, 36, 10, sh);                            // palm
    const len = [26, 29, 27, 22];
    for (let i = 0; i < 4; i++) {                                                                       // fingers, each wiggling out of step
      const dy = Math.sin(t * 6 + i * 1.3) * (1.5 + spread * 2.5) + (i - 1.5) * spread * 6;
      const y = -64 + i * 11 + dy, e = len[i] - spread * 4;
      R(-26, y - 1, e + 1, 10, ol); R(-26, y, e, 8, c); R(-26, y + 5, e, 3, sh);
      R(-26 + e - 8, y + 5, 8, 7, ol); R(-26 + e - 7, y + 5, 6, 5, sh);                               // the curled tip
    }
    R(-52, -15, 26, 10, ol); R(-51, -14, 24, 8, c); R(-34, -12, 8, 6, sh);                              // thumb
  }
}
