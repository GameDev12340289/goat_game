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

function hornCounter(scene) {
  const Z = CFG.ZOOM, W = CFG.W * Z;
  const icon = scene.add.image(W - 24, 26, 'horn').setOrigin(1, 0.5).setScale(4);
  return scene.add.text(W - 24 - 40, 26, String(Save.data.horns), uiText(28, { color: '#ffd23f' })).setOrigin(1, 0.5);
}

// coins and Withered bones are saved between runs just like horns, so they get a counter under the horn count
function stashCounter(scene) {
  const Z = CFG.ZOOM, W = CFG.W * Z;
  return scene.add.text(W - 24, 52, '', uiText(16, { color: '#e9e6d2', align: 'right' })).setOrigin(1, 0);
}
const stashText = () => `coins ${Save.data.coins}\nWithered bones ${Save.data.witheredBones}`;

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
      'move: arrows / WASD    jump: C    dash: Right Shift    grab: W    retry: R    pause: ESC    rampage: Q    shield: F',
      uiText(15, { color: '#9fb0d8' })).setOrigin(0.5);
  }

  // rooms 1-65 are always pickable; room 75 and room 76 (the Merchant) join the list once you have reached them
  choices() {
    const c = Array.from({ length: 65 }, (_, i) => i);
    if (Save.data.unlocked >= 74) c.push(74);
    if (Save.data.unlocked >= 75) c.push(75);
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
    this.horns = hornCounter(this);
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

  price(u) { return u.bones ? `${u.cost}h ${u.bones}b ${u.coins}c` : `${u.cost} horns`; }

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
    this.horns.setText(String(Save.data.horns));
    this.stash.setText(stashText());
    this.refresh();
  }

  refresh() {
    super.refresh();
    const it = this.items[this.sel];
    if (this.desc) this.desc.setText(it && it.up ? it.up.desc : '');
  }
}



// Jeff the merchant (room 76): sells armour and items for coins only. Runs on top of the paused Game scene.
class JeffScene extends MenuBase {
  constructor() { super('Jeff'); }

  create() {
    const Z = CFG.ZOOM, W = CFG.W * Z, H = CFG.H * Z;
    this.add.rectangle(W / 2, H / 2, W, H, 0x05060d, 0.86);
    this.add.image(90, 230, 'jeff').setOrigin(0.5, 1).setScale(8);
    this.add.text(W / 2 + 40, 56, "JEFF'S WARES", uiText(56, { color: '#7dffb2' })).setOrigin(0.5);
    this.add.text(W / 2 + 40, 100, 'coins only, friend. no horns. never horns.', uiText(18, { color: '#9fb0d8' })).setOrigin(0.5);
    this.add.image(W - 24, 26, 'coin').setOrigin(1, 0.5).setScale(4);
    this.coins = this.add.text(W - 24 - 40, 26, String(Save.data.coins), uiText(28, { color: '#ffd23f' })).setOrigin(1, 0.5);
    this.stash = this.add.text(W - 24, 52, this.stashText(), uiText(16, { color: '#e9e6d2', align: 'right' })).setOrigin(1, 0);
    this.tabText = this.add.text(W / 2 + 40, 146, '', uiText(22, { color: '#ffd23f' })).setOrigin(0.5);
    this.msg = this.add.text(W / 2, H - 30, '', uiText(18, { color: '#ffd23f' })).setOrigin(0.5);
    this.desc = this.add.text(W / 2, H - 92, '', uiText(18, { align: 'center', wordWrap: { width: 800 } })).setOrigin(0.5);

    this.tab = 'armour';
    this.items = this.tabItems();
    this.setupMenu(196, 42, 24);
    ['LEFT', 'RIGHT', 'A', 'D'].forEach(n => this.input.keyboard.on('keydown-' + n, () => this.switchTab()));
    ['ESC', 'BACKSPACE', 'V'].forEach(n => this.input.keyboard.on('keydown-' + n, () => this.close()));
  }

  price(u) { return u.bones ? `${u.cost}c ${u.bones}b ${u.horns}h` : `${u.cost} coins`; }

  // the wares on the current tab, plus LEAVE
  tabItems() {
    const list = JEFF_ITEMS.filter(u => u.kind === this.tab).map(u => ({
      up: u,
      text: () => `${u.name.padEnd(16)} ${(Save.has(u.id) ? 'OWNED' : this.price(u)).padStart(11)}`,
      run: () => this.buy(u),
    }));
    list.push({ text: () => 'LEAVE', run: () => this.close() });
    return list;
  }

  switchTab() {
    this.tab = this.tab === 'armour' ? 'item' : 'armour';
    this.items = this.tabItems();
    this.sel = 0;
    this.refresh();
  }

  close() {
    this.scene.get('Game').closeJeff();
    this.scene.resume('Game');
    this.scene.stop();
  }

  buy(u) {
    const r = Save.buyWithCoins(u);
    const say = {
      ok: `Pleasure doing business! (${u.name})`, owned: 'You already have that.',
      poor: `Still need ${Save.missingJeff(u).join(', ')}. Come back with more.`,
      needTrial: 'Odin wants proof first: reach room 10 in 1:30 with no deaths.',
    };
    this.msg.setText(say[r]).setColor(r === 'ok' ? '#7dffb2' : '#ff7070');
    this.coins.setText(String(Save.data.coins));
    this.stash.setText(this.stashText());
    this.refresh();
  }

  stashText() { return `Withered bones ${Save.data.witheredBones}\ngoat horns ${Save.data.horns}`; }

  refresh() {
    if (!this.labels) return;
    this.labels.forEach((t, i) => {
      const it = this.items[i];
      t.setVisible(!!it);
      if (!it) return;
      t.setText((i === this.sel ? '> ' : '  ') + it.text() + (i === this.sel ? ' <' : '  '));
      t.setColor(i === this.sel ? '#ffd23f' : '#ffffff');
    });
    if (this.tabText) this.tabText.setText(this.tab === 'armour' ? '<  ARMOUR  >   (items: left / right)' : '<  ITEMS  >   (armour: left / right)');
    const it = this.items[this.sel];
    if (this.desc) this.desc.setText(it && it.up ? it.up.desc : '');
  }
}
