// Giant goat boss. It chases the player from the left edge of a room and:
//  - screams (wind-up, then a ground shockwave that one-shots the player - jump it),
//  - summons spikes from the floor or ceiling; the impact area flashes red for SPIKE_WARN seconds first.
//  - (dashEvery) lunges forward in a sudden dash; it flashes red for DASH_WARN seconds first.
//  - (icy, icicleEvery: rooms 66-75) its horns are caked in ice; they glint for ICICLE_WARN seconds, then it launches an
//    icicle straight at where you are.
//  - (cornerX: room 75) once its snout reaches cornerX you're cornered: it hurls one huge homing icicle. Without a Tough
//    Hide it kills you; with one the icicle glances off your hide, pierces the goat's leg and it runs away, dropping horns.
// Room config (levels.js -> boss): { speed, startX, firstDelay, spikeEvery, screamEvery, dashEvery, ceiling, icy, icicleEvery, cornerX }
class Boss {
  constructor(scene, cfg, groundY) {
    this.scene = scene;
    this.groundY = groundY;
    this.cfg = { speed: 20, startX: -90, firstDelay: 3, spikeEvery: 0, screamEvery: 0, dashEvery: 0, icicleEvery: 0, ceiling: false, ...cfg };
    this.cfg.speed *= Boss.SPEED_MULT;
    this.x = this.cfg.startX;                    // front edge (snout)
    this.fallY = 0; this.fallVy = 0; this.angle = 0;
    this.state = 'chase'; this.stateT = 0; this.t = 0;
    this.spikeT = this.cfg.spikeEvery ? this.cfg.firstDelay : Infinity;
    this.screamT = this.cfg.screamEvery ? this.cfg.firstDelay + 2 : Infinity;
    this.dashT = this.cfg.dashEvery ? this.cfg.firstDelay + 1 : Infinity;
    this.icicleT = this.cfg.icicleEvery ? this.cfg.firstDelay + 1.5 : Infinity;
    this.attacks = []; this.waves = []; this.reflects = []; this.icicles = []; this.stunT = 0;
    this.noDeflect = false;                      // room 75's last icicle can't be shrugged off with the shield

    this.sprite = scene.add.image(0, 0, this.tex(false)).setOrigin(1, 1).setScale(Boss.SCALE).setDepth(9);
    this.gfx = scene.add.graphics().setDepth(8);
    scene.roomObjs.push(this.sprite, this.gfx);
  }

