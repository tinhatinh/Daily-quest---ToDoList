/*
 * audio.js - AM THANH TONG HOP (Web Audio API)
 * --------------------------------------------
 * Khong can file mp3: moi sound effect duoc "ve" bang oscillator + envelope.
 * AudioContext khoi tao tre (lazy) khi co tuong tac dau tien (chinh sach
 * autoplay cua trinh duyet). Ton trong settings.sound + volume.
 */

let ctx = null;
let masterGain = null;
let enabled = true;
let volume = 0.5;

/** Khoi tao (hoac tiep nhan) AudioContext. Goi trong user gesture. */
function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/**
 * Phat mot note: song hinh sin/tam giac len phong nhanh, roi tat dan.
 * @param {number} freq Tan so (Hz)
 * @param {number} start Offset giay tu bay gio
 * @param {number} dur Do dai giay
 * @param {object} opts { type, gain, glideTo }
 */
function note(freq, start, dur, opts = {}) {
  const c = ensureCtx();
  if (!c) return;
  const { type = 'sine', gain = 0.5, glideTo = null } = opts;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  const t0 = c.currentTime + start;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), t0 + dur);

  const peak = Math.max(0.0001, gain);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012); // attack nhanh
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); // release

  osc.connect(g);
  g.connect(masterGain);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Bach noise ngan (dung cho hieu ung "pop"). */
function noise(start, dur, gain = 0.2) {
  const c = ensureCtx();
  if (!c) return;
  const frames = Math.floor(c.sampleRate * dur);
  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const g = c.createGain();
  g.gain.value = gain;
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1200;
  src.connect(hp);
  hp.connect(g);
  g.connect(masterGain);
  src.start(c.currentTime + start);
}

// Ngan hang cac sound effect (moi ham goi note/noise)
const EFFECTS = {
  /** Tick hoann thanh quest: 2 note leo nhanh, am "ding" vui. */
  tick() {
    note(880, 0, 0.09, { type: 'triangle', gain: 0.35 });
    note(1320, 0.06, 0.12, { type: 'triangle', gain: 0.3 });
  },
  /** To-do xong: pop nhe. */
  todo() {
    note(660, 0, 0.07, { type: 'sine', gain: 0.28 });
    noise(0, 0.03, 0.05);
  },
  /** Nhan XP: chime mong manh. */
  xp() {
    note(1046, 0, 0.14, { type: 'sine', gain: 0.22 });
    note(1568, 0.05, 0.16, { type: 'sine', gain: 0.16 });
  },
  /** Click UI. */
  click() {
    note(420, 0, 0.04, { type: 'square', gain: 0.12 });
  },
  /** Mo thanh tuu: 3 note hoa am thang. */
  achievement() {
    note(784, 0, 0.12, { type: 'triangle', gain: 0.28 });
    note(988, 0.1, 0.12, { type: 'triangle', gain: 0.28 });
    note(1319, 0.2, 0.22, { type: 'triangle', gain: 0.3 });
  },
  /** Len cap: fanfare 5 note. */
  levelUp() {
    const seq = [523, 659, 784, 1046, 1319];
    seq.forEach((f, i) => note(f, i * 0.09, 0.22, { type: 'sawtooth', gain: 0.24 }));
    note(2093, 0.5, 0.4, { type: 'sine', gain: 0.2 });
  },
  /** Combo: note leo theo bac. */
  combo(step = 1) {
    const base = 660 + Math.min(step, 6) * 90;
    note(base, 0, 0.1, { type: 'square', gain: 0.2 });
    note(base * 1.5, 0.05, 0.12, { type: 'square', gain: 0.16 });
  },
  /** Boss bi danh bai: am sau + chien thang. */
  boss() {
    note(196, 0, 0.3, { type: 'sawtooth', gain: 0.28, glideTo: 98 });
    note(392, 0.2, 0.3, { type: 'triangle', gain: 0.24 });
    note(587, 0.35, 0.35, { type: 'triangle', gain: 0.26 });
  },
  /** Loi / khong du coin: 2 note xuong. */
  error() {
    note(300, 0, 0.14, { type: 'sawtooth', gain: 0.22, glideTo: 160 });
  },
  /** Mua phan thuong. */
  coin() {
    note(988, 0, 0.08, { type: 'square', gain: 0.22 });
    note(1319, 0.06, 0.14, { type: 'square', gain: 0.2 });
  },
  /** Xong pomodoro. */
  focusDone() {
    note(880, 0, 0.16, { type: 'sine', gain: 0.26 });
    note(1175, 0.14, 0.24, { type: 'sine', gain: 0.24 });
  },
};

export const audio = {
  /** Cap nhat tu settings. */
  configure({ sound, volume: v } = {}) {
    if (typeof sound === 'boolean') enabled = sound;
    if (typeof v === 'number') {
      volume = Math.max(0, Math.min(1, v));
      if (masterGain) masterGain.gain.value = volume;
    }
  },
  get enabled() {
    return enabled;
  },
  /** Cho phep mo AudioContext trong lan click dau tien. */
  unlock() {
    if (enabled) ensureCtx();
  },
  /** Phat hieu ung theo ten; an toan neu tat am thanh. */
  play(name) {
    if (!enabled) return;
    const fx = EFFECTS[name];
    if (!fx) return;
    try {
      fx();
    } catch (e) {
      /* bo qua loi audio, khong lam gian doan UX */
    }
  },
};
