// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 22,
  accel: 2600,
  maxSpeed: 430,
  drag: 3.2,
  invulnerable: 1.6,
};

export const LIVES = 3;

/** Plankton orbs: the food. Points are multiplied by the combo (x1..x5) and by the burst. */
export const ORB = {
  radius: 11,
  fall: 46,
  fallPerLevel: 4,
  sway: 26,
  interval: 0.85,
  intervalScale: 0.9,
  minInterval: 0.34,
  points: 10,
};

/** Golden pearls: rare, worth a lot, and they trigger the Lumen Burst. */
export const PEARL = {
  radius: 15,
  fall: 34,
  interval: 9,
  points: 50,
  burstSeconds: 5,
};

/** Spiky urchins drift down and hurt on touch. */
export const URCHIN = {
  radius: 17,
  fall: 74,
  fallPerLevel: 6,
  interval: 1.5,
  intervalScale: 0.86,
  minInterval: 0.55,
};

/** Anglerfish cross the reef sideways from level 2 on, jaws first, lure glowing. */
export const ANGLER = {
  radius: 26,
  speed: 150,
  speedPerLevel: 12,
  interval: 7.5,
  intervalScale: 0.88,
  minInterval: 3.2,
  wobble: 46,
};

/**
 * Jellyfish drift down slowly, pulsing — bell swelling, tentacles trailing — and
 * sting on touch. They are the reef's slow ambush: easy to see, easy to avoid,
 * deadly if you drift into one while chasing orbs. From level 1 on.
 */
export const JELLY = {
  radius: 20,
  fall: 30,
  fallPerLevel: 2,
  sway: 34,
  interval: 8,
  intervalScale: 0.9,
  minInterval: 4.5,
};

/**
 * Shield bubbles: rare cyan bubbles that drift down. Catch one and Glowfin gains a
 * shield — it absorbs the next hit outright (no life lost, no combo reset) and
 * shows as a glowing ring around the fish. One shield at a time; a second bubble
 * while shielded is worth +50 points instead.
 */
export const SHIELD = {
  radius: 16,
  fall: 40,
  interval: 16,
  points: 50,
};

/** Combo: each orb eaten within the window raises the multiplier; it decays when it lapses. */
export const COMBO = { window: 3.5, max: 5 };

/** Score per level; level 8 is the deepest the reef goes. */
export const LEVEL = { points: 400, max: 8 };

/** How many of each thing can exist at once; every pool is allocated once, at boot. */
export const POOL = { items: 96, particles: 320, bubbles: 48, motes: 70, texts: 24 };

/** The reef's look, shallow to deep: the water darkens a level at a time. */
export const WATER = [
  { top: '#0b2a4a', mid: '#0a2038', deep: '#061222' },
  { top: '#0a2547', mid: '#081c33', deep: '#050f1e' },
  { top: '#092038', mid: '#071828', deep: '#040d1a' },
  { top: '#081c30', mid: '#061423', deep: '#040b16' },
  { top: '#071827', mid: '#05111d', deep: '#030a13' },
  { top: '#061423', mid: '#050e19', deep: '#030910' },
  { top: '#05101d', mid: '#040c15', deep: '#02070d' },
  { top: '#040d18', mid: '#030a12', deep: '#02060b' },
];

export const PALETTE = {
  backdrop: '#04070d',
  orb: '#5ff2d6',
  orbCore: '#d8fff4',
  pearl: '#ffd75e',
  pearlCore: '#fff6c9',
  urchin: '#1c2436',
  urchinSpike: '#3d4a6b',
  angler: '#131a2e',
  anglerBelly: '#232f52',
  lure: '#7df9ff',
  jelly: '#f0a6ff',
  jellyCore: '#fbe7ff',
  jellyTentacle: 'rgba(240, 166, 255, 0.75)',
  shield: '#6ee7ff',
  shieldCore: '#e6fbff',
  player: '#ffb347',
  playerBelly: '#ffe1a1',
  playerGlow: '#ffcf6e',
  text: '#eaf6ff',
  muted: '#9db8cc',
  heart: '#ff6b81',
  heartEmpty: '#33415e',
  panel: 'rgba(6, 18, 34, 0.88)',
  panelEdge: '#2b4a68',
  gold: '#ffd75e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lumen-reef.best';
