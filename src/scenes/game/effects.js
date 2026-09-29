// GameScene: visual effects - dash ghosts, particle bursts and the falling snow.
Object.assign(GameScene.prototype, {
  spawnGhost(p) {
    const gh = this.add.image(p.x, p.y, 'player').setOrigin(0).setFlipX(p.facing < 0)
      .setTint(p.dashes > 0 ? 0xe8443c : 0x4fc3f7).setAlpha(0.6).setDepth(9);
    this.tweens.add({ targets: gh, alpha: 0, duration: 250, onComplete: () => gh.destroy() });
  },

  burst(x, y, tint, count, speed = 80) {
    const e = this.add.particles(x, y, 'pixel', {
      speed: { min: speed * 0.4, max: speed }, lifespan: 450, scale: { start: 1, end: 0 },
      tint, quantity: 0, emitting: false,
    }).setDepth(20);
    e.explode(count);
    this.time.delayedCall(600, () => e.destroy());
  },

  burstAtPlayer(tint, count, speed) {
    this.burst(this.player.centerX, this.player.centerY, tint, count, speed);
  },

  makeSnow() {
    this.add.particles(0, 0, 'pixel', {
      x: { min: 0, max: CFG.W + 40 }, y: -4, lifespan: 9000, frequency: 140,
      speedY: { min: 14, max: 28 }, speedX: { min: -14, max: -4 },
      alpha: { min: 0.2, max: 0.6 }, scale: 0.5,
    }).setDepth(2);
  },
});
