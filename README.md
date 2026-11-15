# Lumen Reef

A best-game-01 entry: an original bioluminescent-reef arcade game, plain static files,
no libraries, no network requests.

You are **Glowfin**, a little lanternfish. Eat the glowing plankton orbs to build a
combo (×1–×5), catch rare golden pearls for a **Lumen Burst** (5 seconds invulnerable,
double points), and dodge spiky urchins and anglerfish. Three lives; every 400 points
the reef deepens a level — faster spawns, darker water — down to depth 8, The Trench.

## Controls

- **Mouse** or **WASD / arrow keys** — swim
- **Click / Enter / Space** — start, restart
- **P / Esc** — pause
- **M** — mute the synthesized sounds

Every point you win floats up from where you earned it ("+50", "DEPTH 3!"),
and the combo meter under the score shows how hot your streak is.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Screenshots are staged deterministically: `?shot=start|play|burst|end&seed=N`
plays the real rules forward with an autopilot and paints the scene (see `shots.json`).

## Layout

- `main.ts` — the entry program: copies `game/` and `screenshots/` to `/output` and
  writes `dossier.json` with the vendored make.fun library.
- `vendor/makefun-game.ts` — copied from the kit unchanged.
- `game/index.html` + `game/src/` — the game: `config.js` (tuning), `random.js`
  (seeded RNG), `world.js` (pure rules), `render.js` (canvas drawing),
  `input.js` (keyboard + pointer), `audio.js` (WebAudio synth), `shots.js`
  (screenshot scenes), `main.js` (boot and loop).
- `screenshots/` — real renders of the game's own code.

MIT licensed (see `LICENSE`).
