// Shared backdrop for the menu + shop: night mountains, the goat, the giant boss goat, snow.
function drawMenuBackdrop(scene) {
  const Z = CFG.ZOOM, W = CFG.W * Z, H = CFG.H * Z;
  scene.cameras.main.setBackgroundColor(0x0b1022);
  const bg = scene.add.graphics();
  bg.fillStyle(0x141c3a);
  bg.fillTriangle(-60, H, 240, 190, 540, H); bg.fillTriangle(300, H, 660, 130, 1020, H);
  bg.fillStyle(0xdff3ff);
  bg.fillTriangle(240, 190, 214, 228, 266, 228); bg.fillTriangle(660, 130, 628, 176, 692, 176);
  scene.add.particles(0, 0, 'pixel', {
    x: { min: 0, max: W + 100 }, y: -8, lifespan: 9000, frequency: 90,
    speedY: { min: 30, max: 70 }, speedX: { min: -40, max: -10 },
    alpha: { min: 0.2, max: 0.7 }, scale: 1.5,
  });
  scene.add.image(90, H + 30, 'boss').setOrigin(0.5, 1).setScale(8).setTint(0x6a7098).setAlpha(0.55);
  const gx = W - 130, gy = H - 40;
  scene.add.image(gx, gy, 'player').setOrigin(0.5, 1).setScale(8);
  scene.add.image(gx, gy - 11 * 8 - 8, 'hair').setOrigin(0.5, 0).setScale(8).setTint(0xe8443c);
}

// the goat shop is paid in coins, so the big counter shows coins
function coinCounter(scene) {
  const Z = CFG.ZOOM, W = CFG.W * Z;
  const icon = scene.add.image(W - 24, 26, 'coin').setOrigin(1, 0.5).setScale(4);
  return scene.add.text(W - 24 - 40, 26, String(Save.data.coins), uiText(28, { color: '#ffd23f' })).setOrigin(1, 0.5);
}

// goat horns are still saved between runs, so they get a counter under the coin count
function stashCounter(scene) {
  const Z = CFG.ZOOM, W = CFG.W * Z;
  return scene.add.text(W - 24, 52, '', uiText(16, { color: '#e9e6d2', align: 'right' })).setOrigin(1, 0);
}
const stashText = () => `goat horns ${Save.data.horns}`;

// Simple vertical menu: subclasses fill this.items with { text: () => string, run: () => void }
class MenuBase extends Phaser.Scene {
  setupMenu(startY, gap, size) {
    this.sel = 0;
    this.labels = this.items.map((it, i) => {
      const t = this.add.text(CFG.W * CFG.ZOOM / 2, startY + i * gap, '', uiText(size)).setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      t.on('pointerover', () => { this.sel = i; this.refresh(); });
      t.on('pointerdown', () => { this.sel = i; this.items[i].run(); });
      return t;
    });
    const kb = this.input.keyboard;
    const on = (names, fn) => names.forEach(n => kb.on('keydown-' + n, fn));
    on(['UP', 'W'], () => this.move(-1));
    on(['DOWN', 'S'], () => this.move(1));
    on(['ENTER', 'SPACE', 'Z', 'C', 'J', 'K'], () => this.items[this.sel].run());
    this.refresh();
  }

  move(d) { this.sel = (this.sel + d + this.items.length) % this.items.length; this.refresh(); }

  refresh() {
    this.labels.forEach((t, i) => {
      t.setText((i === this.sel ? '> ' : '  ') + this.items[i].text() + (i === this.sel ? ' <' : '  '));
      t.setColor(i === this.sel ? '#ffd23f' : '#ffffff');
    });
  }
}

class MenuScene extends MenuBase {
  constructor() { super('Menu'); }

