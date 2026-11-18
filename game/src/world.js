// The game's rules and state, with no drawing and no browser in it: Glowfin the lanternfish,
// the plankton orbs and golden pearls it eats, the urchins and anglerfish it dodges, the combo
// and the Lumen Burst, score, lives and depth levels. step() advances one fixed step and returns
// what happened as bit flags, so the caller can react without the world knowing about screens or
// sound. Nothing here allocates after createWorld returns.

import {
  ANGLER,
  COMBO,
  FIELD,
  JELLY,
  LEVEL,
  LIVES,
  ORB,
  PEARL,
  PLAYER,
  POOL,
  SHIELD,
  URCHIN,
} from './config.js';

export const KIND_ORB = 0;
export const KIND_PEARL = 1;
export const KIND_URCHIN = 2;
export const KIND_ANGLER = 3;
export const KIND_JELLY = 4;
export const KIND_SHIELD = 5;

export const EVENT_EAT = 1;
export const EVENT_PEARL = 2;
export const EVENT_HIT = 4;
export const EVENT_OVER = 8;
export const EVENT_LEVEL = 16;
export const EVENT_SHIELD = 32;
export const EVENT_BLOCK = 64;

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function createWorld(random) {
  const player = {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    vx: 0,
    vy: 0,
    r: PLAYER.radius,
    invuln: 0,
    wag: 0,
    face: 1,
    shield: false,
  };
  const items = [];
  for (let index = 0; index < POOL.items; index += 1) {
    items.push({ active: false, kind: KIND_ORB, x: 0, y: 0, r: 0, vx: 0, vy: 0, baseX: 0, sway: 0, phase: 0 });
  }
  const particles = [];
  for (let index = 0; index < POOL.particles; index += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, color: '#fff' });
  }
  const bubbles = [];
  for (let index = 0; index < POOL.bubbles; index += 1) {
    bubbles.push({ active: false, x: 0, y: 0, r: 2, vy: 0, wobble: 0, phase: 0 });
  }
  const motes = [];
  for (let index = 0; index < POOL.motes; index += 1) {
    motes.push({ x: 0, y: 0, r: 1, speed: 6, drift: 0, phase: 0 });
  }
  // Floating score popups: the "+10" that rises and fades wherever points are won.
  const texts = [];
  for (let index = 0; index < POOL.texts; index += 1) {
    texts.push({ active: false, x: 0, y: 0, life: 0, max: 1, value: '', color: '#fff', size: 22 });
  }
  // The reef itself: corals, rocks and swaying weeds, laid out once per game from the seed.
  const reef = { corals: [], weeds: [], rocks: [] };
  for (let index = 0; index < 9; index += 1) {
    reef.corals.push({ x: 40 + index * 150 + random() * 60, h: 46 + random() * 90, w: 34 + random() * 44, hue: random() });
  }
  for (let index = 0; index < 26; index += 1) {
    reef.weeds.push({ x: random() * FIELD.width, h: 60 + random() * 130, phase: random() * Math.PI * 2, lean: 0.3 + random() * 0.5 });
  }
  for (let index = 0; index < 7; index += 1) {
    reef.rocks.push({ x: random() * FIELD.width, y: FIELD.height - 8 - random() * 26, r: 22 + random() * 42 });
  }

  const state = {
    player,
    items,
    particles,
    bubbles,
    motes,
    texts,
    reef,
    score: 0,
    lives: LIVES,
    level: 1,
    combo: 1,
    comboTimer: 0,
    burst: 0,
    elapsed: 0,
    shake: 0,
    flash: 0,
    orbTimer: 0.4,
    pearlTimer: PEARL.interval,
    urchinTimer: 1.2,
    anglerTimer: 5,
    jellyTimer: 3.5,
    shieldTimer: SHIELD.interval,
    bubbleTimer: 0,
  };

  function reset() {
    player.x = FIELD.width / 2;
    player.y = FIELD.height / 2;
    player.vx = 0;
    player.vy = 0;
    player.invuln = 0;
    player.wag = 0;
    player.face = 1;
    player.shield = false;
    for (const item of items) item.active = false;
    for (const particle of particles) particle.active = false;
    for (const bubble of bubbles) bubble.active = false;
    for (const text of texts) text.active = false;
    for (const mote of motes) {
      mote.x = random() * FIELD.width;
      mote.y = random() * FIELD.height;
      mote.r = 0.8 + random() * 1.8;
      mote.speed = 5 + random() * 12;
      mote.drift = (random() - 0.5) * 8;
      mote.phase = random() * Math.PI * 2;
    }
    state.score = 0;
    state.lives = LIVES;
    state.level = 1;
    state.combo = 1;
    state.comboTimer = 0;
    state.burst = 0;
    state.elapsed = 0;
    state.shake = 0;
    state.flash = 0;
    state.orbTimer = 0.4;
    state.pearlTimer = PEARL.interval;
    state.urchinTimer = 1.2;
    state.anglerTimer = 5;
    state.jellyTimer = 3.5;
    state.shieldTimer = SHIELD.interval;
    state.bubbleTimer = 0;
  }

  function freeItem() {
    for (let index = 0; index < items.length; index += 1) if (!items[index].active) return items[index];
    return null;
  }

  function freeParticle() {
    for (let index = 0; index < particles.length; index += 1) if (!particles[index].active) return particles[index];
    return null;
  }

  function freeBubble() {
    for (let index = 0; index < bubbles.length; index += 1) if (!bubbles[index].active) return bubbles[index];
    return null;
  }

  /** A floating score popup at (x, y): "+10", "+250", "DEPTH 3!" — it rises and fades. */
  function spawnText(x, y, value, color, size) {
    for (let index = 0; index < texts.length; index += 1) {
      if (texts[index].active) continue;
      const text = texts[index];
      text.active = true;
      text.x = x;
      text.y = y;
      text.max = 1.1;
      text.life = text.max;
      text.value = value;
      text.color = color;
      text.size = size;
      return;
    }
  }

  /** A little burst of glowing sparks at (x, y). */
  function burst(x, y, color, count, speed) {
    for (let index = 0; index < count; index += 1) {
      const particle = freeParticle();
      if (particle === null) return;
      const angle = random() * Math.PI * 2;
      const velocity = speed * (0.3 + random() * 0.7);
      particle.active = true;
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * velocity;
      particle.vy = Math.sin(angle) * velocity - 20;
      particle.max = 0.6 + random() * 0.5;
      particle.life = particle.max;
      particle.size = 1.5 + random() * 2.5;
      particle.color = color;
    }
  }

  function spawnOrb() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_ORB;
    item.r = ORB.radius;
    item.x = 30 + random() * (FIELD.width - 60);
    item.baseX = item.x;
    item.y = -item.r * 2;
    item.vy = ORB.fall + ORB.fallPerLevel * (state.level - 1) + random() * 22;
    item.vx = 0;
    item.sway = ORB.sway * (0.5 + random());
    item.phase = random() * Math.PI * 2;
  }

  function spawnPearl() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_PEARL;
    item.r = PEARL.radius;
    item.x = 60 + random() * (FIELD.width - 120);
    item.baseX = item.x;
    item.y = -item.r * 2;
    item.vy = PEARL.fall;
    item.vx = 0;
    item.sway = 18;
    item.phase = random() * Math.PI * 2;
  }

  function spawnUrchin() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_URCHIN;
    item.r = URCHIN.radius;
    item.x = 30 + random() * (FIELD.width - 60);
    item.baseX = item.x;
    item.y = -item.r * 2;
    item.vy = URCHIN.fall + URCHIN.fallPerLevel * (state.level - 1) + random() * 26;
    item.vx = 0;
    item.sway = 10 + random() * 14;
    item.phase = random() * Math.PI * 2;
  }

  function spawnAngler() {
    const item = freeItem();
    if (item === null) return;
    const fromLeft = random() < 0.5;
    item.active = true;
    item.kind = KIND_ANGLER;
    item.r = ANGLER.radius;
    item.y = 110 + random() * (FIELD.height - 260);
    item.x = fromLeft ? -item.r * 2 : FIELD.width + item.r * 2;
    item.vx = (fromLeft ? 1 : -1) * (ANGLER.speed + ANGLER.speedPerLevel * (state.level - 1) + random() * 40);
    item.vy = 0;
    item.baseX = item.x;
    item.sway = 0;
    item.phase = random() * Math.PI * 2;
  }

  function spawnJelly() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_JELLY;
    item.r = JELLY.radius;
    item.x = 40 + random() * (FIELD.width - 80);
    item.baseX = item.x;
    item.y = -item.r * 2;
    item.vy = JELLY.fall + JELLY.fallPerLevel * (state.level - 1) + random() * 10;
    item.vx = 0;
    item.sway = JELLY.sway * (0.6 + random() * 0.8);
    item.phase = random() * Math.PI * 2;
  }

  function spawnShield() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_SHIELD;
    item.r = SHIELD.radius;
    item.x = 60 + random() * (FIELD.width - 120);
    item.baseX = item.x;
    item.y = -item.r * 2;
    item.vy = SHIELD.fall;
    item.vx = 0;
    item.sway = 22;
    item.phase = random() * Math.PI * 2;
  }

  function orbInterval() {
    return Math.max(ORB.minInterval, ORB.interval * ORB.intervalScale ** (state.level - 1));
  }

  function urchinInterval() {
    return Math.max(URCHIN.minInterval, URCHIN.interval * URCHIN.intervalScale ** (state.level - 1));
  }

  function jellyInterval() {
    return Math.max(JELLY.minInterval, JELLY.interval * JELLY.intervalScale ** (state.level - 1));
  }

  function anglerInterval() {
    return Math.max(ANGLER.minInterval, ANGLER.interval * ANGLER.intervalScale ** (state.level - 1));
  }

  /**
   * One fixed step. (mx, my) is the steering vector in [-1, 1] each way (0, 0 to drift).
   * With `harmless` set (the title screen's backdrop) things drift but nothing touches the
   * player and nothing scores.
   */
  function step(dt, mx, my, harmless) {
    let events = 0;
    state.elapsed += dt;
    const nextLevel = Math.min(LEVEL.max, 1 + Math.floor(state.score / LEVEL.points));
    if (nextLevel > state.level) {
      state.level = nextLevel;
      spawnText(player.x, player.y - 52, `DEPTH ${nextLevel}!`, '#ffd75e', 30);
      events |= EVENT_LEVEL;
    }

    // Glowfin steers toward the input with smooth acceleration and drag.
    const speed = Math.hypot(mx, my);
    if (speed > 1) {
      mx /= speed;
      my /= speed;
    }
    player.vx += mx * PLAYER.accel * dt;
    player.vy += my * PLAYER.accel * dt;
    const drag = Math.max(0, 1 - PLAYER.drag * dt);
    player.vx *= drag;
    player.vy *= drag;
    const velocity = Math.hypot(player.vx, player.vy);
    if (velocity > PLAYER.maxSpeed) {
      player.vx = (player.vx / velocity) * PLAYER.maxSpeed;
      player.vy = (player.vy / velocity) * PLAYER.maxSpeed;
    }
    player.x = Math.min(FIELD.width - player.r, Math.max(player.r, player.x + player.vx * dt));
    player.y = Math.min(FIELD.height - player.r - 8, Math.max(player.r + 8, player.y + player.vy * dt));
    if (Math.abs(player.vx) > 30) player.face = player.vx > 0 ? 1 : -1;
    player.wag += dt * (6 + velocity / 40);
    if (player.invuln > 0) player.invuln = Math.max(0, player.invuln - dt);
    if (state.burst > 0) state.burst = Math.max(0, state.burst - dt);
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 1;
    }
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 2.2);
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 2.5);

    // Spawning.
    state.orbTimer -= dt;
    if (state.orbTimer <= 0) {
      spawnOrb();
      state.orbTimer += orbInterval() + random() * 0.25;
    }
    state.pearlTimer -= dt;
    if (state.pearlTimer <= 0) {
      spawnPearl();
      state.pearlTimer += PEARL.interval + random() * 4;
    }
    if (!harmless || state.elapsed < 6) {
      state.urchinTimer -= dt;
      if (state.urchinTimer <= 0) {
        spawnUrchin();
        state.urchinTimer += urchinInterval() + random() * 0.4;
      }
      // Jellyfish drift through the title backdrop too, so the first screen
      // already shows the reef's slow ambush.
      state.jellyTimer -= dt;
      if (state.jellyTimer <= 0) {
        spawnJelly();
        state.jellyTimer += jellyInterval() + random() * 2;
      }
    }
    if (state.level >= 2 && !harmless) {
      state.anglerTimer -= dt;
      if (state.anglerTimer <= 0) {
        spawnAngler();
        state.anglerTimer += anglerInterval() + random() * 2;
      }
    }
    if (!harmless) {
      state.shieldTimer -= dt;
      if (state.shieldTimer <= 0) {
        spawnShield();
        state.shieldTimer += SHIELD.interval + random() * 6;
      }
    }

    // A bubble trails from Glowfin every little while.
    state.bubbleTimer -= dt;
    if (state.bubbleTimer <= 0) {
      const bubble = freeBubble();
      if (bubble !== null) {
        bubble.active = true;
        bubble.x = player.x - player.face * player.r * 0.6;
        bubble.y = player.y - player.r * 0.4;
        bubble.r = 2 + random() * 3.5;
        bubble.vy = 34 + random() * 26;
        bubble.wobble = 8 + random() * 10;
        bubble.phase = random() * Math.PI * 2;
      }
      state.bubbleTimer += 0.35 + random() * 0.3;
    }

    // Items drift, sway, and meet the player.
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      if (item.kind === KIND_ANGLER) {
        item.x += item.vx * dt;
        item.y += Math.sin(state.elapsed * 2.2 + item.phase) * ANGLER.wobble * dt;
        if (item.x < -80 || item.x > FIELD.width + 80) item.active = false;
      } else {
        item.y += item.vy * dt;
        item.x = item.baseX + Math.sin(state.elapsed * 1.4 + item.phase) * item.sway;
        if (item.y > FIELD.height + 40) {
          item.active = false;
          continue;
        }
      }
      if (harmless) continue;
      const reach = item.r + player.r - 4;
      if (dist2(item.x, item.y, player.x, player.y) > reach * reach) continue;
      if (item.kind === KIND_ORB) {
        item.active = false;
        state.combo = state.comboTimer > 0 ? Math.min(COMBO.max, state.combo + 1) : 1;
        state.comboTimer = COMBO.window;
        const gained = ORB.points * state.combo * (state.burst > 0 ? 2 : 1);
        state.score += gained;
        spawnText(item.x, item.y - 18, `+${gained}`, '#5ff2d6', 22);
        burst(item.x, item.y, '#5ff2d6', 12, 130);
        events |= EVENT_EAT;
      } else if (item.kind === KIND_PEARL) {
        item.active = false;
        state.combo = state.comboTimer > 0 ? Math.min(COMBO.max, state.combo + 1) : 1;
        state.comboTimer = COMBO.window;
        state.score += PEARL.points * state.combo;
        spawnText(item.x, item.y - 20, `+${PEARL.points * state.combo}`, '#ffd75e', 30);
        state.burst = PEARL.burstSeconds;
        burst(item.x, item.y, '#ffd75e', 26, 220);
        burst(player.x, player.y, '#fff6c9', 18, 160);
        events |= EVENT_PEARL;
      } else if (item.kind === KIND_SHIELD) {
        // A shield bubble: the first one arms Glowfin's shield, a spare one pays points.
        item.active = false;
        if (!player.shield) {
          player.shield = true;
          state.score += 25;
          spawnText(item.x, item.y - 20, 'SHIELD!', '#6ee7ff', 26);
          burst(item.x, item.y, '#6ee7ff', 18, 160);
          events |= EVENT_SHIELD;
        } else {
          state.score += SHIELD.points;
          spawnText(item.x, item.y - 20, `+${SHIELD.points}`, '#6ee7ff', 22);
          burst(item.x, item.y, '#6ee7ff', 12, 130);
          events |= EVENT_EAT;
        }
      } else if (state.burst > 0) {
        // During a Lumen Burst the light scares hazards off — and pays for it.
        item.active = false;
        state.score += 25;
        spawnText(item.x, item.y - 18, '+25', '#ffd75e', 22);
        burst(item.x, item.y, '#ffd75e', 16, 180);
        events |= EVENT_EAT;
      } else if (player.invuln === 0) {
        item.active = false;
        if (player.shield) {
          // The shield absorbs the hit outright: no life lost, combo kept.
          player.shield = false;
          player.invuln = 1;
          state.shake = 0.5;
          burst(player.x, player.y, '#6ee7ff', 20, 180);
          spawnText(player.x, player.y - 40, 'SAVED!', '#6ee7ff', 24);
          events |= EVENT_BLOCK;
        } else {
          state.lives -= 1;
          state.combo = 1;
          state.comboTimer = 0;
          player.invuln = PLAYER.invulnerable;
          state.shake = 1;
          state.flash = 1;
          burst(player.x, player.y, '#ff6b81', 22, 200);
          events |= EVENT_HIT;
          if (state.lives === 0) {
            events |= EVENT_OVER;
            break;
          }
        }
      }
    }

    // Particles, bubbles and floating texts drift and fade.
    for (let index = 0; index < particles.length; index += 1) {
      const particle = particles[index];
      if (!particle.active) continue;
      particle.life -= dt;
      if (particle.life <= 0) {
        particle.active = false;
        continue;
      }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy -= 26 * dt;
    }
    for (let index = 0; index < texts.length; index += 1) {
      const text = texts[index];
      if (!text.active) continue;
      text.life -= dt;
      if (text.life <= 0) {
        text.active = false;
        continue;
      }
      text.y -= 36 * dt;
    }
    for (let index = 0; index < bubbles.length; index += 1) {
      const bubble = bubbles[index];
      if (!bubble.active) continue;
      bubble.y -= bubble.vy * dt;
      bubble.x += Math.sin(state.elapsed * 3 + bubble.phase) * bubble.wobble * dt;
      if (bubble.y < -12) bubble.active = false;
    }
    for (let index = 0; index < motes.length; index += 1) {
      const mote = motes[index];
      mote.y += mote.speed * dt;
      mote.x += mote.drift * dt + Math.sin(state.elapsed * 0.7 + mote.phase) * 4 * dt;
      if (mote.y > FIELD.height + 4) {
        mote.y = -4;
        mote.x = random() * FIELD.width;
      }
      if (mote.x < -4) mote.x = FIELD.width + 4;
      else if (mote.x > FIELD.width + 4) mote.x = -4;
    }
    return events;
  }

  /** Stage a golden pearl right on Glowfin so the next step collects it (screenshot scenes). */
  function forcePearl() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_PEARL;
    item.r = PEARL.radius;
    item.x = player.x;
    item.y = player.y;
    item.baseX = item.x;
    item.vy = 0;
    item.vx = 0;
    item.sway = 0;
    item.phase = 0;
  }

  /** Stage a jellyfish at (x, y), drifting in place (screenshot scenes). */
  function forceJelly(x, y) {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_JELLY;
    item.r = JELLY.radius;
    item.x = x;
    item.y = y;
    item.baseX = x;
    item.vy = 0;
    item.vx = 0;
    item.sway = 0;
    item.phase = 0.6;
  }

  /** Stage a shield bubble at (x, y), drifting in place (screenshot scenes). */
  function forceShield(x, y) {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_SHIELD;
    item.r = SHIELD.radius;
    item.x = x;
    item.y = y;
    item.baseX = x;
    item.vy = 0;
    item.vx = 0;
    item.sway = 0;
    item.phase = 0.3;
  }

  reset();
  return { state, reset, step, forcePearl, forceJelly, forceShield, burst };
}
