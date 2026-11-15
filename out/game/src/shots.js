// The screenshot scenes behind ?shot=start|play|burst|end. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a simple autopilot
// (chase the nearest glowing food, keep clear of urchins and anglerfish), so the frame is
// what a short game really looks like and the same seed always gives the same frame.

import { FIELD, STEP } from './config.js';
import { EVENT_OVER, KIND_ANGLER, KIND_ORB, KIND_PEARL, KIND_URCHIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const BURST_SECONDS = 14;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

/** A deterministic stand-in for random in the end scene's hurried pilot. */
function pseudoRandom(elapsed, salt) {
  const value = Math.sin(elapsed * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * The steering vector: toward the nearest food, pushed away from hazards that are close.
 * `skill` 1 is a careful pilot; 0 is a hurried one that only notices danger very late and
 * sometimes dithers, so it is caught out once the reef speeds up.
 */
function autopilot(state, skill) {
  const player = state.player;
  const dangerRadius = skill > 0.5 ? 150 : 55;
  let awayX = 0;
  let awayY = 0;
  let nearest = null;
  let nearestScore = Infinity;
  for (let index = 0; index < state.items.length; index += 1) {
    const item = state.items[index];
    if (!item.active) continue;
    const dx = player.x - item.x;
    const dy = player.y - item.y;
    const distance = Math.hypot(dx, dy);
    if (item.kind === KIND_URCHIN || item.kind === KIND_ANGLER) {
      if (distance < dangerRadius && distance > 0.01) {
        const weight = (dangerRadius - distance) / dangerRadius;
        awayX += (dx / distance) * weight;
        awayY += (dy / distance) * weight;
      }
    } else {
      const worth = item.kind === KIND_PEARL ? 0.45 : 1;
      const score = distance * worth;
      if (score < nearestScore) {
        nearestScore = score;
        nearest = item;
      }
    }
  }
  let towardX = 0;
  let towardY = 0;
  if (nearest !== null) {
    const dx = nearest.x - player.x;
    const dy = nearest.y - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 1) {
      towardX = dx / distance;
      towardY = dy / distance;
    }
  } else {
    towardX = FIELD.width / 2 > player.x ? 1 : -1;
  }
  const awayStrength = Math.hypot(awayX, awayY);
  let steerX = towardX;
  let steerY = towardY;
  if (awayStrength > 0.05) {
    steerX = towardX * 0.45 + (awayX / awayStrength) * 1.6;
    steerY = towardY * 0.45 + (awayY / awayStrength) * 1.6;
  }
  if (skill <= 0.5 && pseudoRandom(state.elapsed, 3) < 0.3) {
    // The hurried pilot dithers: a random nudge instead of the good line.
    const angle = pseudoRandom(state.elapsed, 7) * Math.PI * 2;
    steerX += Math.cos(angle) * 0.9;
    steerY += Math.sin(angle) * 0.9;
  }
  const length = Math.hypot(steerX, steerY);
  if (length < 0.01) return { x: 0, y: 0 };
  return { x: steerX / length, y: steerY / length };
}

function playFor(world, seconds, skill) {
  for (let index = 0; index < seconds / STEP; index += 1) {
    const steer = autopilot(world.state, skill);
    if (world.step(STEP, steer.x, steer.y, false) & EVENT_OVER) return true;
  }
  return world.state.lives === 0;
}

/** After a game over, let the hit flash and the shake fade before the frame is painted. */
function settle(world) {
  for (let index = 0; index < 0.6 / STEP; index += 1) world.step(STEP, 0, 0, true);
}

/**
 * Set `world` to the named scene (start, play, burst or end; any other name is start) and
 * return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'burst' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, 0, 0, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'burst') {
    playFor(world, BURST_SECONDS, 1);
    world.forcePearl();
    // Only a quarter of a second past the catch, so the golden burst is still bright.
    for (let index = 0; index < 0.25 / STEP; index += 1) {
      const steer = autopilot(world.state, 1);
      world.step(STEP, steer.x, steer.y, false);
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'end') {
    const over = playFor(world, END_LIMIT_SECONDS, 0);
    settle(world);
    return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  const over = playFor(world, PLAY_SECONDS, 1);
  if (over) settle(world);
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
