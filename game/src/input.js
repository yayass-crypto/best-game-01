// Keyboard and pointer input. Held keys give a steering vector; the mouse steers Glowfin
// toward the pointer when it has moved recently, so the game plays with keyboard or mouse.
// One-shot presses (start or restart, pause, mute) are queued as bit flags and taken once by
// the loop, so a press between two frames is never lost and never counted twice.

import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter', 'KeyR']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

/** How long after the pointer last moved it still steers the fish, in seconds. */
const POINTER_FRESH = 3;

export function createInput(target) {
  const keys = { up: false, down: false, left: false, right: false };
  let actions = 0;
  const pointer = { x: FIELD.width / 2, y: FIELD.height / 2, fresh: 0, inside: false };

  function setKey(code, value) {
    if (UP.has(code)) keys.up = value;
    else if (DOWN.has(code)) keys.down = value;
    else if (LEFT.has(code)) keys.left = value;
    else if (RIGHT.has(code)) keys.right = value;
  }

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code)) {
      setKey(event.code, true);
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => setKey(event.code, false));
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    keys.up = false;
    keys.down = false;
    keys.left = false;
    keys.right = false;
  });

  function pointerToField(event) {
    const rect = target.getBoundingClientRect();
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    const offsetX = (rect.width - FIELD.width * scale) / 2;
    const offsetY = (rect.height - FIELD.height * scale) / 2;
    return {
      x: (event.clientX - rect.left - offsetX) / scale,
      y: (event.clientY - rect.top - offsetY) / scale,
    };
  }

  target.addEventListener('pointermove', (event) => {
    const field = pointerToField(event);
    pointer.x = field.x;
    pointer.y = field.y;
    pointer.fresh = POINTER_FRESH;
    pointer.inside = field.x >= 0 && field.x <= FIELD.width && field.y >= 0 && field.y <= FIELD.height;
  });
  target.addEventListener('pointerdown', () => {
    actions |= ACTION_CONFIRM;
  });

  return {
    /**
     * The steering vector for this frame: the held keys win; otherwise the pointer, when it
     * moved recently and sits inside the field — eased, so Glowfin slows as it arrives.
     */
    steer(player, dt) {
      const kx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      const ky = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
      if (kx !== 0 || ky !== 0) {
        const length = Math.hypot(kx, ky);
        return { x: kx / length, y: ky / length };
      }
      if (pointer.fresh > 0) pointer.fresh = Math.max(0, pointer.fresh - dt);
      if (pointer.inside && pointer.fresh > 0) {
        const dx = pointer.x - player.x;
        const dy = pointer.y - player.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 12) {
          const strength = Math.min(1, distance / 140);
          return { x: (dx / distance) * strength, y: (dy / distance) * strength };
        }
      }
      return { x: 0, y: 0 };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