  create() {
    const Z = CFG.ZOOM, W = CFG.W * Z, H = CFG.H * Z;
    drawMenuBackdrop(this);
    this.add.text(W / 2, 96, 'SUMMIT', uiText(92, { color: '#dff3ff' })).setOrigin(0.5);
    this.add.text(W / 2, 168, 'climb the mountains. conquer the galaxy.', uiText(20, { color: '#9fb0d8' })).setOrigin(0.5);
    this.room = 0;
    this.items = [
      { text: () => `PLAY   < ROOM ${this.room + 1} >`, run: () => this.scene.start('Game', { room: this.room }) },
      { text: () => 'GOAT SHOP', run: () => this.scene.start('Shop') },
    ];
    this.setupMenu(250, 64, 34);
    this.roomName = this.add.text(W / 2, 250 + 64 * this.items.length - 8, '', uiText(18, { color: '#9fb0d8' })).setOrigin(0.5);

    const on = (names, fn) => names.forEach(n => this.input.keyboard.on('keydown-' + n, fn));
    // the room picker only listens while PLAY is the highlighted line (hovering it with the mouse highlights it)
    const pick = d => () => { if (this.sel === 0) this.pickRoom(d); };
    on(['LEFT', 'A'], pick(-1));
    on(['RIGHT', 'D'], pick(1));
    on(['HOME'], pick(-999));                                // HOME / END: first / last room in the list
    on(['END'], pick(999));
    on(['Q'], pick(-10));                                    // Q / E jump ten at a time
    on(['E'], pick(10));
    // clicking the < or > in the PLAY line changes the room (anywhere else on the line starts the game)
    const play = this.labels[0];
    play.off('pointerdown');
    play.on('pointerdown', pointer => {
      const s = play.text, cw = play.width / s.length;
      const idx = Math.floor((pointer.x - (play.x - play.width / 2)) / cw);
      const left = s.indexOf('<', s.indexOf('PLAY')), right = s.indexOf('>', left);
      if (left > 0 && Math.abs(idx - left) <= 1) this.pickRoom(-1);
      else if (right > 0 && Math.abs(idx - right) <= 1) this.pickRoom(1);
      else { this.sel = 0; this.items[0].run(); }
    });
    this.pickRoom(0);

    this.add.text(W / 2, H - 22,
      'move: arrows / WASD    jump: C    dash: Shift    grab: W    retry: R    pause: ESC    rampage: Q    shield: F    gamble: G',
      uiText(15, { color: '#9fb0d8' })).setOrigin(0.5);
  }

  // rooms 1-65 are always pickable; room 75, the Stormlands (76-100), the Cyclone (101-120) and the Wreckage (121-150) join the list one at a time as you reach them
  choices() {
    const c = Array.from({ length: 65 }, (_, i) => i);
    if (Save.data.unlocked >= 74) c.push(74);
    for (let i = 75; i < LEVELS.length; i++) if (Save.data.unlocked >= i) c.push(i);
    return c;
  }

  pickRoom(d) {
    const c = this.choices();
    let i = Math.max(0, c.indexOf(this.room));
    if (d === -999) i = 0;
    else if (d === 999) i = c.length - 1;
    else if (d !== 0) i = ((i + d) % c.length + c.length) % c.length;
    this.room = c[i];
    this.roomName.setText(LEVELS[this.room].name);
    this.refresh();
  }
}

class ShopScene extends MenuBase {
  constructor() { super('Shop'); }

  create() {
    const Z = CFG.ZOOM, W = CFG.W * Z, H = CFG.H * Z;
    drawMenuBackdrop(this);
    this.add.text(W / 2, 70, 'GOAT SHOP', uiText(64, { color: '#ffd23f' })).setOrigin(0.5);
    this.coins = coinCounter(this);
    this.stash = stashCounter(this).setText(stashText());
    this.msg = this.add.text(W / 2, H - 50, '', uiText(20, { color: '#ffd23f' })).setOrigin(0.5);
    this.desc = this.add.text(W / 2, H - 125, '', uiText(18, { color: '#ffffff', align: 'center', wordWrap: { width: 760 } })).setOrigin(0.5);

    this.items = UPGRADES.map(u => ({
      up: u,
      text: () => `${u.name.padEnd(25)} ${(Save.has(u.id) ? 'OWNED' : this.lock(u) || this.price(u)).padStart(10)}`,
      run: () => this.buy(u),
    }));
    this.items.push({ text: () => 'BACK', run: () => this.scene.start('Menu') });
    this.setupMenu(132, 42, 24);

    ['ESC', 'BACKSPACE'].forEach(n => this.input.keyboard.on('keydown-' + n, () => this.scene.start('Menu')));
  }

