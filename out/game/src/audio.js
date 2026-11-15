// Synthesized sound, no audio files: a few soft WebAudio notes — a plink that rises with
// the combo when Glowfin eats, a little arpeggio for a golden pearl, a low thud for a hit,
// a two-note chime when the reef deepens. The context is created on the first gesture, so
// nothing plays before the player has chosen to, and M mutes everything.

export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context !== null) return context;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function note(frequency, duration, type, gain, when = 0) {
    if (context === null || muted) return;
    try {
      const start = context.currentTime + when;
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(gain, start + 0.012);
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(envelope);
      envelope.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.05);
    } catch {
      // Sound is garnish: a failure here must never break the game.
    }
  }

  return {
    /** Call from a user gesture so the browser lets sound start. */
    ensure,
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    click() {
      note(660, 0.09, 'sine', 0.12);
    },
    eat(combo) {
      const base = 520 + Math.min(combo, 5) * 70;
      note(base, 0.14, 'sine', 0.14);
      note(base * 1.5, 0.1, 'sine', 0.07, 0.03);
    },
    pearl() {
      note(523, 0.16, 'triangle', 0.16);
      note(659, 0.16, 'triangle', 0.16, 0.07);
      note(784, 0.22, 'triangle', 0.16, 0.14);
      note(1047, 0.3, 'sine', 0.12, 0.21);
    },
    hit() {
      note(140, 0.28, 'sawtooth', 0.16);
      note(90, 0.32, 'sine', 0.2, 0.02);
    },
    level() {
      note(392, 0.16, 'triangle', 0.14);
      note(587, 0.26, 'triangle', 0.14, 0.1);
    },
  };
}