  // returns true if the player was hit
  update(dt, p) {
    this.t += dt;
    const cam = this.scene.cameras.main;

    const stunned = this.stunT > 0;
    if (stunned) {
      this.stunT -= dt;
      if (this.stunT <= 0) this.sprite.clearTint();
      else this.sprite.setTint(Math.floor(this.stunT * 8) % 2 ? 0x9fd8ff : 0xffffff);
    }

    if (stunned) {
      // frozen in place: no moving, screaming or summoning until the stun wears off
    } else if (this.state === 'held') {
      cam.shake(60, 0.002);                             // pinned in place by the Cyclone's wind
    } else if (this.state === 'blown') {
      this.x += Boss.BLOWN_SPEED * dt;                  // the Cyclone's last gust shoves it over the edge
      if (this.x >= this.cfg.fallX) this.startFall();
    } else if (this.state === 'fall') {
      this.updateFall(dt);
    } else if (this.state === 'chase' || this.state === 'icicleAim') {
      this.x += this.cfg.speed * dt;
      if (this.state === 'icicleAim') {
        this.stateT -= dt;
        if (this.stateT <= 0) { this.state = 'chase'; this.launchIcicle(p, false); }
      } else {
        this.screamT -= dt; this.dashT -= dt; this.icicleT -= dt;
        if (this.screamT <= 0) this.startScream();
        else if (this.dashT <= 0) this.startDashWarn();
        else if (this.icicleT <= 0) { this.state = 'icicleAim'; this.stateT = Boss.ICICLE_WARN; }
      }
      if (this.cfg.fallX !== undefined && this.x >= this.cfg.fallX) this.startFall();
      if (this.cfg.cornerX !== undefined && this.x >= this.cfg.cornerX) this.startCorner();
    } else if (this.state === 'cornerAim') {
      cam.shake(60, 0.003);
      this.stateT -= dt;
      if (this.stateT <= 0) { this.state = 'cornerShot'; this.launchIcicle(p, true); }
    } else if (this.state === 'cornerShot') {
      if (!this.icicles.length) { this.state = 'cornerAim'; this.stateT = Boss.ICICLE_WARN * 2; }   // you lived through it somehow (Rampage): it tries again
    } else if (this.state === 'pierced') {
      this.stateT -= dt;                                // rears up on three legs...
      if (this.stateT <= 0) { this.state = 'retreat'; this.sprite.setFlipX(true).setTexture(this.tex(false)); }
    } else if (this.state === 'retreat') {
      this.x -= Boss.RETREAT_SPEED * dt;                // ...and limps off the way it came
      if (this.x < -4) this.flee();
    } else if (this.state === 'gone') {
      // nothing left to do
    } else if (this.state === 'dashWarn') {
      this.x += this.cfg.speed * dt;
      this.stateT -= dt;
      this.sprite.setTint(Math.floor(this.stateT * (this.stateT < 0.4 ? 16 : 8)) % 2 ? 0xff2020 : 0xffffff);   // flashes faster just before it goes
      if (this.stateT <= 0) {
        this.state = 'dash'; this.stateT = Boss.DASH_TIME;
        this.sprite.setTint(0xff6060);
        cam.shake(250, 0.01);
      }
    } else if (this.state === 'dash') {
      this.x += Boss.DASH_SPEED * dt;
      this.stateT -= dt;
      this.ghostT = (this.ghostT || 0) - dt;
      if (this.ghostT <= 0) { this.ghostT = 0.05; this.scene.burst(this.x - 10, this.groundY - 4, 0xdfe6f0, 4, 60); }
      if (this.cfg.fallX !== undefined && this.x >= this.cfg.fallX) this.startFall();
      else if (this.stateT <= 0) this.endDash();
    } else if (this.state === 'windup') {
      cam.shake(60, 0.003);
      this.stateT -= dt;
      if (this.stateT <= 0) {
        this.state = 'roar'; this.stateT = 0.5;
        cam.shake(400, 0.012);
        this.waves.push({ x: this.x - 4 });
      }
    } else {
      this.stateT -= dt;
      if (this.stateT <= 0) {
        this.state = 'chase'; this.sprite.setTexture(this.tex(false));
        this.screamT = this.cfg.screamEvery;
      }
    }
    this.updateIcicles(dt, p);

    if (!stunned) this.spikeT -= dt;
    if (this.spikeT <= 0 && !stunned) {
      this.spikeT = this.spawnSpike(p) ? this.cfg.spikeEvery * (0.8 + Math.random() * 0.4) : 0.4;
    }

    for (const w of this.waves) w.x += Boss.WAVE_SPEED * dt;
    this.waves = this.waves.filter(w => w.x < CFG.W + 20);
    for (const a of this.attacks) a.t += dt;
    this.attacks = this.attacks.filter(a => a.t < Boss.WARN + Boss.OUT + Boss.RETRACT);

    for (const r of this.reflects) r.x -= Boss.WAVE_SPEED * 1.4 * dt;     // reflected attacks fly back at the goat
    this.reflects = this.reflects.filter(r => r.x > this.x - 60);

    const running = (this.state === 'chase' || this.state === 'icicleAim') && !stunned;
    let bob = running ? -Math.abs(Math.sin(this.t * 9)) * 2 : 0;
    if (this.state === 'retreat') bob = -Math.abs(Math.sin(this.t * 7)) * 4;   // a lopsided, limping run
    const tilt = this.state === 'pierced' ? -8 : this.state === 'retreat' ? Math.sin(this.t * 7) * 4 : 0;
    this.sprite.setPosition(Math.round(this.x), CFG.H + 2 + Math.round(bob + this.fallY)).setAngle(this.angle + tilt);
    if (this.stuck) { const leg = this.legPos(); this.stuck.setPosition(Math.round(leg.x), Math.round(leg.y + bob)).setRotation(Math.PI * (this.sprite.flipX ? 0.15 : 0.85)); }
    this.draw();

    // ---- collisions ----
    // once it's falling into the chasm (or wounded and running away) it's done as a threat
    if (['fall', 'held', 'blown', 'pierced', 'retreat', 'gone'].includes(this.state)) return false;
    const hit = (x, y, w, h) => p.x < x + w && p.x + CFG.PW > x && p.y < y + h && p.y + CFG.PH > y;
    for (const ic of this.icicles) {
      if (ic.bounced || !hit(ic.x - 3, ic.y - 3, 6, 6)) continue;
      if (ic.final && Save.has('toughHide')) { this.bounceIcicle(ic, p); continue; }   // glances off your hide
      this.removeIcicle(ic);
      return true;
    }
    if (hit(this.x - 88, CFG.H - 88, 86, 88)) return true;   // the body
    for (const w of this.waves) if (hit(w.x - 3, this.groundY - 18, 6, 18)) return true; // shockwave
    for (const a of this.attacks) {
      const r = this.strikeRect(a);
      if (r && r.h >= 8 && hit(r.x, r.y, r.w, r.h)) return true;
    }
    return false;
  }

