// Persistent progress (goat horns, bought upgrades, furthest room) in localStorage.
// Storage can be blocked (private windows etc.), so every access is wrapped and the game still works without it.
const Save = {
  KEY: 'summit-save-v1',
  data: { horns: 0, upgrades: {}, unlocked: 0, chaseTrialDone: false, coins: 0, odinTrialDone: false }, // chaseTrialDone: beat the boss chase in 1:30 without dying

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) Object.assign(this.data, JSON.parse(raw));
      delete this.data.witheredBones;   // older saves: Withered bones are gone, the Withered drops goat horns now
    } catch (e) { /* ignore */ }
  },

  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) { /* ignore */ }
  },

  has(id) { return !!this.data.upgrades[id]; },

  // n may be fractional: whole horns are banked, the remainder waits in hornFrac
  addHorns(n) {
    const total = n + (this.data.hornFrac || 0), whole = Math.floor(total + 1e-9);
    this.data.horns += whole; this.data.hornFrac = Math.round((total - whole) * 100) / 100;
    this.save();
  },

  // returns 'ok' | 'owned' | 'poor' | 'needHide' (requires another upgrade) | 'needTrial'
  buy(upgrade) {
    if (this.has(upgrade.id)) return 'owned';
    if (upgrade.requires && !this.has(upgrade.requires)) return 'needHide';
    if (upgrade.trial && !this.data.chaseTrialDone) return 'needTrial';
    if (this.missing(upgrade).length) return 'poor';
    this.data.coins -= upgrade.cost;
    this.data.upgrades[upgrade.id] = true;
    this.save();
    return 'ok';
  },

  // what you're still short of for a goat-shop upgrade (goat shop items are paid in coins only)
  missing(u) {
    return this.data.coins < u.cost ? [`${u.cost - this.data.coins} coins`] : [];
  },

  addCoins(n) { this.data.coins += n; this.save(); },

  // Jeff's wares are paid in goat horns and Odin's needs its trial passed first.
  // returns 'ok' | 'owned' | 'needTrial' | 'poor'
  missingJeff(item) {
    return this.data.horns < (item.cost || 0) ? [`${item.cost - this.data.horns} horns`] : [];
  },

  buyWithHorns(item) {
    if (this.has(item.id)) return 'owned';
    if (item.trial === 'odin' && !this.data.odinTrialDone) return 'needTrial';
    if (this.missingJeff(item).length) return 'poor';
    this.data.horns -= item.cost || 0;
    this.data.upgrades[item.id] = true;
    this.save();
    return 'ok';
  },

  completeOdinTrial() { if (!this.data.odinTrialDone) { this.data.odinTrialDone = true; this.save(); } },

  completeTrial() { if (!this.data.chaseTrialDone) { this.data.chaseTrialDone = true; this.save(); } },

  unlock(roomIndex) {
    if (roomIndex > this.data.unlocked) { this.data.unlocked = roomIndex; this.save(); }
  },
};
Save.load();


