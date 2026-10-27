# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Summit" — a Celeste-style 2D pixel platformer about a goat climbing a mountain, built with Phaser 3.90 (plain browser JS, no bundler, no TypeScript). Controls: A/D move, W climb, Shift dash (see `readme`; GameScene's `setupKeys` has the full key map).

## Commands

```bash
npm start        # node dev-server.js -> http://localhost:5173 (static server, no-store caching; PORT env overrides)
npm run build    # node build.js -> copies src/ + index.html into dist/, vendors Phaser to dist/vendor/ (Netlify publishes dist/)
```

There is no test suite, linter, or formatter (`npm test` is a stub). Verify changes by running the dev server and playing/inspecting in a browser. `.claude/launch.json` defines a `summit` preview server on port 5173.

- `http://localhost:5173/?dev` grants Tough Hide for free (see `Save.load`).
- `dist/` is gitignored build output — never edit it; edit `src/`.

## Architecture

**No modules.** Every file in `src/` is a classic `<script>` loaded by `index.html` in a fixed order, and shares globals (`CFG`, `Save`, `LEVELS`, `GameScene`, `Player`, ...). When adding a new source file you must add a `<script>` tag to `index.html` in the right place (dependencies first; `main.js` last). `build.js` copies `src/` wholesale, so no build config changes are needed.

**Scenes** (registered in `src/main.js`): Boot → Menu (+ `ShopScene`) → Game, with `UIScene` running in parallel as an overlay and `JeffScene` for the merchant. Canvas is `CFG.W*ZOOM` × `CFG.H*ZOOM`; the world camera zooms by `CFG.ZOOM`, UI text is drawn at full res.

**GameScene is split by mixin.** `src/scenes/GameScene.js` holds lifecycle, input, and the game loop; the rest of its methods live in `src/scenes/game/*.js`, each doing `Object.assign(GameScene.prototype, {...})` (rooms, world, abilities, damage, storm, progress, jeff, hud, lightning, swirl, warps, etc.). The header comment in `GameScene.js` maps each file to its responsibility. New game-scene behaviour belongs in one of these mixins (or a new one, registered in `index.html` after `GameScene.js`).

**Levels are data, not code.** `src/levels/*.js` define rooms as 40×23 tile grids of ASCII rows (`CFG.COLS`/`CFG.ROWS`). `mountain.js` defines the `LEVELS` array; the other level files (`winter`, `wreckage`, `elder`, `stormlings`, `debris`, `hand`, `finish`) push more rooms onto it, so load order in `index.html` determines room indexes. `builders.js` has helpers (`R`, `ground`, ...) for composing rows. The legend (`#` solid, `^` spike, `P` spawn, `D` dash crystal, `S` coin, `W` powder snow, `a`/`b` popping spikes, `T` tornado, `X` warp) and per-room options (`exit`, `winds`, `rise`, `boss`, `finale`, `parts`, `zoom`) are documented in the comments at the top of `builders.js`; `rooms.js` (`loadRoom`/`parseRoom`) interprets them. Room numbers in the code are 0-based indexes (e.g. `GameScene.CHASE_FIRST = 10` is "room 11"; the boss chase spans indexes 10–18).

**Tuning lives in `src/config.js` (`CFG`).** Speeds are px/s, times are seconds. Physics constants, hitbox, dash/climb/stamina, hazard timings, and upgrade values are all there — change numbers there rather than hard-coding in entities.

**Entities/systems** at `src/` top level: `Player` (movement state machine), `Boss` (giant goat chase), `Hand`, `Cyclone`, `Gusts`, `Withered`.

**Persistence:** `src/Save.js` wraps `localStorage` (key `summit-save-v1`) for horns, upgrades, unlocked rooms, and trial flags. All access is try/catch-wrapped because storage can be blocked — keep it that way, and add new save fields to `Save.data` defaults so older saves merge cleanly.

## Music tooling

`tools/sonic-pi-mcp/server.js` is a local MCP server (registered in `.mcp.json`) that drives an installed Sonic Pi; tracks are saved as `.rb` in `music/`. Use the `sonic-pi-composer` skill (`.claude/skills/`) for composing — Sonic Pi 5 must be open.