  // the player's shield bounced an attack back: the shockwaves are wiped, the goat is stunned
  deflect(p) {
    this.stunT = CFG.BOSS_STUN;
    if (this.state === 'dashWarn' || this.state === 'dash') this.endDash();   // a stun cancels the lunge
    if (this.state === 'icicleAim') this.state = 'chase';
    this.waves = [];
    this.icicles.forEach(ic => this.removeIcicle(ic, true));
    this.reflects.push({ x: p.centerX, y: p.centerY });
    // a body hit (you're inside the goat): bounce out in front of its snout
    if (p.x < this.x - 1 && p.x > this.x - 90 && !this.scene.solidBox(this.x + 4, p.y, CFG.PW, CFG.PH)) p.x = this.x + 4;
    this.scene.cameras.main.shake(300, 0.01);
    this.scene.game.events.emit('title', 'The goat is stunned!');
  }

  // ---- falling into the chasm (finale) --------------------------------------
  // cfg.fallX: once the snout passes this x the floor gives way and the boss tumbles in, roaring
  startFall() {
    this.state = 'fall';
    this.fallVy = -70;                                   // a last little hop before it drops
    this.spikeT = Infinity; this.screamT = Infinity; this.dashT = Infinity;
    this.sprite.clearTint();
    this.waves = []; this.attacks = [];                  // it's done as a threat - no lingering shockwave or spikes can kill you after the jump
    this.sprite.setTexture(this.tex(true));
    this.playScream();
    this.scene.cameras.main.shake(700, 0.014);
    this.scene.game.events.emit('title', 'The great goat falls!');
  }

  updateFall(dt) {
    this.fallVy += 520 * dt;
    this.fallY += this.fallVy * dt;
    this.x += 22 * dt;
    this.angle = Math.min(85, this.angle + 70 * dt);     // tips nose-first into the pit
    if (this.fallY < 60) this.scene.cameras.main.shake(60, 0.006);
    if (this.fallY > 220) this.sprite.setVisible(false);
  }

  // ---- the Cyclone's rescue (last room) -----------------------------------------
  // pinned in place by the wind: no more attacks, and anything already on its way is blown away
  hold() {
    this.state = 'held'; this.stunT = 0;
    this.spikeT = Infinity; this.screamT = Infinity; this.dashT = Infinity;
    this.waves = []; this.attacks = [];
    this.sprite.setTexture(this.tex(false)).setTint(0xc8d0e0);
  }

  // the last gust: shoved forward until it tips over fallX into the chasm
  blow(fallX) {
    this.cfg.fallX = fallX;
    this.state = 'blown';
    this.sprite.setTexture(this.tex(true));
    this.playScream();
  }

  // ---- icicles --------------------------------------------------------------
  tex(open) { return (this.cfg.icy ? 'bossIcy' : 'boss') + (open ? 'Scream' : ''); }

