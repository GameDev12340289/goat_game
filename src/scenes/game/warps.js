// GameScene: distortion spots (tile 'X', rooms 221-225). A dark knot of warped space with rings, glitch bars and shards
// around it. The closer you get the worse the space around it twists and the harder it drags you in; touching the core
// makes the screen implode into it and kills you.
Object.assign(GameScene.prototype, {
  addWarp(px, py) {
    const w = { x: px + 4, y: py + 4, t: px * 0.37, near: 0, imp: 0, hit: false, g: this.add.graphics().setDepth(8) };
    this.roomObjs.push(w.g);
    this.warps.push(w);
    this.drawWarp(w);
  },

  // k: how disturbed it is - grows as you approach (w.near). w.imp (0 -> 1) is the implosion after a touch: the rings start
  // out huge and the whole thing collapses into the core
  drawWarp(w) {
    const g = w.g;
    if (!g.scene) return;                                                   // already destroyed with its room
    const hit = w.hit, f = hit ? 6 * (1 - w.imp) ** 1.5 + 0.05 : 1;
    const t = w.t, k = hit ? 1 : w.near, R = (14 + 12 * w.near) * f;
    g.clear();
    for (let ring = 0; ring < 3; ring++) {                                  // wobbling rings, stretched and flickering
      const r0 = R * (0.4 + ring * 0.3), amp = (1.2 + 4 * k) * (hit ? 1 + 2 * (1 - w.imp) : 1);
      g.lineStyle(1, ring % 2 ? 0xffffff : 0xa070ff, 0.35 + 0.3 * k - ring * 0.07);
      g.beginPath();
      for (let i = 0; i <= 28; i++) {
        const a = i / 28 * Math.PI * 2;
        const r = r0 + Math.sin(a * (3 + ring) + t * (3 + ring * 1.3)) * amp + Math.sin(a * 7 - t * 5) * amp * 0.4;
        const x = w.x + Math.cos(a) * r * (1 + 0.3 * Math.sin(t * 2 + ring)), y = w.y + Math.sin(a) * r;
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.strokePath();
    }
    const bars = 3 + Math.round(8 * k);                                     // glitch bars shearing off the spot
    for (let j = 0; j < bars; j++) {
      const s = Math.sin(t * 9 + j * 12.9898) * 43758.5453, u = s - Math.floor(s);
      g.fillStyle(j % 2 ? 0xffffff : 0x000000, 0.3 + 0.3 * k);
      g.fillRect(w.x - R * 0.9 + u * R * 0.9, w.y + (j / bars - 0.5) * R * 1.6, 6 + u * (10 + 30 * k), 1 + (j % 2));
    }
    for (let j = 0; j < 4 + Math.round(6 * k); j++) {                       // shards drifting out of the core
      const a = j * 2.4 + t * 0.7, d = 6 + ((t * 14 + j * 9) % (R * 0.9 + 1));
      const x = w.x + Math.cos(a) * d, y = w.y + Math.sin(a) * d * 0.8;
      g.fillStyle(j % 2 ? 0xc9a8ff : 0x2a1646, 0.7);
      g.fillTriangle(x, y - 2 - k * 2, x + 1.5, y + 1, x - 2 - k * 3, y + 2);
    }
    g.fillStyle(0x08040f); g.fillCircle(w.x, w.y, 3.4 + Math.sin(t * 6) * 0.7 + 6 * w.imp);   // the core
    g.lineStyle(1, 0xff5adf, 0.9); g.strokeCircle(w.x, w.y, 4 + Math.sin(t * 6) * 0.7 + 6 * w.imp);
    const v = w.veil;                                                       // the screen closing in on the core
    if (v && v.scene) {
      const hole = 260 * (1 - w.imp) ** 2;
      v.clear();
      v.lineStyle(900, 0x000000, 1); v.strokeCircle(w.x, w.y, hole + 450);
      v.lineStyle(3, 0xff5adf, 0.8 * (1 - w.imp)); v.strokeCircle(w.x, w.y, hole);
    }
  },

  // returns true if a spot killed the player. Within PULL px a spot drags you towards it (harder the closer you are, but a
  // full-speed run away from it still wins until you're nearly on top of it)
  updateWarps(dt) {
    const p = this.player, PULL = this.room.warpPull || 46;
    for (const w of this.warps) {
      w.t += dt;
      const dx = w.x - p.centerX, dy = w.y - p.centerY, d = Math.hypot(dx, dy);
      w.near += (Phaser.Math.Clamp(1 - d / 36, 0, 1) - w.near) * Math.min(1, dt * 8);
      if (d < PULL && d > 1 && p.state !== 'dead') {
        const speed = 85 * (1 - d / PULL) ** 1.3 * dt;
        p.moveX(dx / d * speed); p.moveY(dy / d * speed * 0.6);              // (through the usual collision, so walls still hold)
      }
      this.drawWarp(w);
      if (!w.hit && this.overlapsPlayer(w.x - 2.5, w.y - 2.5, 5) && this.warpKill(w)) return true;
    }
    return false;
  },

  // touching a spot: the screen implodes into it (the view zooms and pinches in, the rings collapse and a black iris closes
  // on the core) and the goat doesn't survive it
  warpKill(w) {
    if (this.invincible || this.graceT > 0) return false;
    w.hit = true;
    const cam = this.cameras.main, T = 480;
    w.veil = this.add.graphics().setDepth(40);
    this.roomObjs.push(w.veil);
    cam.shake(T, 0.008);
    cam.pan(w.x, w.y, T, 'Cubic.easeIn', true);                     // (camera effects take the long ease names)
    cam.zoomTo(cam.zoom * 2.6, T, 'Cubic.easeIn', true);
    this.tearTweens.push(this.tweens.add({ targets: w, imp: 1, t: w.t + 2, duration: T, ease: 'Cubic.easeIn', onUpdate: () => this.drawWarp(w) }));
    if (cam.postFX) {
      const lens = cam.postFX.addBarrel(1);
      this.tearTweens.push(this.tweens.add({ targets: lens, amount: 0.3, duration: T, ease: 'Cubic.easeIn' }));
    }
    this.killPlayer();
    return true;
  },
});
