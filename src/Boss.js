// Giant goat boss. It chases the player from the left edge of a room and:
//  - screams (wind-up, then a ground shockwave that one-shots the player - jump it),
//  - summons spikes from the floor or ceiling; the impact area flashes red for SPIKE_WARN seconds first.
// Room config (levels.js -> boss): { speed, startX, firstDelay, spikeEvery, screamEvery, ceiling }
class Boss {
  constructor(scene, cfg, groundY) {
    this.scene = scene;
    this.groundY = groundY;
    this.cfg = { speed: 20, startX: -90, firstDelay: 3, spikeEvery: 0, screamEvery: 0, ceiling: false, ...cfg };
    this.cfg.speed *= Boss.SPEED_MULT;
    this.x = this.cfg.startX;                    // front edge (snout)
    this.fallY = 0; this.fallVy = 0; this.angle = 0;
    this.state = 'chase'; this.stateT = 0; this.t = 0;
    this.spikeT = this.cfg.spikeEvery ? this.cfg.firstDelay : Infinity;
    this.screamT = this.cfg.screamEvery ? this.cfg.firstDelay + 2 : Infinity;
    this.attacks = []; this.waves = []; this.reflects = []; this.stunT = 0;

    this.sprite = scene.add.image(0, 0, 'boss').setOrigin(1, 1).setScale(Boss.SCALE).setDepth(9);
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
    } else if (this.state === 'fall') {
      this.updateFall(dt);
    } else if (this.state === 'chase') {
      this.x += this.cfg.speed * dt;
      this.screamT -= dt;
      if (this.screamT <= 0) this.startScream();
      if (this.cfg.fallX !== undefined && this.x >= this.cfg.fallX) this.startFall();
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
        this.state = 'chase'; this.sprite.setTexture('boss');
        this.screamT = this.cfg.screamEvery;
      }
    }

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

    const bob = this.state === 'chase' && !stunned ?-Math.abs(Math.sin(this.t * 9)) * 2 : 0;
    this.sprite.setPosition(Math.round(this.x), CFG.H + 2 + Math.round(bob + this.fallY)).setAngle(this.angle);
    this.draw();

    // ---- collisions ----
    const hit = (x, y, w, h) => p.x < x + w && p.x + CFG.PW > x && p.y < y + h && p.y + CFG.PH > y;
    if (this.state !== 'fall' && hit(this.x - 88, CFG.H - 88, 86, 88)) return true;   // the body
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
    this.waves = [];
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
    this.spikeT = Infinity; this.screamT = Infinity;
    this.sprite.setTexture('bossScream');
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

  // ---- scream ---------------------------------------------------------------
  startScream() {
    this.state = 'windup'; this.stateT = 0.9;
    this.sprite.setTexture('bossScream');
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
