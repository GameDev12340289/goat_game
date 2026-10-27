// GameScene: room 230's cutscene (room config: handScene: { triggerX }). When you reach the end of the road the controls lock,
// the goat looks back and the sky behind it tears apart. A colourless hand reaches out of the rift toward you, then the
// chase begins in room 231 (levels/hand.js, Hand.js).
Object.assign(GameScene.prototype, {
  startHandScene() {
    const p = this.player;
    p.vx = 0; p.vy = 0; p.remX = 0; p.remY = 0; p.dashTimer = 0;
    this.brickStunT = 0;
    const g = this.add.graphics().setDepth(15);
    this.roomObjs.push(g);
    this.handScene = { t: 0, g, phase: 'tear', riftX: 52 };
    this.cameras.main.shake(2000, 0.004);
    this.showTitle('Behind you, the sky tears apart...');
  },

  updateHandScene(dt) {
    const h = this.handScene, p = this.player, g = h.g, cam = this.cameras.main;
    h.t += dt; this.time_ += dt;
    const TEAR = 2.4, REACH = 3.2, END = TEAR + REACH + 0.9;
    if (h.t > 0.9) p.facing = -1;                                      // the goat turns to look
    g.clear();

    // the rift: a jagged black wound running down from the top of the sky, widening, with a glaring white edge
    const u = Math.min(1, h.t / TEAR);
    Hand.rift(g, h.riftX, u, h.t, 90, 0.5);
    if (h.phase === 'tear' && Math.random() < dt * 14) cam.flash(60, 255, 255, 255);              // the sky flickers as it rips

    if (h.t >= TEAR && h.phase === 'tear') {
      h.phase = 'reach';
      cam.shake(REACH * 1000, 0.008);
      this.showTitle('A colourless hand');
    }
    if (h.phase === 'reach' || h.phase === 'end') {                                               // the hand stretches out of the rift
      const r = Math.min(1, (h.t - TEAR) / REACH), e = r * r * (3 - 2 * r);
      const tipX = h.riftX + 20 + (p.x - h.riftX - 34) * e;
      Hand.paint(g, tipX, 78 - 2 * Math.sin(h.t * 5), h.t, { s: 0.6, spread: 0.6 + 0.4 * Math.sin(h.t * 4), arm: true, armFrom: h.riftX, c: 0xd8d8d8, sh: 0x8c8c8c });
      if (h.phase === 'reach' && r >= 1) {
        h.phase = 'end';
        cam.flash(250, 255, 255, 255);
        this.showTitle('RUN');
      }
    }
    if (h.t >= END) {
      this.handScene = null; this.handDone = true;
      cam.shakeEffect.reset();
      this.nextRoom();
    }
    p.sync();
    this.updateHud();
  },
});