  // where the icicles launch from: the tip of the front horn
  hornPos() { return { x: this.x - 16, y: CFG.H + 2 - 84 + this.fallY }; }

  // final: room 75's huge homing icicle
  launchIcicle(p, final) {
    const h = this.hornPos();
    const sprite = this.scene.add.image(h.x, h.y, 'icicle').setDepth(11).setScale(final ? 2.5 : 1.5);
    this.scene.roomObjs.push(sprite);
    const ic = { x: h.x, y: h.y, vx: 0, vy: 0, final, sprite };
    this.aimIcicle(ic, p.centerX, p.centerY, final ? Boss.FINAL_ICICLE_SPEED : Boss.ICICLE_SPEED);
    this.icicles.push(ic);
    this.scene.burst(h.x, h.y, 0xbfeaff, final ? 14 : 6, 70);
    if (final) this.scene.cameras.main.shake(300, 0.01);
    this.icicleT = this.cfg.icicleEvery * (0.8 + Math.random() * 0.4);
  }

  aimIcicle(ic, tx, ty, speed) {
    const a = Math.atan2(ty - ic.y, tx - ic.x);
    ic.vx = Math.cos(a) * speed; ic.vy = Math.sin(a) * speed;
    ic.sprite.setRotation(a);
  }

  updateIcicles(dt, p) {
    for (const ic of this.icicles) {
      if (ic.final && !ic.bounced) this.aimIcicle(ic, p.centerX, p.centerY, Boss.FINAL_ICICLE_SPEED);   // there's no dodging this one
      if (ic.bounced) {
        const leg = this.legPos();
        this.aimIcicle(ic, leg.x, leg.y, Boss.FINAL_ICICLE_SPEED * 1.3);
        if (Math.hypot(leg.x - ic.x, leg.y - ic.y) < 6) { this.pierce(ic); continue; }
      }
      ic.x += ic.vx * dt; ic.y += ic.vy * dt;
      ic.sprite.setPosition(Math.round(ic.x), Math.round(ic.y));
      const off = ic.x < -20 || ic.x > CFG.W + 20 || ic.y > CFG.H + 20 || ic.y < -20;
      if (off || (!ic.final && this.scene.solidBox(ic.x - 1, ic.y - 1, 2, 2))) this.removeIcicle(ic, !off);
    }
    this.icicles = this.icicles.filter(ic => !ic.gone);
  }

  removeIcicle(ic, shatter = true) {
    if (ic.gone) return;
    ic.gone = true; ic.sprite.destroy();
    if (shatter) this.scene.burst(ic.x, ic.y, 0xd8f4ff, 8, 70);
  }

  // ---- room 75: cornered ------------------------------------------------------
  startCorner() {
    this.state = 'cornerAim'; this.stateT = Boss.CORNER_WARN; this.noDeflect = true;
    this.spikeT = Infinity; this.screamT = Infinity; this.dashT = Infinity; this.icicleT = Infinity;
    this.attacks = []; this.waves = [];
    this.icicles.forEach(ic => this.removeIcicle(ic));
    this.sprite.setTexture(this.tex(true));
    this.playScream();
    this.scene.cameras.main.shake(400, 0.01);
    this.scene.game.events.emit('title', 'Cornered! The elder goat readies a giant icicle...');
  }

  // the front leg (it's facing you, so the one nearest the snout)
  legPos() { return { x: this.x - (this.sprite.flipX ? 64 : 30), y: CFG.H - 18 }; }   // mirrored once it turns to flee

  // Tough Hide: the icicle glances off you and flies back at the goat
  bounceIcicle(ic, p) {
    ic.bounced = true;
    this.scene.burst(p.centerX, p.centerY, 0x9fe8ff, 18, 120);
    this.scene.cameras.main.shake(300, 0.01);
    this.scene.game.events.emit('toast', 'The icicle glances off your Tough Hide!');
  }