  price(u) { return `${u.cost} coins`; }

  // why an upgrade can't be bought yet ('' if it can)
  lock(u) {
    if (u.requires && !Save.has(u.requires)) return 'LOCKED';
    if (u.trial && !Save.data.chaseTrialDone) return 'TRIAL';
    return '';
  }

  buy(u) {
    const r = Save.buy(u);
    const msgs = {
      ok: `Bought ${u.name}!`, owned: 'You already own that.', poor: `Still need ${Save.missing(u).join(', ')}.`,
      needHide: 'Your hide isnt strong enough....', needTrial: 'Trial: beat the boss chase (rooms 11-19) in 1:30 without dying.',
    };
    this.msg.setText(msgs[r])
      .setColor(r === 'ok' ? '#7dffb2' : '#ff7070');
    this.coins.setText(String(Save.data.coins));
    this.stash.setText(stashText());
    this.refresh();
  }

  refresh() {
    super.refresh();
    const it = this.items[this.sel];
    if (this.desc) this.desc.setText(it && it.up ? it.up.desc : '');
  }
}



// Jeff the merchant (sets up shop in room 120, once the Cyclone dies out): sells armour, items and his VIP tier for goat horns only.
// Runs on top of the paused Game scene. Every ware is laid out on the counter at once, a card each, in three shelves
// (armour / items / VIP): hover a card to read about it, click it to buy. Arrow keys / WASD + ENTER work too.
const JEFF_SHELVES = [
  { kind: 'armour', label: 'ARMOUR', color: 0x4fa3d9 },
  { kind: 'item', label: 'ITEMS', color: 0x7dffb2 },
  { kind: 'vip', label: 'VIP  -  UNDER THE COUNTER', color: 0xffd23f },
];

class JeffScene extends Phaser.Scene {
  constructor() { super('Jeff'); }

