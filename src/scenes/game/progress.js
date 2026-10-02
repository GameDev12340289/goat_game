// GameScene: leaving rooms, the shop trials, finishing the run, and rewards (horns).
Object.assign(GameScene.prototype, {
  nextRoom() {
    if (this.transitioning) return;
    this.transitioning = true;
    this.checkTrials();
    const room = this.room;
    const horns = room.horns !== undefined ? room.horns
      : room.boss ? (room.finale ? CFG.HORNS_BOSS_DEFEATED : CFG.HORNS_PER_BOSS_ROOM) : 0;
    if (horns > 0) this.awardHorns(horns, room.hornsExact);
    const beatFirstBoss = this.roomIndex === GameScene.CHASE_LAST;      // escaping room 19 leads through door 20: the first boss is beaten
    const cam = this.cameras.main;
    cam.fadeOut(180, ...GameScene.FADE_RGB);
    cam.once('camerafadeoutcomplete', () => {
      if (this.roomIndex + 1 >= LEVELS.length) return this.finish();
      this.loadRoom(this.roomIndex + 1);
      cam.fadeIn(180, ...GameScene.FADE_RGB);
      this.showTitle(this.room.name);
      if (beatFirstBoss) this.time.delayedCall(1800, () => this.showTitle('Your hide feels tougher than usual'));   // after the room name has faded
    });
  },

  // called as the player leaves a room: have they just passed one of the shop trials?
  checkTrials() {
    // Odin's Blessing trial: arrive in room 10 within 1:30 without dying, starting the run at room 1
    if (this.roomIndex + 2 === CFG.ODIN_TRIAL_ROOM && this.startRoom === 0 && this.time_ <= CFG.ODIN_TRIAL_TIME && this.deaths === 0 && !Save.data.odinTrialDone) {
      Save.completeOdinTrial();
      this.toast("Trial passed! Jeff will sell you Odin's Blessing");
    }
    // Mountain Toughened Hide trial: beat the boss chase (rooms 11-19, i.e. leave room 19) in 1:30 with no deaths
    if (this.roomIndex === GameScene.CHASE_LAST && this.trialOk()) {
      Save.completeTrial();
      this.toast('Trial passed! You can buy Mountain Toughened Hide');
    }
  },

  // is the Mountain Toughened Hide trial still on? (started when room 11 is first entered: under 1:30, no deaths since)
  trialOk() {
    const m = this.chaseMark;
    return !!m && !Save.data.chaseTrialDone &&
      this.time_ - m.time <= CFG.TRIAL_TIME && this.deaths === m.deaths;
  },

  finish() {
    this.completed = true;
    this.player.hide();
    this.cameras.main.fadeIn(300, ...GameScene.FADE_RGB);
    const m = Math.floor(this.time_ / 60), s = (this.time_ % 60).toFixed(2).padStart(5, '0');
    this.game.events.emit('complete',
      `LEVEL COMPLETE\nYou outran the elder goat ..... for now\n\nTime ${m}:${s}\nDeaths ${this.deaths}\n\nENTER  menu / shop      R  play again`);
  },

  // Odin's Blessing: every drop (coins, horns) is x5
  dropMult() { return Save.has('odin') ? CFG.ODIN_DROPS : 1; },

  // boss rooms pay fractions of a horn (Save keeps the remainder), so most escapes just add to a shard.
  // exact: skip HORN_DROP_MULT (Odin's x5 still applies). Returns how many whole horns were banked.
  awardHorns(n, exact = false) {
    const before = Save.data.horns;
    Save.addHorns(n * (exact ? 1 : CFG.HORN_DROP_MULT) * this.dropMult());
    const got = Save.data.horns - before;
    this.hornsEarned += got;
    this.toast(got > 0 ? `+${GameScene.plural(got, 'goat horn')}!` : 'a goat horn shard...');
    return got;
  },

  // room 75: the icicle pierces the elder goat's leg and a goat horn arcs through the air, landing just in front of the player
  dropHorns(x, y) {
    const p = this.player, ground = this.boss.groundY;
    const landX = Phaser.Math.Clamp(p.centerX - 6, Math.min(x + 24, CFG.W - 16), CFG.W - 16);
    const img = this.add.image(x, y, 'horn').setOrigin(0.5, 1).setDepth(11).setScale(1.5);
    this.roomObjs.push(img);
    this.hornDrop = { img, x: landX, y: ground, ready: false, taken: false };
    this.tweens.add({ targets: img, x: landX, duration: 800, ease: 'Sine.out' });
    this.tweens.chain({ targets: img, tweens: [
      { y: y - 40, duration: 300, ease: 'Sine.out' },
      { y: ground, duration: 500, ease: 'Bounce.out' },
    ] });
    this.time.delayedCall(850, () => { if (this.hornDrop) this.hornDrop.ready = true; });
    this.tweens.add({ targets: img, alpha: 0.55, yoyo: true, repeat: -1, duration: 500, delay: 900 });   // a faint glow so it's easy to spot
  },

  takeHornDrop() {
    const h = this.hornDrop;
    h.taken = true; h.img.destroy();
    const got = this.awardHorns(Phaser.Math.Between(CFG.ELDER_HORNS_MIN, CFG.ELDER_HORNS_MAX));   // 1-5, then x3 (and Odin's x5)
    this.exitLocked = false;
    this.burst(h.x, h.y - 4, 0xffd23f, 16, 90);
    this.showTitle(`The elder goat dropped ${GameScene.plural(got, 'goat horn')}!`);
  },
});