  pierce(ic) {
    const leg = this.legPos();
    this.removeIcicle(ic);
    this.stuck = this.scene.add.image(leg.x, leg.y, 'icicle').setDepth(10).setScale(2.5);   // left sticking out of its leg
    this.scene.roomObjs.push(this.stuck);
    this.state = 'pierced'; this.stateT = Boss.PIERCED_TIME;
    this.sprite.setTexture(this.tex(true)).setTint(0xffb0b0);
    this.playScream();
    this.scene.cameras.main.shake(600, 0.014);
    this.scene.game.events.emit('title', "The icicle pierces the elder goat's leg!");
    this.scene.dropHorns(this.x - 20, CFG.H - 70);          // a horn snaps off in the struggle
  }

  // limped off the left edge of the screen: gone for now. Jeff comes out of hiding.
  flee() {
    this.state = 'gone';
    this.sprite.setVisible(false);
    if (this.stuck) this.stuck.setVisible(false);
    this.scene.game.events.emit('title', 'The elder goat runs away!');
    this.scene.spawnJeff(CFG.W / 2, { stall: false });
  }

  // ---- dash -----------------------------------------------------------------
  startDashWarn() {
    this.state = 'dashWarn'; this.stateT = Boss.DASH_WARN;
  }

  endDash() {
    this.state = 'chase';
    this.sprite.clearTint();
    this.dashT = this.cfg.dashEvery * (0.8 + Math.random() * 0.4);
  }

  // ---- scream ---------------------------------------------------------------
  startScream() {
    this.state = 'windup'; this.stateT = 0.9;
    this.sprite.setTexture(this.tex(true));
    this.playScream();
  }

