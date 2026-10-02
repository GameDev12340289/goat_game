// GameScene: the HUD line and the other messages sent to UIScene through game.events.
Object.assign(GameScene, {
  // m:ss
  clock(sec) { return `${Math.floor(sec / 60)}:${Math.floor(sec % 60).toString().padStart(2, '0')}`; },
  // "1 hit" / "3 hits"
  plural(n, word) { return `${n} ${word}${n > 1 ? 's' : ''}`; },
});

Object.assign(GameScene.prototype, {
  showTitle(text) { this.game.events.emit('title', text); },
  toast(text) { this.game.events.emit('toast', text); },

  updateHud() {
    const hp = this.maxHp > 1 ? `  hp ${this.hp}/${this.maxHp}` : '';
    const wind = this.boss instanceof Cyclone || this.winds ? `  wind ${this.windHits}/3` : '';   // Cyclone / Wreckage rooms: small-tornado touches so far
    this.game.events.emit('hud', `${GameScene.clock(this.time_)}  deaths ${this.deaths}${hp}` +
      `${this.rampageHud()}${this.shieldHud()}${this.gambleHud()}${this.trialHud()}${wind}`);
  },

  rampageHud() {
    if (!Save.has('rampage')) return '';
    if (this.rampageT > 0) return `  RAMPAGE ${this.rampageT.toFixed(1)}s`;
    if (this.exhaustT > 0) return `  exhausted ${this.exhaustT.toFixed(1)}s`;
    return this.rampageCd > 0 ? `  rampage in ${Math.ceil(this.rampageCd)}s` : '  rampage: Q';
  },

  shieldHud() {
    if (!Save.has('mountainHide')) return '';
    if (this.shieldT > 0) return `  SHIELD x${this.shieldCharges}`;
    return this.shieldCd > 0 ? `  shield in ${Math.ceil(this.shieldCd)}s` : '  shield: F';
  },

  gambleHud() {
    if (!Save.has('gamblersCoin')) return '';
    if (this.gambleFrozenT > 0) return `  FROZEN ${this.gambleFrozenT.toFixed(1)}s`;
    if (this.gambleBoostT > 0) return `  LUCKY ${this.gambleBoostT.toFixed(1)}s`;
    if (this.gambleSlowT > 0) return `  CURSED ${GameScene.clock(Math.ceil(this.gambleSlowT))}`;
    return this.gambleCd > 0 ? `  coin in ${Math.ceil(this.gambleCd)}s` : '  gamble: G';
  },

  trialHud() {
    let trial = '';
    // hide trial countdown while inside the boss chase (rooms 11-19)
    const inChase = this.roomIndex >= GameScene.CHASE_FIRST && this.roomIndex <= GameScene.CHASE_LAST;
    if (!Save.data.chaseTrialDone && inChase && this.chaseMark) {
      const left = CFG.TRIAL_TIME - (this.time_ - this.chaseMark.time);
      trial = this.trialOk() ? `  trial ${GameScene.clock(left)}` : '  trial failed';
    }
    // the room-10 Odin trial countdown
    if (!Save.data.odinTrialDone && this.startRoom === 0 && this.roomIndex < CFG.ODIN_TRIAL_ROOM - 1) {
      const left = CFG.ODIN_TRIAL_TIME - this.time_;
      trial += this.deaths === 0 && left > 0 ? `  odin trial ${GameScene.clock(left)}` : '  odin trial failed';
    }
    return trial;
  },
});
