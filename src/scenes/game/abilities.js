// GameScene: the player's active abilities - Rampage of the Mountains (Q/E), the Mountain Toughened Hide
// shield (F) and the Gambler's Coin (G).
Object.assign(GameScene.prototype, {
  useAbilities() {
    const k = this.keys;
    if (Save.has('rampage') && this.rampageCd <= 0 && this.rampageT <= 0 && this.exhaustT <= 0 && this.pressed(k.rampage))
      this.startRampage();
    if (Save.has('mountainHide') && this.shieldT <= 0 && this.shieldCd <= 0 && this.pressed(k.deflect))
      this.raiseShield();
    if (Save.has('gamblersCoin') && this.gambleCd <= 0 && this.gambleFrozenT <= 0 && this.pressed(k.gamble))
      this.flipGamblersCoin();
  },

  startRampage() {
    const elder = Save.has('elderRampage');
    this.rampageT = CFG.RAMPAGE_TIME * (elder ? 2 : 1);
    this.rampageCd = CFG.RAMPAGE_COOLDOWN * (Save.has('rampageTonic') ? 2 / 3 : 1) * (elder ? 0.5 : 1);
    this.burstAtPlayer(0xffd23f, 16, 110);
    this.cameras.main.shake(200, 0.006);
    this.toast('RAMPAGE!');
  },

  raiseShield() {
    this.shieldT = Infinity; this.shieldCharges = CFG.SHIELD_CHARGES;   // stays up until its charges are used up
    this.toast('Shield up!');
  },

  drawShield() {
    const g = this.shieldG, p = this.player;
    g.clear();
    if (this.shieldT <= 0 || p.state === 'dead') return;
    const a = 0.75 + 0.15 * Math.sin(this.time_ * 6);                                  // gentle pulse while it waits for a hit
    g.fillStyle(0x9fe8ff, 0.18 * a); g.fillCircle(p.centerX, p.centerY, 10);
    g.lineStyle(1, 0xd8f8ff, a); g.strokeCircle(p.centerX, p.centerY, 10);
  },

  // Gambler's Coin: 70% a lucky flip (speed + invincibility), 10% frozen solid and every extra life gone for the room,
  // 20% cursed - half speed and double damage for 5 minutes
  flipGamblersCoin() {
    this.gambleCd = CFG.GAMBLE_COOLDOWN;
    const roll = Math.random();
    if (roll < 0.7) {
      this.gambleBoostT = CFG.GAMBLE_BOOST_TIME;
      this.burstAtPlayer(0xffd23f, 18, 130);
      this.cameras.main.shake(150, 0.006);
      this.toast('Lucky flip! Fast and untouchable!');
    } else if (roll < 0.8) {
      this.gambleFrozenT = CFG.GAMBLE_FREEZE_TIME;
      this.noExtraLives = true; this.applyUpgrades();
      this.hp = Math.min(this.hp, this.maxHp);
      this.cameras.main.shake(300, 0.01);
      this.burstAtPlayer(0x9fe8ff, 16, 90);
      this.showTitle('Unlucky flip! Frozen solid!');
      this.toast('Extra lives negated for the room!');
    } else {
      this.gambleSlowT = CFG.GAMBLE_SLOW_TIME;
      this.burstAtPlayer(0x6b5b7a, 12, 70);
      this.showTitle('Cursed flip! You feel sluggish...');
      this.toast('Slower and more fragile for 5 minutes!');
    }
  },
});
