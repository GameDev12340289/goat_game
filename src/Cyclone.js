// The Cyclone: a towering tornado that chases the goat from the left through rooms 101-120. Its funnel is a boss attack
// (touching it kills), and it spawns smaller tornadoes of its own:
//  - every 2-5 seconds a small tornado whirls up out of the ground just ahead of you,
//  - (runnerEvery) it spits out little dust devils that race along the floor at you - jump them.
// Touching any of its small tornadoes (GameScene.windTouch): 1st = stunned, 2nd = blown backwards,
// 3rd = flung into the Cyclone, which kills you and restarts the room.
// Room config (levels.js -> boss, with cyclone: true): { speed px/s, startX, firstDelay, minionEvery: [min, max], runnerEvery, finalStand }
// finalStand (room 120 only): after that many seconds the gale drives you into the right-hand corner and the Cyclone closes
// in... and at the last second the wind stops. The Cyclone falls apart, the exit opens and Jeff sets up shop.
// Mini mode (rooms 166-170, the Little Storm): scale / height shrink the funnel (height = px tall, scale = width multiplier);
// minions: false turns its small tornadoes off. ambush (room 170 only): once you pass that x a second mini storm rises at
// the far edge. The first one braces in place, the second flattens into a low whirl and charges you - jump it at the right
// second. It rams the first storm, they collide and a portal opens at the clash. Step in: the next room.
class Cyclone {
  constructor(scene, cfg, groundY) {
    this.scene = scene;
    this.groundY = groundY;
    this.cfg = { speed: 30, startX: -40, firstDelay: 2.5, minionEvery: [2, 5], runnerEvery: 0, finalStand: 0, minions: true, scale: 1, height: 0, ambush: 0, ...cfg };
    this.top = this.cfg.height ? groundY - this.cfg.height : -12;   // y of the top of the funnel
    this.span = this.cfg.height || groundY;                        // the height its width flares over
    this.flash = false;                            // flickers red: the pincer's charging storm warning you
    this.twin = null; this.ambush = null; this.clash = null;
    this.x = this.cfg.startX;                      // centre of the funnel
    this.t = 0; this.state = 'chase'; this.stateT = 0; this.stunT = 0;
    this.fade = 1;                                 // shrinks to 0 as it dies out at the end of room 120
    this.minionT = this.cfg.minions ? this.cfg.firstDelay : Infinity;
    this.runnerT = this.cfg.runnerEvery ? this.cfg.firstDelay + 1.5 : Infinity;
    this.gusts = new Gusts(scene);                 // its small tornadoes and dust devils (Gusts.js); spawned on our timers
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
    const u = Phaser.Math.Clamp((this.groundY - y) / this.span, 0, 1.2);
    return (Cyclone.BASE + (Cyclone.TOP - Cyclone.BASE) * u) * this.cfg.scale * this.fade;
  }
  front(y) { return this.x + this.halfW(y); }
  sway(u) { return Math.sin(this.t * 1.7 + u * 2.4) * (2 + u * 10) * this.cfg.scale; }   // the top sways more than the base

  // is the goat inside the funnel? (a mini storm is short enough that its top is above the goat's head only when it's crouched)
  touches(p) {
    for (const y of [p.y, p.y + CFG.PH - 1]) {
      if (y < this.top) continue;
      const h = this.halfW(y) - (this.cfg.scale < 1 ? 1.5 : 3);   // a little forgiving at the edges
      if (p.x < this.x + h && p.x + CFG.PW > this.x - h) return true;
    }
    return false;
  }

  // returns true if the player touched the funnel itself
  update(dt, p) {
    this.t += dt;
    const stunned = this.stunT > 0;
    if (stunned) this.stunT -= dt;
    else this.step(dt, p);
    this.gusts.update(dt, p, stunned);
    this.draw();
    if (this.twin) this.twin.draw();

    if (this.scene.fling) return false;
    if (this.state === 'chase') return this.touches(p);
    if (this.state === 'brace') return this.touches(p) || (this.twin.fade > 0.6 && this.twin.touches(p));
    return false;
  }

