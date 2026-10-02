// GameScene: the Elder Goat's last room (room config: rescue: { triggerX, landX, edgeX }). The floor ends at a chasm far
// too wide to jump. Once you get within reach of the edge (player x >= triggerX) the Cyclone spins up out of nowhere,
// pins the elder goat in place, flings you across to the far ledge (landX), then turns its last gust on the goat and
// blows it over the edge (edgeX) into the chasm. The Cyclone dies out and the exit opens.
Object.assign(GameScene.prototype, {
  startRescue() {
    const p = this.player, cfg = this.room.rescue;
    const cyc = new Cyclone(this, { startX: p.centerX - 40 }, this.groundY);
    cyc.state = 'rescue'; cyc.fade = 0;
    this.boss.hold();
    p.state = 'rescue'; p.vx = 0; p.vy = 0; p.remX = 0; p.remY = 0; p.dashTimer = 0;
    this.brickStunT = 0;
    this.rescue = {
      phase: 'arrive', t: 0, cyc, ghostT: 0,
      x0: p.x, y0: p.y, landX: cfg.landX, landY: this.floorBelow({ x: cfg.landX + CFG.PW / 2, y: 0 }) - CFG.PH,
      cx0: p.centerX - 40,
    };
    this.cameras.main.shake(500, 0.01);
    this.showTitle('The Cyclone returns!');
  },

  updateRescue(dt) {
    const r = this.rescue, p = this.player, cyc = r.cyc, cfg = this.room.rescue;
    r.t += dt; cyc.t += dt; this.time_ += dt;
    this.boss.update(dt, p);                              // held / blown / falling: it can't hurt you any more

    if (r.phase === 'arrive') {                           // spins up right behind you, swallowing you whole
      const u = Math.min(1, r.t / CFG.RESCUE_ARRIVE);
      cyc.fade = u;
      cyc.x = r.cx0 + (p.centerX - r.cx0) * u;
      p.y = Math.round(r.y0 - 10 * u);                    // lifted off your hooves
      if (u >= 1) { r.phase = 'fling'; r.t = 0; r.y0 = p.y; r.cx0 = cyc.x; }
    } else if (r.phase === 'fling') {                     // hurled across the chasm to the far ledge
      const u = Math.min(1, r.t / CFG.RESCUE_FLING), e = u * u * (3 - 2 * u);
      p.x = Math.round(r.x0 + (r.landX - r.x0) * e);
      p.y = Math.round(r.y0 + (r.landY - r.y0) * e - Math.sin(e * Math.PI) * 70);
      cyc.x = r.cx0 + (cfg.edgeX - 12 - r.cx0) * e;      // drifts back toward the goat as it lets you go
      r.ghostT -= dt;
      if (r.ghostT <= 0) { r.ghostT = 0.04; this.spawnGhost(p); }
      if (u >= 1) {
        r.phase = 'gust'; r.t = 0;
        this.burst(p.centerX, r.landY + CFG.PH, 0xd4d9e6, 12, 80);
        this.boss.blow(cfg.edgeX + 32);
        this.cameras.main.shake(700, 0.014);
        this.showTitle("The Cyclone's last gust!");
      }
    } else if (r.phase === 'gust') {                      // ...turned on the elder goat, shoving it over the edge
      if (Math.random() < 0.6) this.burst(cyc.x + Phaser.Math.Between(-20, 20), this.groundY - Phaser.Math.Between(10, 70), 0xd4d9e6, 2, 120);
      if (this.boss.state === 'fall' && this.boss.fallY > 140) {
        r.phase = 'calm'; r.t = 0;
        this.cameras.main.shakeEffect.reset();
        this.showTitle('The elder goat is gone.');
      }
    } else {                                              // spent, the Cyclone dies out for good
      cyc.fade = Math.max(0, 1 - r.t / CFG.RESCUE_CALM);
      if (cyc.fade <= 0) {
        cyc.state = 'gone';
        this.rescue = null; this.rescueDone = true;
        this.exitLocked = false;
        p.state = 'normal'; p.x = r.landX; p.y = r.landY; p.vx = 0; p.vy = 0;
        this.toast('The way home is open');
      }
    }
    cyc.draw();
    p.facing = 1; p.sync();
    this.updateHud();
  },
});
