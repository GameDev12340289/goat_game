---
name: sonic-pi-composer
description: Compose, audition, and save music for the goat game using the locally installed Sonic Pi via the `sonic-pi` MCP server. Use when asked to write, play, tweak, or save game music, themes, or ambience.
---

# Sonic Pi composer

Sonic Pi 5 must be open on the PC. The `sonic-pi` MCP server (`tools/sonic-pi-mcp/server.js`, registered in `.mcp.json`) is your instrument.

## Tools
- `sonic_pi_status` – confirm Sonic Pi is reachable (do this first).
- `sonic_pi_play` – run Sonic Pi code; returns Ruby errors if any. Fix and resend until clean.
- `sonic_pi_stop` / `sonic_pi_volume` – silence or set master level.
- `sonic_pi_save_track` / `sonic_pi_list_tracks` / `sonic_pi_read_track` / `sonic_pi_play_track` – tracks live as `.rb` files in `music/`.

## Workflow
1. Check the mood/scene (levels in `src/levels/`: mountain, winter, storm, boss, elder, finish, wreckage; menu).
2. Stop old music, then audition with `sonic_pi_play`. You cannot hear it: judge by error output, and ask the user how it sounds; iterate on their feedback.
3. Once approved, `sonic_pi_save_track` with a kebab-case name (e.g. `mountain-theme`).

## Writing rules
- Start with `use_bpm N`, then one `live_loop` per layer (drums, bass, chords, melody, ambience). Give each loop `sync :clock` or a shared `cue` so layers stay in time: one `live_loop :clock do cue :tick; sleep 4 end`, others use `sync :tick`.
- Loops must always `sleep`; otherwise Sonic Pi errors with a time warp.
- Use `with_fx :reverb`, `:lpf`, `:echo` for atmosphere. Keep `amp:` low (0.3–0.8) so layers don't clip.
- Make music loop seamlessly (games repeat tracks): fixed length phrases, `ring`/`.tick`, no one-shot endings unless it's a jingle.
- Use `use_random_seed` for repeatable variation.
- Escape nothing special: pass code verbatim; newlines are fine. Avoid `sample` names not shipped with Sonic Pi.

## Mood palette (starting points)
- Mountain/climb: `:piano` or `:pretty_bell`, major pentatonic, bpm 90, hopeful.
- Winter: `:hollow`/`:dull_bell` high, sparse, slow, big reverb, minor 9ths.
- Storm/Cyclone: `:dsaw` + `:noise`, low rumble, fast hats, minor, bpm 140.
- Boss: `:tb303`/`:prophet` ostinato, `:bd_haus` kick, chromatic tension, bpm 150.
- Elder/finish: warm `:blade`/`:piano` chords, major, slow, resolved.
- Wreckage: dissonant `:dark_ambience`, sparse hits.

## Using tracks in the game
Sonic Pi plays on the PC, not in the browser build. To ship music with the game, record from Sonic Pi (Rec button) to a `.wav`/`.mp3` into the game's assets and load it in Phaser (`this.load.audio`). Saved `.rb` files are the editable source.