  // ---- behaviour --------------------------------------------------------------
  step(dt, p) {
    const cam = this.scene.cameras.main;
    if (this.state === 'chase') {
      this.x += this.cfg.speed * dt;
      this.minionT -= dt;
      if (this.minionT <= 0) this.minionT = this.gusts.spawnMinion(p, this.front(this.groundY) + 24) ? Phaser.Math.FloatBetween(...this.cfg.minionEvery) : 0.3;
      this.runnerT -= dt;
      if (this.runnerT <= 0) { this.gusts.spawnRunner(this.front(this.groundY) + 4, this.groundY); this.runnerT = this.cfg.runnerEvery * (0.8 + Math.random() * 0.4); }
      if (this.cfg.finalStand && this.t >= this.cfg.finalStand) this.startCorner();
      if (this.cfg.ambush && p.state !== 'dead' && p.x >= this.cfg.ambush) this.startAmbush();
    } else if (this.state === 'brace') {
      this.stepAmbush(dt, p);
    } else if (this.state === 'clash') {
      this.stepClash(dt, p);
    } else if (this.state === 'portal') {
      const c = this.clash;
      if (p.state !== 'dead' && !this.scene.transitioning && this.scene.overlapsPlayer(c.x - 7, this.groundY - 30, 14, 30)) {
        this.state = 'entered';
        this.scene.game.events.emit('title', 'The portal pulls you in...');
        this.scene.nextRoom();
      }
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
    this.gusts.clear();
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

  // ---- the pincer (room 170) ----------------------------------------------------
  // you've run far enough: this storm braces in place and a second one rises at the far edge, closing off the room
  startAmbush() {
    this.state = 'brace'; this.noDeflect = true;     // no shield or Odin tricks against this one
    this.gusts.clear();
    const tw = this.twin = new Cyclone(this.scene, { ...this.cfg, ambush: 0, minions: false, startX: CFG.W + Cyclone.TWIN_X }, this.groundY);
    tw.state = 'twin'; tw.fade = 0;
    this.ambush = { phase: 'enter', t: 0 };
    this.scene.cameras.main.shake(500, 0.01);
    this.scene.game.events.emit('title', 'Another storm rises - you are trapped between them!');
  }

  stepAmbush(dt, p) {
    const a = this.ambush, tw = this.twin, cam = this.scene.cameras.main;
    a.t += dt; tw.t += dt;
    if (a.phase !== 'rush' && p.state !== 'dead') {  // it rises right where you stand: the wind sweeps you out in front of it
      const edge = tw.x - Math.max(tw.halfW(p.y), tw.halfW(p.y + CFG.PH - 1)) - CFG.PW - 1;
      if (p.x > edge) p.moveX(edge - p.x);
    }
    if (a.phase === 'enter') {                       // fades in at the far edge and slides in
      const k = Math.min(1, a.t / Cyclone.TWIN_ENTER);
      tw.fade = k; tw.x = CFG.W + Cyclone.TWIN_X - (Cyclone.TWIN_X + Cyclone.TWIN_STOP) * k;
      if (k >= 1) { a.phase = 'warn'; a.t = 0; }
    } else if (a.phase === 'warn') {                 // flickers red, then flattens into a low whirl: it's about to charge
      tw.flash = true;
      cam.shake(60, 0.004);
      const k = Math.max(0, (a.t - (Cyclone.TWIN_WARN - Cyclone.TWIN_CROUCH)) / Cyclone.TWIN_CROUCH);
      tw.setHeight(Phaser.Math.Linear(this.cfg.height, Cyclone.TWIN_LOW, k));
      if (a.t >= Cyclone.TWIN_WARN) {
        a.phase = 'rush'; a.t = 0;
        cam.shake(300, 0.012);
        this.scene.game.events.emit('title', 'JUMP!');
      }
    } else {                                         // charges along the floor at you and into the other storm
      tw.x -= Cyclone.TWIN_SPEED * dt;
      if (Math.random() < 0.8) this.scene.burst(tw.x + tw.halfW(this.groundY) + 4, this.groundY - 2, 0xdfe6f0, 2, 60);
      const y = this.groundY - 6;
      if (tw.x - tw.halfW(y) <= this.front(y)) this.startClash();
    }
  }

  // the two storms hit each other: they unwind into a swirling portal where they met
  startClash() {
    const y = this.groundY - 6, tw = this.twin;
    this.state = 'clash'; this.flash = false; tw.flash = false;
    this.clash = { t: 0, x: Math.round((this.front(y) + tw.x - tw.halfW(y)) / 2) };
    this.scene.burst(this.clash.x, this.groundY - 14, 0xffffff, 30, 170);
    this.scene.cameras.main.shake(900, 0.02);
    this.scene.game.events.emit('title', 'The storms collide!');
  }

  stepClash(dt) {
    const c = this.clash, tw = this.twin, k = Math.min(1, (c.t += dt) / Cyclone.CLASH_TIME);
    this.fade = tw.fade = 1 - k;                     // both storms are torn apart...
    const pull = Math.min(1, dt * 3);
    this.x += (c.x - this.x) * pull; tw.x += (c.x - tw.x) * pull;
    if (Math.random() < 0.7) this.scene.burst(c.x + Phaser.Math.Between(-12, 12), this.groundY - Phaser.Math.Between(4, 36), 0xbfa8ff, 2, 90);
    if (k >= 1) {
      this.state = 'portal';
      this.scene.cameras.main.shakeEffect.reset();
      this.scene.game.events.emit('title', 'A portal opens!');
    }
  }

  // squashes the funnel to h px tall (the charging storm drops low enough to jump)
  setHeight(h) { this.top = this.groundY - h; }

  // the shield bounced it back: the Cyclone staggers and you're pushed out in front of the funnel
  deflect(p) {
    this.stunT = CFG.BOSS_STUN;
    const f = Math.ceil(this.front(p.y)) + 3;
    if (p.x < f && !this.scene.solidBox(f, p.y, CFG.PW, CFG.PH)) p.x = f;
    this.scene.cameras.main.shake(300, 0.01);
    this.scene.game.events.emit('title', 'The Cyclone staggers!');
  }

  // ---- drawing ----------------------------------------------------------------
  draw() {
    const g = this.gfx;
    g.clear();
    if (this.state === 'gone') return;
    const top = this.top, bottom = this.groundY, N = this.cfg.height ? 12 : 22, bandH = (bottom - top) / N, a0 = this.fade;
    const sc = this.cfg.scale, stun = this.stunT > 0;
    const shades = stun ? [0x9fd8ff, 0xd8f4ff, 0x7fb8e8]
      : this.flash ? (Math.floor(this.t * 14) % 2 ? [0xd8483c, 0xff8a7a, 0xa8342c] : [0xe8ecf4, 0xff6a5a, 0xc8d0e0])
      : [0x6e7688, 0x8a92a6, 0x5a6172];

    g.fillStyle(0x8a7a66, 0.5 * a0);                                              // dust kicked up around the base
    g.fillEllipse(this.x + this.sway(0), bottom - 2, (Cyclone.BASE * 2 + 26) * sc * a0, 10 * sc * a0);

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

    if (this.clash) this.drawPortal(g);
  }

  // the portal that opens where the two storms collided: a glowing ring of swirling light, standing on the floor
  drawPortal(g) {
    const open = this.state === 'clash' ? this.clash.t / Cyclone.CLASH_TIME : 1;
    if (open <= 0) return;
    const e = open * open * (3 - 2 * open), cx = this.clash.x, cy = this.groundY - 15, rx = 10 * e, ry = 17 * e, t = this.t;
    g.fillStyle(0x6a4ad8, 0.3 * e); g.fillEllipse(cx, cy, rx * 2 + 10, ry * 2 + 10);                // glow
    g.fillStyle(0x9a7aff, 0.9); g.fillEllipse(cx, cy, rx * 2, ry * 2);
    g.fillStyle(0xe8d8ff, 0.95); g.fillEllipse(cx, cy, rx * 1.4, ry * 1.4);
    g.fillStyle(0x1a0e3a, 1); g.fillEllipse(cx, cy, rx * 0.8, ry * 0.8);
    for (let i = 0; i < 10; i++) {                                                                  // light spiralling into it
      const a = t * 3 + i * 0.63, r = 1 - ((t * 0.9 + i * 0.1) % 1);
      g.fillStyle(i % 2 ? 0xffffff : 0xbfa8ff, 0.9 * e);
      g.fillRect(Math.round(cx + Math.cos(a) * (rx + 7) * r), Math.round(cy + Math.sin(a) * (ry + 7) * r), 2, 2);
    }
  }
}

Cyclone.BASE = 12; Cyclone.TOP = 64;      // half-width of the funnel at the ground / at the top of the screen
Cyclone.WIND = 140;                        // room 120's gale, px/s (faster than you can run)
Cyclone.CORNER_SPEED = 60; Cyclone.GAP = 6; Cyclone.HOLD_TIME = 0.8; Cyclone.CALM_TIME = 2;
// the pincer: the 2nd storm fades in at the far edge (TWIN_X px past it, sliding in to TWIN_STOP px from it) for TWIN_ENTER s, flickers for TWIN_WARN s (flattening
// to TWIN_LOW px tall over the last TWIN_CROUCH s - low enough to jump), then charges at TWIN_SPEED px/s. CLASH_TIME: portal opens.
Cyclone.TWIN_X = 8; Cyclone.TWIN_STOP = 28; Cyclone.TWIN_ENTER = 1; Cyclone.TWIN_WARN = 1.5; Cyclone.TWIN_CROUCH = 0.5;
Cyclone.TWIN_LOW = 10; Cyclone.TWIN_SPEED = 150; Cyclone.CLASH_TIME = 1.6;