  playScream() {
    const ctx = this.scene.sound && this.scene.sound.context;
    if (!ctx) return;
    try {
      const t = ctx.currentTime, out = ctx.createGain();
      out.gain.setValueAtTime(0.0001, t);
      out.gain.exponentialRampToValueAtTime(0.3, t + 0.15);
      out.gain.setValueAtTime(0.3, t + 0.9);
      out.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      out.connect(ctx.destination);
      for (const [type, f0, f1] of [['sawtooth', 240, 90], ['square', 121, 47]]) {
        const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + 1.5);
        lfo.frequency.value = 38; lg.gain.value = 14; lfo.connect(lg); lg.connect(o.frequency);
        o.connect(out);
        o.start(t); lfo.start(t); o.stop(t + 1.7); lfo.stop(t + 1.7);
      }
    } catch (e) { /* audio is optional */ }
  }

  // ---- spikes ---------------------------------------------------------------
  // First solid tile at/below fromY in a column (null if it's a pit)
  surfaceAt(col, fromY) {
    for (let r = Math.max(0, Math.floor(fromY / CFG.TILE)); r < CFG.ROWS; r++)
      if (this.scene.isSolid(col, r)) return r * CFG.TILE;
    return null;
  }

  spawnSpike(p) {
    const T = CFG.TILE;
    const aim = Math.floor((p.centerX + p.vx * 0.8) / T);
    for (const off of [0, 3, -3, 6, -6, 9, -9]) {
      const col = Phaser.Math.Clamp(aim + off, 2, CFG.COLS - 3);
      const surface = this.surfaceAt(col, p.y + CFG.PH);
      if (surface === null) continue;
      const ceiling = this.cfg.ceiling && Math.random() < 0.5;
      this.attacks.push({
        x: (col - 1) * T, w: 3 * T, t: 0, surface, ceiling,
        len: ceiling ? Math.max(40, surface - 6) : Boss.FLOOR_LEN,
      });
      return true;
    }
    return false;
  }

  // how far the spikes have grown (0..1) at time t of the attack
  static grow(t) {
    if (t < Boss.WARN) return 0;
    if (t < Boss.WARN + Boss.OUT) return Math.min(1, (t - Boss.WARN) / 0.08);
    return Math.max(0, 1 - (t - Boss.WARN - Boss.OUT) / Boss.RETRACT);
  }

  strikeRect(a) {
    const ext = a.len * Boss.grow(a.t);
    if (ext <= 0) return null;
    return a.ceiling ? { x: a.x, y: 0, w: a.w, h: ext } : { x: a.x, y: a.surface - ext, w: a.w, h: ext };
  }

  // ---- drawing ----------------------------------------------------------------
  draw() {
    const g = this.gfx;
    g.clear();

    if (this.state === 'icicleAim' || this.state === 'cornerAim') {   // the ice on its horns glints before it throws
      const h = this.hornPos(), on = Math.floor(this.stateT * (this.stateT < 0.3 ? 20 : 10)) % 2 === 0;
      const r = this.state === 'cornerAim' ? 7 + (1 - this.stateT / Boss.CORNER_WARN) * 6 : 4;
      g.fillStyle(0xbfeaff, on ? 0.85 : 0.35); g.fillCircle(h.x, h.y, r);
      g.fillStyle(0xffffff, on ? 1 : 0.5); g.fillRect(h.x - r - 2, h.y, r * 2 + 4, 1); g.fillRect(h.x, h.y - r - 2, 1, r * 2 + 4);
    }

    for (const a of this.attacks) {
      const y0 = a.ceiling ? 0 : a.surface - a.len, h = a.len;
      if (a.t < Boss.WARN) {                                   // red flashing warning zone
        const on = Math.floor(a.t * (a.t < Boss.WARN - 0.5 ? 5 : 10)) % 2 === 0;
        g.fillStyle(0xff2020, on ? 0.45 : 0.15); g.fillRect(a.x, y0, a.w, h);
        g.lineStyle(1, 0xff5050, on ? 1 : 0.4); g.strokeRect(a.x + 0.5, y0 + 0.5, a.w - 1, h - 1);
      } else {
        const r = this.strikeRect(a);
        if (!r) continue;
        g.fillStyle(0xe8ecff);
        for (let i = 0; i < 3; i++) {
          const bx = a.x + i * 8;
          if (a.ceiling) g.fillTriangle(bx, 0, bx + 8, 0, bx + 4, r.h);
          else g.fillTriangle(bx, a.surface, bx + 8, a.surface, bx + 4, a.surface - r.h);
        }
        g.fillStyle(0xe8443c);
        g.fillRect(a.x, a.ceiling ? 0 : a.surface - 1, a.w, 1);
      }
    }

    for (const r of this.reflects) {                            // reflected shot, flying back left
      g.lineStyle(2, 0xd8f8ff, 1);
      g.beginPath(); g.arc(r.x + 8, r.y, 10, Math.PI - 1.2, Math.PI + 1.2); g.strokePath();
      g.lineStyle(2, 0x7fd0ff, 0.6);
      g.beginPath(); g.arc(r.x + 16, r.y, 10, Math.PI - 1.2, Math.PI + 1.2); g.strokePath();
    }

    for (const w of this.waves) {                               // shockwave arcs
      for (let i = 0; i < 3; i++) {
        g.lineStyle(2, i === 0 ? 0xffffff : 0xffe08a, 1 - i * 0.28);
        g.beginPath();
        g.arc(w.x - 9 - i * 7, this.groundY, 18 - i * 2, -1.35, -0.05);
        g.strokePath();
      }
    }
  }
}

Boss.SCALE = 2;          // sprite is drawn 48x48 and shown 96x96
Boss.SPEED_MULT = 1.6;   // global chase-speed multiplier applied to every room's `speed`
Boss.WAVE_SPEED = 180;
Boss.WARN = 2.0;         // seconds the impact area flashes red before spikes strike
Boss.OUT = 0.5;          // seconds the spikes stay out (deadly)
Boss.RETRACT = 0.35;
Boss.FLOOR_LEN = 48;     // floor spikes reach this high (too tall to jump over)
Boss.DASH_WARN = 1;      // seconds the goat flashes red before it dashes
Boss.DASH_SPEED = 260; Boss.DASH_TIME = 0.3;   // the lunge: ~78px in a blink
Boss.ICICLE_WARN = 0.6; Boss.ICICLE_SPEED = 150;   // horns glint, then an icicle flies at where you were
Boss.CORNER_WARN = 2; Boss.FINAL_ICICLE_SPEED = 130; Boss.PIERCED_TIME = 1.2; Boss.RETREAT_SPEED = 110;   // room 75
Boss.BLOWN_SPEED = 120;  // how fast the Cyclone's last gust shoves it toward the edge
