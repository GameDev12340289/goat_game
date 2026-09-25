// HUD overlay. Runs at the full canvas resolution (CFG.ZOOM x the world), so text stays crisp.
// GameScene talks to it through game.events: 'hud', 'title', 'complete', 'toast'.
class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }

  create() {
    const Z = CFG.ZOOM;
    const style = (size, extra = {}) => ({
      fontFamily: '"Courier New", monospace', fontSize: `${size * Z}px`, fontStyle: 'bold',
      color: '#ffffff', stroke: '#0e1428', strokeThickness: Z, ...extra,
    });
    this.hud = this.add.text(4 * Z, 2 * Z, '', style(8));
    this.title = this.add.text(CFG.W * Z / 2, 60 * Z, '', style(10)).setOrigin(0.5).setAlpha(0);
    this.toast = this.add.text(CFG.W * Z / 2, 24 * Z, '', style(9, { color: '#ffd23f' })).setOrigin(0.5).setAlpha(0);
    this.complete = this.add.text(CFG.W * Z / 2, CFG.H * Z / 2, '', style(10, { align: 'center' }))
      .setOrigin(0.5);

    this.pauseDim = this.add.rectangle(0, 0, CFG.W * Z, CFG.H * Z, 0x05060d, 0.6).setOrigin(0).setDepth(50);
    this.pauseText = this.add.text(CFG.W * Z / 2, CFG.H * Z / 2 - 8 * Z, 'GAME PAUSED', style(20)).setOrigin(0.5).setDepth(51);
    this.pauseHint = this.add.text(CFG.W * Z / 2, CFG.H * Z / 2 + 12 * Z, 'ESC  resume     M  menu', style(8, { color: '#9fb0d8' })).setOrigin(0.5).setDepth(51);
    const showPause = on => [this.pauseDim, this.pauseText, this.pauseHint].forEach(o => o.setVisible(on));
    showPause(false);

    const fade = (obj, delay) => {
      this.tweens.killTweensOf(obj);
      obj.setAlpha(1);
      this.tweens.add({ targets: obj, alpha: 0, delay, duration: 500 });
    };
    const handlers = {
      hud: t => this.hud.setText(t),
      complete: t => this.complete.setText(t),
      pause: on => showPause(on),
      title: t => { this.title.setText(t); fade(this.title, 1200); },
      toast: t => { this.toast.setText(t); fade(this.toast, 1000); },
    };
    const ev = this.game.events;
    for (const [k, fn] of Object.entries(handlers)) ev.on(k, fn);
    // this scene is stopped when returning to the menu; drop the listeners so they don't stack up
    this.events.once('shutdown', () => { for (const [k, fn] of Object.entries(handlers)) ev.off(k, fn); });
  }
}
