// Player: integer-pixel AABB movement against the tile grid (no Arcade Physics),
// so jump/dash/wall behaviour is fully deterministic and tweakable in config.js.
class Player {
  constructor(scene) {
    this.scene = scene;
    this.body = scene.add.image(0, 0, 'player').setOrigin(0).setDepth(10);
    this.hair = scene.add.image(0, 0, 'hair').setOrigin(0).setDepth(11);
    this.runMax = CFG.RUN_MAX;          // shop upgrades change these
    this.maxStamina = CFG.STAMINA;
    this.invuln = 0;
    this.slideMax = CFG.WALL_SLIDE_MAX;       // Grip Chalk (Jeff)
    this.maxDashes = 1;                       // Twin Dash (Jeff)
    this.climbMult = 1;                       // Iron Grip
    this.speedMult = 1; this.hornScale = 1;   // set by the Rampage of the Mountains upgrade
  }

  spawn(x, y) {
    this.x = x; this.y = y;
    this.remX = 0; this.remY = 0;
    this.vx = 0; this.vy = 0;
    this.facing = 1;
    this.state = 'normal'; // normal | dash | dead
    this.dashes = this.maxDashes;
    this.stamina = this.maxStamina;
    this.invuln = 0; this.groundT = 0; this.safe = { x, y }; this.inPowder = false;
    this.coyote = 0; this.jumpBuf = 0; this.dashBuf = 0; this.dashCd = 0;
    this.varJump = 0; this.varJumpSpeed = 0;
    this.wallJumpLock = 0; this.wallJumpDir = 0;
    this.dashTimer = 0; this.dashDir = { x: 1, y: 0 }; this.ghostT = 0;
    this.body.setVisible(true); this.hair.setVisible(true);
    this.sync();
  }

  get centerX() { return this.x + CFG.PW / 2; }
  get centerY() { return this.y + CFG.PH / 2; }
  solid(x, y) { return this.scene.solidBox(x, y, CFG.PW, CFG.PH); }

  // ---- movement primitives -------------------------------------------------
  moveX(amount) {
    this.remX += amount;
    let move = Math.round(this.remX);
    this.remX -= move;
    const s = Math.sign(move);
    while (move !== 0) {
      if (this.solid(this.x + s, this.y)) { this.vx = 0; this.remX = 0; return true; }
      this.x += s; move -= s;
    }
    return false;
  }

  moveY(amount) {
    this.remY += amount;
    let move = Math.round(this.remY);
    this.remY -= move;
    const s = Math.sign(move);
    while (move !== 0) {
      if (this.solid(this.x, this.y + s)) {
        // corner correction: slip around ledges when jumping into a corner
        if (s < 0 && this.vy < 0) {
          let slipped = false;
          for (let d = 1; d <= 4 && !slipped; d++) {
            for (const dir of [1, -1]) {
              if (!this.solid(this.x + d * dir, this.y - 1)) { this.x += d * dir; slipped = true; break; }
            }
          }
          if (slipped) continue;
        }
        this.vy = 0; this.remY = 0; return true;
      }
      this.y += s; move -= s;
    }
    return false;
  }

  // ---- main update ---------------------------------------------------------
  update(dt, inp) {
    if (this.state === 'dead') return;

    this.jumpBuf -= dt; this.dashBuf -= dt; this.dashCd -= dt;
    this.coyote -= dt; this.varJump -= dt; this.wallJumpLock -= dt;
    if (inp.jumpPressed) this.jumpBuf = CFG.JUMP_BUFFER;
    if (inp.dashPressed) this.dashBuf = 0.08;

    if (this.state === 'dash') this.updateDash(dt, inp);
    else if (this.state === 'leap') this.updateLeap(dt);
    else this.updateNormal(dt, inp);

    // remember the last spot we stood still on solid ground: where Tough Hide puts us back after a hit
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.state === 'normal' && !this.inPowder && this.solid(this.x, this.y + 1)) {
      this.groundT += dt;
      if (this.groundT > 0.25) this.safe = { x: this.x, y: this.y };
    } else this.groundT = 0;