  create() {
    const Z = CFG.ZOOM, W = CFG.W * Z, H = CFG.H * Z;
    this.add.rectangle(W / 2, H / 2, W, H, 0x05060d, 0.9);
    this.add.image(64, 250, 'jeff').setOrigin(0.5, 1).setScale(7);
    this.add.text(W / 2 + 60, 30, "JEFF'S WARES", uiText(40, { color: '#7dffb2' })).setOrigin(0.5);
    this.add.image(W - 24, 26, 'horn').setOrigin(1, 0.5).setScale(4);
    this.horns = this.add.text(W - 24 - 40, 26, String(Save.data.horns), uiText(28, { color: '#ffd23f' })).setOrigin(1, 0.5);
    this.msg = this.add.text(W / 2, H - 22, '', uiText(18, { color: '#ffd23f' })).setOrigin(0.5);
    this.desc = this.add.text(W / 2 + 60, H - 78, '', uiText(16, { align: 'center', wordWrap: { width: 760 } })).setOrigin(0.5);

    // one card per ware, laid out in shelves: cards[i] = { u, rowI, colI, box, name, price, x, y }
    const CW = 150, CH = 66, GAP = 10, X0 = 140, SHELF_Y = [86, 196, 306];
    this.cards = [];
    JEFF_SHELVES.forEach((shelf, rowI) => {
      this.add.text(X0, SHELF_Y[rowI] - 16, shelf.label, uiText(14, { color: '#' + shelf.color.toString(16).padStart(6, '0') })).setOrigin(0, 0.5);
      this.add.rectangle(X0 + 190, SHELF_Y[rowI] - 16, 700 - 190 + 40, 1, shelf.color, 0.35).setOrigin(0, 0.5);
      // wares with a jump requirement stay off the counter until you've earned them (the count itself is never shown)
      JEFF_ITEMS.filter(u => u.kind === shelf.kind && (!u.jumps || (Save.data.jumps || 0) >= u.jumps || Save.has(u.id))).forEach((u, colI) => {
        const x = X0 + colI * (CW + GAP), y = SHELF_Y[rowI];
        const box = this.add.rectangle(x, y, CW, CH, 0x141c3a, 1).setOrigin(0).setStrokeStyle(2, 0x2b3a67)
          .setInteractive({ useHandCursor: true });
        this.add.rectangle(x, y, CW, 5, shelf.color, 1).setOrigin(0);
        const name = this.add.text(x + CW / 2, y + 24, u.name, uiText(14, { align: 'center', wordWrap: { width: CW - 12 } })).setOrigin(0.5);
        const price = this.add.text(x + CW / 2, y + 50, '', uiText(15, { color: '#ffd23f' })).setOrigin(0.5);
        const card = { u, rowI, colI, box, name, price, x, y };
        box.on('pointerover', () => this.select(card));
        box.on('pointerdown', () => { this.select(card); this.buy(u); });
        this.cards.push(card);
      });
    });

    this.add.text(W / 2 + 60, H - 46, 'click a ware to buy it   -   ESC / V to leave', uiText(14, { color: '#9fb0d8' })).setOrigin(0.5);
    const leave = this.add.text(W - 24, H - 22, 'LEAVE', uiText(20)).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    leave.on('pointerover', () => leave.setColor('#ffd23f')); leave.on('pointerout', () => leave.setColor('#ffffff'));
    leave.on('pointerdown', () => this.close());

    const kb = this.input.keyboard, on = (names, fn) => names.forEach(n => kb.on('keydown-' + n, fn));
    on(['LEFT', 'A'], () => this.step(-1, 0)); on(['RIGHT', 'D'], () => this.step(1, 0));
    on(['UP', 'W'], () => this.step(0, -1)); on(['DOWN', 'S'], () => this.step(0, 1));
    on(['ENTER', 'SPACE', 'Z', 'C', 'J', 'K'], () => this.buy(this.sel.u));
    on(['ESC', 'BACKSPACE', 'V'], () => this.close());
    this.select(this.cards[0]);
  }

  // keyboard: move to the neighbouring card (the column is kept as far as the next shelf allows)
  step(dc, dr) {
    const { rowI, colI } = this.sel;
    const shelf = r => this.cards.filter(c => c.rowI === r);
    const r = Phaser.Math.Clamp(rowI + dr, 0, JEFF_SHELVES.length - 1), row = shelf(r);
    const c = dr ? Math.min(colI, row.length - 1) : (colI + dc + row.length) % row.length;
    this.select(row[c]);
  }

  select(card) {
    this.sel = card;
    this.refresh();
  }

  close() {
    this.scene.get('Game').closeJeff();
    this.scene.resume('Game');
    this.scene.stop();
  }

  buy(u) {
    const r = Save.buyWithHorns(u);
    const say = {
      ok: `Pleasure doing business! (${u.name})`, owned: 'You already have that.',
      poor: `Still need ${Save.missingJeff(u).join(', ')}. Come back with more.`,
      needTrial: 'Odin wants proof first: reach room 10 in 1:30 with no deaths.',
      needJumps: 'Not for sale yet.',
    };
    this.msg.setText(say[r]).setColor(r === 'ok' ? '#7dffb2' : '#ff7070');
    this.horns.setText(String(Save.data.horns));
    this.refresh();
  }

  refresh() {
    for (const c of this.cards) {
      const owned = Save.has(c.u.id), afford = Save.data.horns >= c.u.cost, picked = c === this.sel;
      c.box.setFillStyle(owned ? 0x16302a : picked ? 0x26356a : 0x141c3a).setStrokeStyle(2, picked ? 0xffd23f : owned ? 0x3f8f5a : 0x2b3a67);
      c.name.setAlpha(owned || afford ? 1 : 0.55);
      c.price.setText(owned ? 'OWNED' : `${c.u.cost} horns`).setColor(owned ? '#7dffb2' : afford ? '#ffd23f' : '#ff7070');
    }
    if (this.sel) this.desc.setText(`${this.sel.u.name}  -  ${this.sel.u.desc}`);
  }
}
