// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the backdrop
// colour. A bioluminescent reef at night: layered water, god rays, swaying weeds, glowing
// plankton, a lanternfish with a lit lure, and a golden Lumen Burst.

import { COMBO, FIELD, FONT, LIVES, PALETTE, PEARL, WATER } from './config.js';
import { KIND_ANGLER, KIND_ORB, KIND_PEARL, KIND_URCHIN } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const PANEL = { width: 640, top: 150, line: 34, bottom: 76 };
const DEPTH_NAMES = [
  'Sunlit Shallows',
  'Coral Gardens',
  'Twilight Terrace',
  'Midnight Slope',
  'Abyssal Shelf',
  'The Deep Dark',
  'Lantern Hollow',
  'The Trench',
];
const CORAL_COLORS = ['#ff7eb6', '#c084fc', '#5eead4', '#fda4af', '#7dd3fc'];

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

function formatScore(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('SCORE ');
  const bestLabel = cachedLabel('BEST ');
  const finalLabel = cachedLabel('SCORE ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function roundRectPath(x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
  }

  function glowCircle(x, y, r, color, alpha) {
    const gradient = context.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.globalAlpha = alpha;
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
  }

  function drawWater(state) {
    const water = WATER[state.level - 1];
    const gradient = context.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, water.top);
    gradient.addColorStop(0.55, water.mid);
    gradient.addColorStop(1, water.deep);
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);

    // God rays swaying down from the surface.
    context.save();
    context.globalCompositeOperation = 'lighter';
    for (let index = 0; index < 5; index += 1) {
      const baseX = 180 + index * 240;
      const sway = Math.sin(state.elapsed * 0.24 + index * 1.7) * 46;
      const topX = baseX + sway;
      const bottomX = baseX - sway * 0.4 + 90;
      const ray = context.createLinearGradient(topX, 0, bottomX, FIELD.height);
      ray.addColorStop(0, 'rgba(140, 220, 255, 0.10)');
      ray.addColorStop(1, 'rgba(140, 220, 255, 0)');
      context.fillStyle = ray;
      context.beginPath();
      context.moveTo(topX - 34, 0);
      context.lineTo(topX + 34, 0);
      context.lineTo(bottomX + 90, FIELD.height);
      context.lineTo(bottomX - 90, FIELD.height);
      context.closePath();
      context.fill();
    }
    context.restore();
  }

  function drawReef(state) {
    // Far reef silhouettes.
    context.fillStyle = 'rgba(4, 12, 24, 0.55)';
    context.beginPath();
    context.moveTo(0, FIELD.height);
    for (let x = 0; x <= FIELD.width; x += 80) {
      const y = FIELD.height - 150 - Math.sin(x * 0.006 + 1.3) * 46 - Math.sin(x * 0.013) * 22;
      context.lineTo(x, y);
    }
    context.lineTo(FIELD.width, FIELD.height);
    context.closePath();
    context.fill();

    // Corals and rocks on the seabed.
    for (const coral of state.reef.corals) {
      const color = CORAL_COLORS[Math.floor(coral.hue * CORAL_COLORS.length) % CORAL_COLORS.length];
      context.fillStyle = color;
      context.globalAlpha = 0.85;
      for (let finger = 0; finger < 4; finger += 1) {
        const fx = coral.x + (finger - 1.5) * coral.w * 0.32;
        const fh = coral.h * (0.55 + ((finger * 37) % 10) / 22);
        context.beginPath();
        context.ellipse(fx, FIELD.height - fh / 2, coral.w * 0.2, fh / 2, 0, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
    }
    context.fillStyle = '#0a1526';
    for (const rock of state.reef.rocks) {
      context.beginPath();
      context.ellipse(rock.x, rock.y + rock.r * 0.4, rock.r, rock.r * 0.55, 0, Math.PI, 0);
      context.fill();
    }

    // Sandy seabed strip.
    const sand = context.createLinearGradient(0, FIELD.height - 26, 0, FIELD.height);
    sand.addColorStop(0, 'rgba(38, 54, 74, 0)');
    sand.addColorStop(1, 'rgba(38, 54, 74, 0.9)');
    context.fillStyle = sand;
    context.fillRect(0, FIELD.height - 26, FIELD.width, 26);
  }

  function drawMotes(state) {
    context.fillStyle = '#cfe8ff';
    for (const mote of state.motes) {
      context.globalAlpha = 0.16 + 0.14 * Math.sin(state.elapsed + mote.phase);
      context.beginPath();
      context.arc(mote.x, mote.y, mote.r, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawBubbles(state) {
    for (const bubble of state.bubbles) {
      context.strokeStyle = 'rgba(190, 235, 255, 0.55)';
      context.lineWidth = 1.4;
      context.beginPath();
      context.arc(bubble.x, bubble.y, bubble.r, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = 'rgba(255, 255, 255, 0.5)';
      context.beginPath();
      context.arc(bubble.x - bubble.r * 0.3, bubble.y - bubble.r * 0.3, bubble.r * 0.25, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawOrb(item, state) {
    const pulse = 1 + 0.14 * Math.sin(state.elapsed * 5 + item.phase);
    context.save();
    context.globalCompositeOperation = 'lighter';
    glowCircle(item.x, item.y, item.r * 3.4 * pulse, 'rgba(95, 242, 214, 0.55)', 0.8);
    context.restore();
    context.fillStyle = PALETTE.orbCore;
    context.beginPath();
    context.arc(item.x, item.y, item.r * 0.52 * pulse, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.orb;
    context.globalAlpha = 0.85;
    context.beginPath();
    context.arc(item.x, item.y, item.r * 0.8 * pulse, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
  }

  function drawPearl(item, state) {
    const pulse = 1 + 0.2 * Math.sin(state.elapsed * 6 + item.phase);
    context.save();
    context.globalCompositeOperation = 'lighter';
    glowCircle(item.x, item.y, item.r * 4.6 * pulse, 'rgba(255, 215, 94, 0.7)', 0.9);
    context.restore();
    context.fillStyle = PALETTE.pearl;
    context.beginPath();
    context.arc(item.x, item.y, item.r * pulse, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.pearlCore;
    context.beginPath();
    context.arc(item.x - item.r * 0.2, item.y - item.r * 0.25, item.r * 0.55, 0, Math.PI * 2);
    context.fill();
    // Sparkle cross.
    context.strokeStyle = 'rgba(255, 246, 201, 0.95)';
    context.lineWidth = 2;
    const s = item.r * 1.7 * pulse;
    context.beginPath();
    context.moveTo(item.x - s, item.y);
    context.lineTo(item.x + s, item.y);
    context.moveTo(item.x, item.y - s);
    context.lineTo(item.x, item.y + s);
    context.stroke();
  }

  function drawUrchin(item, state) {
    const spikes = 12;
    context.strokeStyle = PALETTE.urchinSpike;
    context.lineWidth = 3;
    context.beginPath();
    for (let index = 0; index < spikes; index += 1) {
      const angle = (index / spikes) * Math.PI * 2 + item.phase;
      const inner = item.r * 0.7;
      const outer = item.r * 1.45;
      context.moveTo(item.x + Math.cos(angle) * inner, item.y + Math.sin(angle) * inner);
      context.lineTo(item.x + Math.cos(angle) * outer, item.y + Math.sin(angle) * outer);
    }
    context.stroke();
    const gradient = context.createRadialGradient(
      item.x - item.r * 0.3, item.y - item.r * 0.35, 2, item.x, item.y, item.r,
    );
    gradient.addColorStop(0, '#3a4668');
    gradient.addColorStop(1, PALETTE.urchin);
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(item.x, item.y, item.r, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(255, 120, 140, 0.5)';
    context.beginPath();
    context.arc(item.x - item.r * 0.25, item.y - item.r * 0.3, item.r * 0.18, 0, Math.PI * 2);
    context.fill();
  }

  function drawAngler(item, state) {
    const dir = item.vx >= 0 ? 1 : -1;
    const wobble = Math.sin(state.elapsed * 2.2 + item.phase) * 0.08;
    context.save();
    context.translate(item.x, item.y);
    context.rotate(wobble);
    context.scale(dir, 1);
    // Tail.
    context.fillStyle = PALETTE.anglerBelly;
    context.beginPath();
    context.moveTo(-item.r * 0.9, 0);
    context.lineTo(-item.r * 1.6, -item.r * 0.5);
    context.lineTo(-item.r * 1.6, item.r * 0.5);
    context.closePath();
    context.fill();
    // Body.
    const gradient = context.createLinearGradient(0, -item.r, 0, item.r);
    gradient.addColorStop(0, '#232f52');
    gradient.addColorStop(1, PALETTE.angler);
    context.fillStyle = gradient;
    context.beginPath();
    context.ellipse(0, 0, item.r * 1.05, item.r * 0.72, 0, 0, Math.PI * 2);
    context.fill();
    // Jaw with teeth.
    context.fillStyle = '#0a0f1e';
    context.beginPath();
    context.moveTo(item.r * 0.45, item.r * 0.1);
    context.lineTo(item.r * 1.05, item.r * 0.34);
    context.lineTo(item.r * 0.45, item.r * 0.52);
    context.closePath();
    context.fill();
    context.fillStyle = '#eaf6ff';
    for (let tooth = 0; tooth < 4; tooth += 1) {
      const tx = item.r * (0.55 + tooth * 0.13);
      context.beginPath();
      context.moveTo(tx, item.r * 0.16);
      context.lineTo(tx + 4, item.r * 0.16);
      context.lineTo(tx + 2, item.r * 0.34);
      context.closePath();
      context.fill();
    }
    // Eye.
    context.fillStyle = '#ffd166';
    context.beginPath();
    context.arc(item.r * 0.42, -item.r * 0.22, 5, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#0a0f1e';
    context.beginPath();
    context.arc(item.r * 0.44, -item.r * 0.22, 2.4, 0, Math.PI * 2);
    context.fill();
    // Lure stalk with its glowing bulb.
    context.strokeStyle = '#5a6b8f';
    context.lineWidth = 2.5;
    context.beginPath();
    context.moveTo(item.r * 0.3, -item.r * 0.55);
    context.quadraticCurveTo(item.r * 0.55, -item.r * 1.15, item.r * 0.85, -item.r * 1.05);
    context.stroke();
    context.restore();
    // The lure's glow (unrotated, so it stays round).
    context.save();
    context.globalCompositeOperation = 'lighter';
    glowCircle(item.x + dir * item.r * 0.85, item.y - item.r * 1.05, 26, 'rgba(125, 249, 255, 0.75)', 0.9);
    context.restore();
    context.fillStyle = '#d8fbff';
    context.beginPath();
    context.arc(item.x + dir * item.r * 0.85, item.y - item.r * 1.05, 5.5, 0, Math.PI * 2);
    context.fill();
  }

  function drawParticles(state) {
    context.save();
    context.globalCompositeOperation = 'lighter';
    for (const particle of state.particles) {
      if (!particle.active) continue;
      context.globalAlpha = Math.max(0, particle.life / particle.max);
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
    context.globalAlpha = 1;
  }

  function drawPlayer(state) {
    const player = state.player;
    // Blink while invulnerable after a hit: hidden on every other tenth of a second.
    if (player.invuln > 0 && Math.floor(player.invuln * 10) % 2 === 0) return;
    const burstOn = state.burst > 0;
    context.save();
    context.translate(player.x, player.y);
    if (burstOn) {
      context.globalCompositeOperation = 'lighter';
      glowCircle(0, 0, player.r * 3.6, 'rgba(255, 215, 94, 0.5)', 0.85);
      context.globalCompositeOperation = 'source-over';
    } else {
      context.globalCompositeOperation = 'lighter';
      glowCircle(0, 0, player.r * 2.6, 'rgba(255, 207, 110, 0.4)', 0.7);
      context.globalCompositeOperation = 'source-over';
    }
    context.scale(player.face, 1);
    const wag = Math.sin(player.wag) * 0.35;
    // Tail fin, wagging.
    context.fillStyle = burstOn ? '#ffd75e' : '#ff9d5c';
    context.beginPath();
    context.moveTo(-player.r * 0.7, 0);
    context.lineTo(-player.r * 1.55, -player.r * 0.62 + wag * player.r * 0.5);
    context.lineTo(-player.r * 1.55, player.r * 0.62 + wag * player.r * 0.5);
    context.closePath();
    context.fill();
    // Body.
    const gradient = context.createLinearGradient(0, -player.r, 0, player.r);
    gradient.addColorStop(0, burstOn ? '#ffe9a8' : PALETTE.playerBelly);
    gradient.addColorStop(0.55, PALETTE.player);
    gradient.addColorStop(1, '#e07f2e');
    context.fillStyle = gradient;
    context.beginPath();
    context.ellipse(0, 0, player.r * 1.15, player.r * 0.72, 0, 0, Math.PI * 2);
    context.fill();
    // Dorsal fin.
    context.fillStyle = '#e07f2e';
    context.beginPath();
    context.moveTo(-player.r * 0.35, -player.r * 0.6);
    context.quadraticCurveTo(0, -player.r * 1.25, player.r * 0.45, -player.r * 0.55);
    context.closePath();
    context.fill();
    // Belly stripe.
    context.strokeStyle = 'rgba(255, 225, 161, 0.8)';
    context.lineWidth = 2.5;
    context.beginPath();
    context.moveTo(-player.r * 0.7, player.r * 0.28);
    context.quadraticCurveTo(0, player.r * 0.48, player.r * 0.75, player.r * 0.2);
    context.stroke();
    // Eye.
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(player.r * 0.52, -player.r * 0.2, 7, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#101828';
    context.beginPath();
    context.arc(player.r * 0.55, -player.r * 0.2, 3.6, 0, Math.PI * 2);
    context.fill();
    // The lure: a stalk from the forehead with a glowing bulb — Glowfin's own light.
    context.strokeStyle = '#d98a3d';
    context.lineWidth = 2.5;
    context.beginPath();
    context.moveTo(player.r * 0.55, -player.r * 0.55);
    context.quadraticCurveTo(player.r * 0.8, -player.r * 1.15, player.r * 1.05, -player.r * 1.0);
    context.stroke();
    context.restore();
    context.save();
    context.globalCompositeOperation = 'lighter';
    glowCircle(
      player.x + player.face * player.r * 1.05, player.y - player.r * 1.0,
      burstOn ? 34 : 24, burstOn ? 'rgba(255, 230, 130, 0.95)' : 'rgba(255, 207, 110, 0.8)', 0.95,
    );
    context.restore();
    context.fillStyle = '#fff3c4';
    context.beginPath();
    context.arc(player.x + player.face * player.r * 1.05, player.y - player.r * 1.0, 5, 0, Math.PI * 2);
    context.fill();
  }

  function drawWeeds(state) {
    context.save();
    context.globalAlpha = 0.9;
    for (const weed of state.reef.weeds) {
      const sway = Math.sin(state.elapsed * 0.9 + weed.phase) * weed.lean * weed.h * 0.3;
      context.strokeStyle = '#14532d';
      context.lineWidth = 5;
      context.beginPath();
      context.moveTo(weed.x, FIELD.height);
      context.quadraticCurveTo(weed.x + sway * 0.4, FIELD.height - weed.h * 0.6, weed.x + sway, FIELD.height - weed.h);
      context.stroke();
      context.strokeStyle = '#166534';
      context.lineWidth = 2.5;
      context.beginPath();
      context.moveTo(weed.x + 4, FIELD.height);
      context.quadraticCurveTo(weed.x + 4 + sway * 0.5, FIELD.height - weed.h * 0.5, weed.x + 4 + sway * 0.8, FIELD.height - weed.h * 0.8);
      context.stroke();
    }
    context.restore();
  }

  function drawVignette() {
    const gradient = context.createRadialGradient(
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.42,
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.95,
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(2, 6, 12, 0.55)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function drawHeart(x, y, size, filled) {
    context.fillStyle = filled ? PALETTE.heart : PALETTE.heartEmpty;
    context.beginPath();
    context.moveTo(x, y + size * 0.35);
    context.bezierCurveTo(x - size * 0.55, y - size * 0.25, x - size * 0.3, y - size * 0.75, x, y - size * 0.25);
    context.bezierCurveTo(x + size * 0.3, y - size * 0.75, x + size * 0.55, y - size * 0.25, x, y + size * 0.35);
    context.fill();
  }

  function drawHud(state, best) {
    context.textBaseline = 'top';
    text(scoreLabel(formatScore(state.score)), 26, 18, 30, PALETTE.text, 'left');
    text(`DEPTH ${state.level} · ${DEPTH_NAMES[state.level - 1]}`, FIELD.width / 2, 22, 22, PALETTE.muted, 'center');
    const heartSize = 26;
    const gap = 10;
    const firstHeart = FIELD.width - 26 - LIVES * (heartSize + gap) + gap;
    for (let life = 0; life < LIVES; life += 1) {
      drawHeart(firstHeart + life * (heartSize + gap) + heartSize / 2, 30, heartSize, life < state.lives);
    }
    text(bestLabel(best), FIELD.width - 26, 62, 18, PALETTE.muted, 'right');

    // Combo meter under the score.
    if (state.combo > 1) {
      const label = `COMBO ×${state.combo}`;
      text(label, 26, 56, 22, PALETTE.gold, 'left');
      const barWidth = 130;
      const ratio = Math.max(0, state.comboTimer / COMBO.window);
      context.fillStyle = 'rgba(255, 215, 94, 0.25)';
      context.fillRect(26, 84, barWidth, 7);
      context.fillStyle = PALETTE.gold;
      context.fillRect(26, 84, barWidth * ratio, 7);
    }
    // Lumen Burst bar.
    if (state.burst > 0) {
      const barWidth = 200;
      const ratio = state.burst / PEARL.burstSeconds;
      const label = '✦ LUMEN BURST ×2 ✦';
      text(label, 26, 100, 20, '#fff6c9', 'left');
      context.fillStyle = 'rgba(255, 215, 94, 0.25)';
      context.fillRect(26, 126, barWidth, 8);
      context.fillStyle = PALETTE.gold;
      context.fillRect(26, 126, barWidth * ratio, 8);
    }
  }

  function drawPanel(title, lines, prompt, best) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    roundRectPath(x, y, PANEL.width, height, 18);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    roundRectPath(x, y, PANEL.width, height, 18);
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 82, 52, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (line === '') continue;
      text(line, FIELD.width / 2, y + PANEL.top + index * PANEL.line, 22, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 24, PALETTE.gold, 'center');
  }

  const TITLE_LINES = [
    'Eat the glowing plankton. Catch golden pearls for a Lumen Burst.',
    'Dodge the urchins and the anglerfish — you have 3 lives.',
    'Swim with the mouse or WASD / arrow keys · P pauses · M mutes',
    '',
  ];
  const PAUSED_LINES = ['The reef waits for you.'];
  const OVER_LINES = ['', ''];

  /** Paint one frame: the reef, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    // Screen shake after a hit: a deterministic wobble, so screenshots stay repeatable.
    if (state.shake > 0) {
      const magnitude = state.shake * 9;
      context.translate(
        Math.sin(state.elapsed * 127.1) * magnitude,
        Math.cos(state.elapsed * 149.7) * magnitude,
      );
    }
    drawWater(state);
    drawReef(state);
    drawMotes(state);
    drawBubbles(state);
    for (const item of state.items) {
      if (!item.active) continue;
      if (item.kind === KIND_ORB) drawOrb(item, state);
      else if (item.kind === KIND_PEARL) drawPearl(item, state);
      else if (item.kind === KIND_URCHIN) drawUrchin(item, state);
      else if (item.kind === KIND_ANGLER) drawAngler(item, state);
    }
    drawParticles(state);
    drawPlayer(state);
    drawWeeds(state);
    drawVignette();
    if (state.flash > 0) {
      context.fillStyle = `rgba(255, 60, 80, ${state.flash * 0.22})`;
      context.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[3] = `Best dive so far: ${formatScore(best)}`;
      drawPanel('✦ LUMEN REEF ✦', TITLE_LINES, 'Click or press Enter to dive in', best);
      return;
    }
    drawHud(state, best);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to keep swimming', best);
    else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = `Score ${formatScore(state.score)}`;
      OVER_LINES[1] = `Best ${formatScore(best)}`;
      drawPanel('The light fades…', OVER_LINES, 'Press Space or click to swim again', best);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