    this.sync();
  }

  respawnAtSafe() {
    this.x = this.safe.x; this.y = this.safe.y;
    this.remX = 0; this.remY = 0; this.vx = 0; this.vy = 0;
    this.state = 'normal'; this.dashes = this.maxDashes; this.stamina = this.maxStamina;
    this.varJump = 0; this.wallJumpLock = 0; this.dashTimer = 0;
    this.sync();
  }

  updateNormal(dt, inp) {
    const onGround = this.solid(this.x, this.y + 1);
    // wading through powder snow: you can always kick off the "floor" again, which lets you swim upward by mashing jump
    if (this.inPowder) this.coyote = CFG.COYOTE;
    if (onGround) {
      this.coyote = CFG.COYOTE;
      this.stamina = this.maxStamina;
      if (this.dashes < this.maxDashes && this.dashCd <= 0) this.dashes = this.maxDashes;
    }
    const wallJumpDir = this.wallDir(CFG.WALL_JUMP_CHECK);
    const wallNear = this.wallDir(1);

    // dash
    if (this.dashBuf > 0 && this.dashes > 0 && this.dashCd <= 0) { this.startDash(inp); return; }

    let mx = this.wallJumpLock > 0 ? this.wallJumpDir : inp.x;
    if (mx !== 0) this.facing = mx;

    // grab / climb
    const grab = inp.grab && this.stamina > 0 && this.wallJumpLock <= 0 &&
                 this.solid(this.x + this.facing, this.y);
    if (grab) {
      this.vx = 0;
      if (inp.y < 0)      { this.vy = CFG.CLIMB_UP * this.climbMult;   this.stamina -= CFG.CLIMB_UP_COST * dt; }
      else if (inp.y > 0) { this.vy = CFG.CLIMB_DOWN * this.climbMult; }
      else                { this.vy = 0;              this.stamina -= CFG.CLIMB_HOLD_COST * dt; }
      this.varJump = 0;
    } else {
      // horizontal
      const mult = onGround ? 1 : CFG.AIR_MULT;
      const runMax = this.runMax * this.speedMult * (this.inPowder ? CFG.POWDER_RUN : 1);
      if (Math.abs(this.vx) > runMax && Math.sign(this.vx) === mx)
        this.vx = approach(this.vx, runMax * mx, CFG.RUN_REDUCE * mult * dt);
      else
        this.vx = approach(this.vx, runMax * mx, CFG.RUN_ACCEL * mult * dt);
      if (this.inPowder && Math.abs(this.vx) > runMax) this.vx = approach(this.vx, runMax * Math.sign(this.vx), 900 * dt);

      // vertical
      let maxFall = this.inPowder ? CFG.POWDER_FALL : CFG.MAX_FALL;
      if (inp.y > 0 && this.vy >= maxFall) maxFall = CFG.FAST_FALL;
      if (wallNear !== 0 && mx === wallNear && this.vy > 0 && !onGround) maxFall = this.slideMax;
      let g = CFG.GRAVITY;
      if (Math.abs(this.vy) <= CFG.HALF_GRAV_BELOW && inp.jumpHeld) g *= 0.5;
      this.vy = approach(this.vy, maxFall, g * dt);

      if (this.varJump > 0) {
        if (inp.jumpHeld) this.vy = Math.min(this.vy, this.varJumpSpeed);
        else this.varJump = 0;
      }
    }

    // jump
    if (this.jumpBuf > 0) {
      if (this.coyote > 0) this.jump(inp);
      else if (wallJumpDir !== 0) this.wallJump(-wallJumpDir, grab, inp);
    }

    this.moveX(this.vx * dt);
    this.moveY(this.vy * dt);
  }

  updateDash(dt, inp) {
    this.dashTimer -= dt;
    this.ghostT -= dt;
    if (this.ghostT <= 0) { this.ghostT = 0.03; this.scene.spawnGhost(this); }

    // jump-cancel out of a dash
    if (this.jumpBuf > 0) {
      const onGround = this.solid(this.x, this.y + 1);
      const wall = this.wallDir(CFG.WALL_JUMP_CHECK);
      if (onGround && this.dashDir.x !== 0) { this.dashJump(); return; }
      if (wall !== 0) { this.state = 'normal'; this.wallJump(-wall, false, inp); return; }
    }

    this.moveX(this.vx * dt);
    this.moveY(this.vy * dt);

    if (this.dashTimer <= 0) {
      this.state = 'normal';
      this.vx = this.dashDir.x * CFG.DASH_END_SPEED;
      this.vy = this.dashDir.y * CFG.DASH_END_SPEED;
      if (this.vy < 0) this.vy *= 0.75;
    }
  }

  // scripted ballistic mega-jump (finale): no input, full gravity, ends when landing
  startLeap(vx, vy) {
    this.state = 'leap';
    this.vx = vx; this.vy = vy; this.facing = Math.sign(vx) || 1;
    this.remX = 0; this.remY = 0; this.varJump = 0; this.jumpBuf = 0; this.ghostT = 0;
  }

  updateLeap(dt) {
    this.ghostT -= dt;
    if (this.ghostT <= 0) { this.ghostT = 0.04; this.scene.spawnGhost(this); }
    this.vy = Math.min(this.vy + CFG.GRAVITY * dt, 400);
    this.moveX(this.vx * dt);
    const falling = this.vy > 0;
    if (this.moveY(this.vy * dt) && falling) {          // landed
      this.state = 'normal';
      this.vx = Math.min(this.vx, CFG.RUN_MAX);
    }
  }

  // ---- actions -------------------------------------------------------------
  wallDir(dist) {
    if (this.solid(this.x + dist, this.y)) return 1;
    if (this.solid(this.x - dist, this.y)) return -1;
    return 0;
  }

  jump(inp) {
    this.jumpBuf = 0; this.coyote = 0;
    if (this.inPowder) {                       // a weak kick off the snow, no running boost, no variable jump
      this.vy = CFG.POWDER_JUMP; this.remY = 0;
      return;
    }
    this.vx += CFG.JUMP_HBOOST * inp.x;
    this.vy = CFG.JUMP_SPEED;
    this.varJump = CFG.VAR_JUMP_TIME; this.varJumpSpeed = this.vy;
    this.remY = 0;
  }

  wallJump(dir, grabbing, inp) {
    this.jumpBuf = 0; this.coyote = 0;
    if (grabbing && inp.x === 0 && this.stamina > CFG.CLIMB_JUMP_COST) {
      // straight climb-jump: hop up the wall, stamina cost
      this.stamina -= CFG.CLIMB_JUMP_COST;
      this.vx = 0;
    } else {
      this.vx = CFG.WALL_JUMP_HSPEED * dir;
      this.wallJumpLock = CFG.WALL_JUMP_LOCK; this.wallJumpDir = dir;
      this.facing = dir;
    }
    this.vy = CFG.JUMP_SPEED;
    this.varJump = CFG.VAR_JUMP_TIME; this.varJumpSpeed = this.vy;
    this.remY = 0;
  }

  // dash along the ground then jump = super jump; dash diagonally down then jump = hyper jump
  dashJump() {
    this.state = 'normal'; this.jumpBuf = 0;
    const hyper = this.dashDir.y > 0;
    this.facing = this.dashDir.x;
    this.vx = (hyper ? CFG.HYPER_JUMP_H : CFG.SUPER_JUMP_H) * this.dashDir.x;
    this.vy = hyper ? CFG.HYPER_JUMP_V : CFG.JUMP_SPEED;
    this.varJump = hyper ? 0 : CFG.VAR_JUMP_TIME; this.varJumpSpeed = this.vy;
    this.scene.spawnGhost(this);
  }

  startDash(inp) {
    let dx = inp.x, dy = inp.y;
    if (dx === 0 && dy === 0) dx = this.facing;
    const len = Math.hypot(dx, dy);
    dx /= len; dy /= len;
    this.dashDir = { x: Math.round(dx * 1000) / 1000, y: Math.round(dy * 1000) / 1000 };
    this.vx = dx * CFG.DASH_SPEED; this.vy = dy * CFG.DASH_SPEED;
    if (dx !== 0) this.facing = Math.sign(dx);
    this.dashes--; this.dashBuf = 0; this.jumpBuf = 0; this.varJump = 0;
    this.dashTimer = CFG.DASH_TIME; this.dashCd = CFG.DASH_COOLDOWN; this.ghostT = 0;
    this.state = 'dash';
    this.scene.onDash(this);
  }

  refillDash() {
    if (this.dashes < this.maxDashes) { this.dashes = this.maxDashes; return true; }
    return false;
  }

  sync() {
    const alpha = this.invuln > 0 && Math.floor(this.invuln * 16) % 2 === 0 ? 0.3 : 1; // blink while invulnerable
    this.body.setPosition(this.x, this.y).setFlipX(this.facing < 0).setAlpha(alpha);
    // origin at the bottom-middle of the horns so they grow upward from the head (same spot at scale 1)
    this.hair.setOrigin(0.5, 1).setScale(this.hornScale).setPosition(this.x + 4, this.y + 4)
      .setFlipX(this.facing < 0).setAlpha(alpha)
      .setTint(this.dashes > 0 ? 0xe8443c : 0x4fc3f7);
  }

  hide() { this.body.setVisible(false); this.hair.setVisible(false); }
}
