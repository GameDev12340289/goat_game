// GameScene: the per-frame world checks - pits, powder snow, the boss, spikes, pickups and exits.
Object.assign(GameScene.prototype, {
  checkWorld(dt) {
    const p = this.player;
    if (p.state === 'dead') return;
    if (p.y > CFG.H + 8) return this.fellInPit();
    this.updateFreeze(dt);
    if (p.state === 'dead') return;
    this.updateFinale();
    const rescue = this.room.rescue;
    if (rescue && !this.rescueDone && p.x >= rescue.triggerX) return this.startRescue();
    if (this.updateBoss(dt)) return;
    this.updateJeff();
    const h = this.hornDrop;
    if (h && h.ready && !h.taken && this.overlapsPlayer(h.x - 10, h.y - 8, 20)) this.takeHornDrop();
    this.roomT += dt;
    if (this.updatePopSpikes()) return this.hurt();
    if (this.tornadoes.length) this.updateTornadoes(dt);
    if (this.winds) this.winds.update(dt, p);
    if (p.state === 'fling') return;                     // a small tornado just caught you for the 3rd time
    if (this.rise && this.updateRise(dt)) return this.hurt();
    if (this.spikes.some(s => this.overlapsPlayer(s.x, s.y, s.w, s.h))) return this.hurt();
    this.updateCrystals(dt);
    this.updateCoins();
    this.checkExit();
  },

  fellInPit() {
    if (this.invincible || this.tryDeflect()) return this.player.respawnAtSafe();   // rampaging / lucky / shielded goats bounce out of pits
    this.hurt();
  },

  // freeze meter: builds while wading through powder (not while dashing through it), thaws outside
  updateFreeze(dt) {
    const p = this.player;
    p.inPowder = this.playerWading();
    if (p.inPowder) {
      this.freeze += dt / (CFG.POWDER_FREEZE * (Save.has('frostCloak') ? 2 : 1));
      this.puffT -= dt;
      if (this.puffT <= 0) { this.puffT = 0.07; this.burst(p.centerX, p.centerY - 2, 0xffffff, 3, 28); }
    } else this.freeze = Math.max(0, this.freeze - dt * (Save.has('frostplate') ? 2 : 1) / CFG.POWDER_THAW);

    const f = Math.min(1, this.freeze);
    this.drawFrost(f);
    this.tintPlayer(f);

    if (this.freeze >= 1) {
      this.freeze = 0;
      this.burst(p.centerX, p.centerY, 0xbfeaff, 14, 100);
      this.toast('Frozen solid!');
      this.hurt(true);
    }
  },

  // icy screen overlay that thickens as the freeze meter fills
  drawFrost(f) {
    const g = this.frost;
    g.clear();
    if (f <= 0.02) return;
    g.fillStyle(0xaee6ff, f * 0.22); g.fillRect(0, 0, CFG.W, CFG.H);
    const t = Math.round(f * 16);
    g.fillStyle(0xd8f4ff, f * 0.55);
    g.fillRect(0, 0, CFG.W, t); g.fillRect(0, CFG.H - t, CFG.W, t);
    g.fillRect(0, 0, t, CFG.H); g.fillRect(CFG.W - t, 0, t, CFG.H);
  },

  // the goat's tint shows its strongest active status effect, falling back to how frozen it is
  tintPlayer(f) {
    const body = this.player.body;
    const flash = (t, rate, a, b) => (Math.floor(t * rate) % 2 ? a : b);
    if (this.gambleFrozenT > 0) body.setTint(flash(this.gambleFrozenT, 6, 0x9fe8ff, 0xd8f8ff));
    else if (this.brickStunT > 0) body.setTint(flash(this.brickStunT, 8, 0xffa060, 0xffffff));
    else if (this.gambleBoostT > 0) body.setTint(flash(this.gambleBoostT, 10, 0xffd23f, 0x7dffb2));
    else if (this.rampageT > 0) body.setTint(flash(this.rampageT, 10, 0xffd23f, 0xff7a3f));
    else if (this.gambleSlowT > 0) body.setTint(0x6b5b7a);
    else if (this.exhaustT > 0) body.setTint(0x8f96b8);
    else if (f > 0.02) body.setTint(Phaser.Display.Color.GetColor(255 - f * 110, 255 - f * 40, 255));
    else body.clearTint();
  },

  updateFinale() {
    const fin = this.room.finale, p = this.player;
    if (!fin) return;
    if (!this.leaped && p.state === 'normal' && p.x >= fin.leapX) {
      this.leaped = true;
      p.startLeap(fin.vx, fin.vy);
      this.cameras.main.shake(250, 0.008);
      this.burst(p.centerX, p.y + CFG.PH, 0xffd23f, 14, 90);
    }
    // once the mega-leap lands safely: the boss can never hurt you again this room (whether or not it's actually
    // fallen in yet), so it's safe to stick around and browse Jeff's wares. Plus a couple of hazard iframes as a
    // landing buffer, and Jeff shows up to say well done.
    if (this.leaped && !this.leapJeffSpawned && p.state === 'normal') {
      this.leapJeffSpawned = true;
      this.leapSafe = true;
      p.invuln = Math.max(p.invuln, CFG.LEAP_IFRAME);
      this.spawnJeff(Math.min(p.x + 60, CFG.W - 30), { stall: false });
    }
  },

  // boss attacks (body, shockwave, summoned spikes) are exceptions to Tough Hide: always instant death
  // (a raised shield reflects the attack instead and stuns the boss). Still updated while leapSafe so its
  // own animation (e.g. falling into the chasm) keeps playing out - only the hit result is ignored.
  // Returns true if the player was killed.
  updateBoss(dt) {
    if (!this.boss) return false;
    const p = this.player;
    if (!this.boss.update(dt, p) || this.leapSafe || this.invincible || this.graceT > 0) return false;
    if (!this.boss.noDeflect) {
      if (this.tryDeflect(CFG.SHIELD_BOSS_COST)) { this.boss.deflect(p); return false; }
      if (this.odinBossHit()) return false;
    }
    this.killPlayer();
    return true;
  },

  // pop spikes: returns true if one caught the player
  updatePopSpikes() {
    for (const s of this.popSpikes) {
      // pillar reaches from the floor all the way to the top of the room, so it can't be jumped over
      const t = ((this.roomT / CFG.POP_PERIOD + s.phase) % 1) * CFG.POP_PERIOD;
      const h = Math.round(this.popHeight(t, s.y + 8));
      s.sprite.y = s.y + 8 - h;
      if (h >= 5 && this.overlapsPlayer(s.x, s.y + 8 - h, 8, h)) return true;
    }
    return false;
  },

  // how many pixels a popping spike sticks out, t = seconds into its cycle, max = full pillar height
  popHeight(t, max) {
    const { POP_WARN: w, POP_RISE: r, POP_OUT: o, POP_RETRACT: d } = CFG;
    if (t < w) return 2 + (Math.floor(t * 30) % 2);              // peek + jitter as a warning
    if (t < w + r) return 2 + (max - 2) * (t - w) / r;
    if (t < w + r + o) return max;
    if (t < w + r + o + d) return max * (1 - (t - w - r - o) / d);
    return 0;
  },

  // rising spike floor: returns true if it caught the player
  updateRise(dt) {
    const r = this.rise;
    if (r.delay > 0) r.delay -= dt; else r.y -= r.speed * dt;
    r.g.y = Math.round(r.y);
    return this.player.y + CFG.PH > r.y + 2;
  },

  updateCrystals(dt) {
    for (const c of this.crystals) {
      if (!c.active) {
        c.timer -= dt;
        if (c.timer <= 0) { c.active = true; c.sprite.setVisible(true); }
      } else if (this.overlapsPlayer(c.x, c.y) && this.player.refillDash()) {
        c.active = false; c.timer = CFG.CRYSTAL_RESPAWN; c.sprite.setVisible(false);
        this.burst(c.x + 4, c.y + 4, 0x7dffb2, 8);
        this.freezeT = 0.05;
      }
    }
  },

  updateCoins() {
    for (const b of this.coins) {
      if (!b.sprite.active || !this.overlapsPlayer(b.x, b.y)) continue;
      this.collected.add(b.id); this.coinCount++; Save.addCoins(this.dropMult());
      this.burst(b.x + 4, b.y + 4, 0xffd23f, 10);
      b.sprite.destroy();
    }
  },

  checkExit() {
    const p = this.player, exit = this.room.exit;
    if (exit === 'right' && p.x + CFG.PW / 2 > CFG.W) this.nextRoom();
    else if (exit === 'top' && p.y + CFG.PH / 2 < 0) {
      p.vy = Math.min(p.vy, -80); // small boost out of the top, like Celeste
      this.nextRoom();
    }
  },
});
