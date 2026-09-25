// Generates every texture procedurally so the project needs no asset files.
// Swap these for real sprites (this.load.image / spritesheet) when you have art.
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    const g = this.make.graphics({ add: false });
    const tex = (key, w, h, draw) => {
      g.clear(); draw(g); g.generateTexture(key, w, h);
    };

    tex('pixel', 2, 2, g => { g.fillStyle(0xffffff); g.fillRect(0, 0, 2, 2); });

    // goat body, facing right (the horn sprite is drawn on top and tinted red/blue by dash state)
    tex('player', 8, 11, g => {
      g.fillStyle(0xeee8dc); g.fillRect(0, 5, 6, 3);          // body
      g.fillRect(0, 8, 2, 2); g.fillRect(4, 8, 2, 2);         // legs
      g.fillRect(4, 2, 4, 4);                                 // head
      g.fillStyle(0xcfc6b4); g.fillRect(1, 7, 4, 1);          // belly shade
      g.fillRect(0, 4, 1, 1);                                 // tail
      g.fillStyle(0xa89c88); g.fillRect(3, 3, 1, 2);          // ear
      g.fillRect(6, 6, 1, 2);                                 // beard
      g.fillStyle(0x3b2a2a); g.fillRect(0, 10, 2, 1); g.fillRect(4, 10, 2, 1); // hooves
      g.fillStyle(0x1a1a2e); g.fillRect(6, 3, 1, 1);          // eye
      g.fillStyle(0xd99a9a); g.fillRect(7, 5, 1, 1);          // nose
    });
    tex('hair', 8, 5, g => {                                  // horns (drawn at y - 1)
      g.fillStyle(0xffffff);
      g.fillRect(5, 2, 2, 1); g.fillRect(4, 1, 2, 1); g.fillRect(2, 0, 3, 1); g.fillRect(2, 1, 1, 1);
    });

    // The Withered: a tall, eyeless human with charcoal black skin and a dim ember of a heart in the chest (drawn 14x56, shown 2x).
    // Its 22 long arms are drawn live by Withered.js, so only the raised pair for the desperate move is part of the texture.
    const withered = raised => g => {
      const skin = 0x1b1b21, rib = 0x2d2d36, cloth = 0x101015;
      g.fillStyle(skin);
      g.fillRect(5, 1, 5, 7);                                   // head
      g.fillRect(6, 8, 3, 2);                                   // neck
      g.fillRect(3, 10, 9, 18);                                 // torso
      g.fillRect(4, 28, 3, 26); g.fillRect(8, 28, 3, 26);       // legs
      g.fillRect(3, 54, 4, 2); g.fillRect(8, 54, 4, 2);         // feet
      if (raised) {
        g.fillRect(0, 0, 2, 11); g.fillRect(13, 0, 2, 11); g.fillRect(1, 10, 3, 2); g.fillRect(11, 10, 3, 2);
      }
      g.fillStyle(rib);
      g.fillRect(4, 13, 7, 1); g.fillRect(4, 17, 7, 1); g.fillRect(4, 21, 7, 1); g.fillRect(6, 10, 1, 3);
      g.fillStyle(cloth); g.fillRect(3, 27, 9, 5);              // tattered rags
      g.fillStyle(0x7a1c1c); g.fillRect(8, 14, 2, 2);           // the heart
    };
    tex('withered', 16, 56, withered(false));
    tex('witheredRaised', 16, 56, withered(true));

    // Jeff the merchant: a floating, mustachioed trader in a black hoodie (14x20)
    tex('jeff', 14, 20, g => {
      g.fillStyle(0x1c1c22);
      g.fillRect(5, 0, 4, 2);                                                       // hood peak
      g.fillRect(3, 2, 8, 3);                                                       // hood
      g.fillRect(3, 5, 1, 4); g.fillRect(10, 5, 1, 4);                              // hood sides framing the face
      g.fillRect(2, 10, 10, 8);                                                     // hoodie body, unbroken from the hood
      g.fillStyle(0xf1d7b0); g.fillRect(4, 5, 6, 5);                                // face
      g.fillStyle(0x222222); g.fillRect(5, 6, 1, 1); g.fillRect(8, 6, 1, 1);        // eyes
      g.fillStyle(0x5a3a20); g.fillRect(4, 8, 6, 1); g.fillRect(3, 9, 1, 1); g.fillRect(10, 9, 1, 1);   // mustache
      g.fillStyle(0x101014); g.fillRect(2, 14, 10, 1);                              // torso fold shading
      g.fillStyle(0xd8d8dc); g.fillRect(6, 11, 1, 3); g.fillRect(8, 11, 1, 3);      // drawstrings
      g.fillStyle(0x8a5a30); g.fillRect(9, 12, 4, 4);                               // satchel
      g.fillStyle(0xffd23f); g.fillRect(10, 13, 2, 2);                              // a coin peeking out
      g.fillStyle(0x2a2a35); g.fillRect(3, 18, 3, 2); g.fillRect(8, 18, 3, 2);      // boots
    });

    // the Withered bones: a skull over a crossed pair of bones
    tex('bones', 12, 8, g => {
      g.fillStyle(0xe9e6d2);
      g.fillRect(1, 5, 10, 2); g.fillRect(0, 4, 2, 2); g.fillRect(0, 6, 2, 2); g.fillRect(10, 4, 2, 2); g.fillRect(10, 6, 2, 2);
      g.fillRect(4, 0, 4, 4);
      g.fillStyle(0x2a2a30); g.fillRect(5, 1, 1, 1); g.fillRect(7, 1, 1, 1);
    });

    // floor spike that shoots up as a floor-to-ceiling pillar, then retracts
    tex('popspike', 8, CFG.H, g => {
      g.fillStyle(0xc8d0f0); g.fillRect(1, 6, 6, CFG.H - 6);                   // shaft
      g.fillStyle(0x8890b8); g.fillRect(3, 8, 2, CFG.H - 8);
      g.fillStyle(0xe8ecff);
      for (let y = 12; y < CFG.H; y += 8) {                                    // side barbs
        g.fillTriangle(1, y, 0, y + 3, 1, y + 4); g.fillTriangle(7, y, 8, y + 3, 7, y + 4);
      }
      g.fillTriangle(0, 8, 2, 0, 4, 8); g.fillTriangle(4, 8, 6, 0, 8, 8);    // tips
      g.fillStyle(0xe8443c); g.fillRect(2, 0, 1, 1); g.fillRect(6, 0, 1, 1);
    });

    tex('crystal', 8, 8, g => {
      g.fillStyle(0x7dffb2);
      g.fillTriangle(4, 0, 8, 4, 4, 8); g.fillTriangle(4, 0, 0, 4, 4, 8);
      g.fillStyle(0xffffff); g.fillRect(3, 2, 1, 2);
    });
    tex('coin', 8, 8, g => {
      g.fillStyle(0xc8901a); g.fillRect(2, 0, 4, 8); g.fillRect(1, 1, 6, 6); g.fillRect(0, 2, 8, 4); // rim
      g.fillStyle(0xffd23f); g.fillRect(2, 1, 4, 6); g.fillRect(1, 2, 6, 4);                         // face
      g.fillStyle(0xc8901a); g.fillRect(3, 2, 2, 4);                                                 // stamp
      g.fillStyle(0xfff4b0); g.fillRect(2, 2, 1, 1);                                                 // shine
    });

    // giant boss goat (facing right, 48x48, shown at 2x). Second frame has the mouth open to scream.
    const drawBoss = (g, open) => {
      g.fillStyle(0xe8e2d4); g.fillRect(4, 18, 28, 18);                   // body
      g.fillStyle(0xc9c0ac); g.fillRect(4, 30, 28, 6); g.fillRect(8, 20, 4, 3); g.fillRect(18, 22, 5, 3);
      g.fillRect(0, 18, 5, 4);                                             // tail
      g.fillStyle(0xd6cfbe);
      for (const lx of [5, 13, 21, 29]) g.fillRect(lx, 36, 6, 8);          // legs
      g.fillStyle(0x2a1f1f);
      for (const lx of [5, 13, 21, 29]) g.fillRect(lx, 44, 6, 4);          // hooves
      g.fillStyle(0xe8e2d4); g.fillRect(28, 12, 10, 22); g.fillRect(32, 10, 14, 12); // neck + head
      g.fillStyle(0x8c7a56);
      g.fillTriangle(32, 11, 22, 1, 37, 11); g.fillTriangle(38, 11, 35, 0, 44, 11);   // horns
      g.fillStyle(0xb8a880); g.fillTriangle(22, 1, 25, 1, 27, 6);
      g.fillStyle(0xb0a48c); g.fillRect(31, 14, 3, 2);                     // ear
      g.fillStyle(0xff2a2a); g.fillRect(38, 14, 3, 2);                     // eye
      g.fillStyle(0xffb0b0); g.fillRect(39, 14, 1, 1);
      if (!open) {
        g.fillStyle(0xe8e2d4); g.fillRect(40, 14, 8, 8);                   // snout
        g.fillStyle(0x8a7f6a); g.fillRect(40, 20, 8, 1); g.fillRect(46, 16, 1, 1);
        g.fillStyle(0xb0a48c); g.fillRect(44, 22, 3, 8);                   // beard
      } else {
        g.fillStyle(0xe8e2d4); g.fillRect(40, 12, 8, 4);                   // upper jaw
        g.fillStyle(0x3a0010); g.fillRect(37, 16, 11, 8);                  // mouth
        g.fillStyle(0xe8e2d4); g.fillRect(37, 24, 11, 4);                  // dropped jaw
        g.fillStyle(0xffffff);
        g.fillRect(41, 16, 1, 2); g.fillRect(45, 16, 1, 2); g.fillRect(41, 22, 1, 2); g.fillRect(45, 22, 1, 2);
        g.fillStyle(0xb0a48c); g.fillRect(44, 28, 3, 8);                   // beard
      }
    };
    tex('boss', 48, 48, g => drawBoss(g, false));
    tex('bossScream', 48, 48, g => drawBoss(g, true));

    // goat horn: the shop currency
    tex('horn', 8, 8, g => {
      g.fillStyle(0xb89a5a); g.fillRect(0, 5, 4, 3); g.fillRect(1, 3, 4, 3); g.fillRect(3, 1, 3, 3);
      g.fillStyle(0xf3e9c9); g.fillRect(1, 5, 3, 2); g.fillRect(2, 3, 3, 2); g.fillRect(4, 1, 2, 2);
      g.fillStyle(0xffffff); g.fillRect(5, 0, 2, 1); g.fillRect(2, 5, 1, 1);
    });

    g.destroy();
    this.scene.start('Menu');
  }
}
