const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: CFG.W * CFG.ZOOM,
  height: CFG.H * CFG.ZOOM,
  backgroundColor: '#0e1428',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, MenuScene, ShopScene, GameScene, UIScene, JeffScene],
});

