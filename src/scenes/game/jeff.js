// GameScene: Jeff the merchant. He takes goat horns (and Withered bones for the VIP tier), runs the stall in the
// Merchant's room and pops up after a boss-chase finale. V talks to him, which opens JeffScene.
Object.assign(GameScene.prototype, {
  // stall: false for his surprise mid-run cameos - he hasn't had time to set up shop, he's just there
  spawnJeff(x, { auto = false, stall = true } = {}) {
    const ground = this.groundY;
    if (stall) this.drawStall(x, ground);
    const y = stall ? ground - 3 : ground;
    const sprite = this.add.image(x, y, 'jeff').setOrigin(0.5, 1).setDepth(9);
    this.roomObjs.push(sprite);
    this.tweens.add({ targets: sprite, y: y - 2, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.inOut' });   // he floats
    this.burst(x, y - 7, 0x7dffb2, 14, 70);
    this.jeff = { x, sprite, near: false };
    if (auto) this.time.delayedCall(1400, () => { if (this.jeff && !this.transitioning) this.openJeff(); });
    this.time.delayedCall(CFG.JEFF_DESPAWN, () => { if (this.jeff && !this.scene.isPaused()) this.jeffLeaves(); });   // he doesn't wait around forever
  },

  // Jeff's little wooden stall: a counter, a striped awning and a hanging lantern
  drawStall(x, ground) {
    const g = this.add.graphics().setDepth(3);
    this.roomObjs.push(g);
    g.fillStyle(0x5a3a20); g.fillRect(x - 30, ground - 12, 60, 12);            // counter
    g.fillStyle(0x7a5230); g.fillRect(x - 30, ground - 12, 60, 2);
    g.fillStyle(0x3a2412); g.fillRect(x - 28, ground - 40, 2, 28); g.fillRect(x + 26, ground - 40, 2, 28);   // posts
    for (let i = 0; i < 6; i++) { g.fillStyle(i % 2 ? 0xf1f1f1 : 0x3f8f5a); g.fillRect(x - 32 + i * 11, ground - 46, 11, 7); }   // awning
    g.fillStyle(0xffd23f, 0.25); g.fillCircle(x + 20, ground - 32, 9);          // lantern glow
    g.fillStyle(0xffd23f); g.fillRect(x + 19, ground - 35, 3, 4);
    g.fillRect(x - 22, ground - 15, 3, 3); g.fillRect(x - 17, ground - 14, 3, 2);   // coins on the counter
  },

  // greets the player when they walk up to him, and opens the shop on V
  updateJeff() {
    const j = this.jeff;
    if (!j) return;
    const near = Math.abs(this.player.centerX - j.x) < 40;
    if (near && !j.near) this.toast('Jeff: horns and bones. Press V to trade');
    j.near = near;
    if (near && this.pressed(this.keys.talk)) this.openJeff();
  },

  // the chase starts: Jeff wants no part of it
  jeffLeaves() {
    const j = this.jeff;
    if (!j) return;
    this.jeff = null;
    this.burst(j.x, this.groundY - 10, 0x7dffb2, 10, 60);
    this.tweens.add({ targets: j.sprite, alpha: 0, duration: 300, onComplete: () => j.sprite.destroy() });
  },

  openJeff() {
    if (this.scene.isPaused()) return;
    this.player.invuln = Infinity;                 // safe from harm while browsing Jeff's wares
    this.scene.pause();
    this.scene.launch('Jeff');
  },

  // back from Jeff's stall: a short grace period instead of leaving invuln at Infinity forever
  closeJeff() {
    this.player.invuln = CFG.HURT_INVULN;
  },
});
