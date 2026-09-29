// GameScene: taking hits - hazard damage, shield deflects, Odin's extra boss hits and dying.
Object.assign(GameScene.prototype, {
  // regular hazards (spikes, pits, rising floor): Tough Hide absorbs one hit, then we're put back on safe ground
  // cold = frozen by powder snow, which the Mountain Toughened Hide shield can't deflect
  hurt(cold = false) {
    const p = this.player;
    if (p.state === 'dead' || p.invuln > 0 || this.invincible) return;
    if (!cold && this.tryDeflect()) return;
    this.hp -= this.gambleSlowT > 0 ? CFG.GAMBLE_SLOW_DAMAGE : 1;   // a cursed coin flip doubles hazard damage
    if (this.hp <= 0) return this.killPlayer();
    this.burstAtPlayer(0xe8443c, 12, 110);
    this.cameras.main.shake(150, 0.008);
    this.freezeT = 0.06;
    p.respawnAtSafe();
    p.invuln = CFG.HURT_INVULN * (Save.has('hornedHelm') ? 2 : 1);
    this.toast(`Tough hide! ${GameScene.plural(this.hp, 'hit')} left`);
  },

  // Mountain Toughened Hide: spends shield charges to shrug off a hit (1 for hazards, SHIELD_BOSS_COST for boss attacks); true if it did
  tryDeflect(cost = 1) {
    if (this.shieldT <= 0) return false;
    const p = this.player;
    this.shieldCharges = Math.max(0, this.shieldCharges - cost);
    if (this.shieldCharges <= 0) { this.shieldT = 0; this.shieldCd = CFG.SHIELD_COOLDOWN; }   // used up: the cooldown starts
    this.graceT = CFG.SHIELD_GRACE; p.invuln = Math.max(p.invuln, CFG.SHIELD_GRACE);
    this.burstAtPlayer(0x9fe8ff, 16, 130);
    this.cameras.main.shake(120, 0.006);
    this.freezeT = 0.06;
    this.toast(this.boss ? 'REFLECTED!' : 'Deflected!');
    return true;
  },

  // Odin's Blessing: boss attacks take 3 hits to kill (per room) instead of one. returns true if this hit was survived
  odinBossHit() {
    if (!Save.has('odin') || this.bossHp <= 1) return false;
    const p = this.player;
    this.bossHp--;
    p.invuln = Math.max(p.invuln, CFG.SHIELD_GRACE); this.graceT = CFG.SHIELD_GRACE;
    this.burstAtPlayer(0xffd23f, 16, 120);
    this.toast(`Odin's blessing! ${GameScene.plural(this.bossHp, 'boss hit')} left`);
    return true;
  },

  killPlayer(force = false) {
    const p = this.player;
    if (p.state === 'dead' || ((this.invincible || this.graceT > 0) && !force)) return;
    p.state = 'dead'; p.hide();
    this.deaths++;
    this.burstAtPlayer(0xe8443c, 20, 140);
    this.cameras.main.shake(200, 0.01);
    this.freezeT = 0.05; this.deadT = 0.5;
  },

  onDash(p) {
    this.freezeT = CFG.DASH_FREEZE;
    this.cameras.main.shake(90, 0.002);
  },
});
