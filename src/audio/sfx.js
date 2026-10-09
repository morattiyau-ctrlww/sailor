/* =========================================================================
   接舷單挑 · audio/sfx.js
   One small front door for every noise in the game.

       start()   — called from a real click, because browsers refuse to make
                   sound before a gesture, then loads the samples in the
                   background (never blocking the fight).
       play(name)— a loaded sample if there is one, otherwise the Tone.js
                   equivalent. Same call either way, so no caller has to care.
       mute()    — one master gain, ramped, so nothing clicks.

   Status is exposed through getStatus() so the headless check can see whether
   the recordings actually arrived or the synth is carrying the game.
   ========================================================================= */
import * as Tone from 'tone';
import { SAMPLES, SOUND_NAMES } from './manifest.js';

let ready = false;
let master = null, musicBus = null;
let muted = false;
const players = {};                    // name -> Tone.Player (a real recording)
const buffers = {};                    // name -> Tone.ToneAudioBuffer
const synths = {};
const status = { started: false, loaded: [], failed: [], fallback: [], ambience: false };

/* ---- the synthesised voices ---------------------------------------------- */
/* Deliberately built from Tone's own instruments: an FM metal voice for steel
   on steel, a membrane for a body blow, a noise sweep for the wind of a sword. */
function buildVoices() {
  master = new Tone.Gain(0.9).toDestination();
  musicBus = new Tone.Gain(0.55).connect(master);

  /* 破風：白噪掃過帶通，起手低、收尾高，就是刀鋒劃過去的聲音。 */
  synths.swing = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.008, decay: 0.26, sustain: 0 },
    filter: { type: 'bandpass', Q: 0.9 },
  }).connect(master);

  /* 鏗鏘：FM 金屬，短促而亮。 */
  synths.block = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.5, release: 0.1 },
    harmonicity: 5.1, modulationIndex: 26, resonance: 3200, octaves: 1.4,
  }).connect(master);

  /* 命中：一記悶響，加上金屬層的餘韻。 */
  synths.hit = new Tone.MembraneSynth({
    pitchDecay: 0.045, octaves: 5,
    envelope: { attack: 0.002, decay: 0.4, sustain: 0.01, release: 0.3 },
  }).connect(master);

  /* 落空：只有風，沒有刀。 */
  synths.miss = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.02, decay: 0.3, sustain: 0 },
    filter: { type: 'highpass', Q: 0.6 },
  }).connect(master);

  /* 蓄勢待發：一個往上爬的鋸齒，越接近出手越緊。 */
  synths.charge = new Tone.MonoSynth({
    oscillator: { type: 'sawtooth' },
    filter: { type: 'lowpass', Q: 4 },
    envelope: { attack: 0.6, decay: 0.4, sustain: 0.5, release: 0.4 },
    filterEnvelope: { attack: 0.5, decay: 0.2, sustain: 0.6, release: 0.4, baseFrequency: 200, octaves: 3.4 },
  }).connect(master);

  /* 船鐘 / 回合提示 / 按鈕。 */
  synths.turn = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 1.2, release: 0.4 },
    harmonicity: 8.5, modulationIndex: 18, resonance: 1400, octaves: 1,
  }).connect(master);
  synths.click = new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.002, decay: 0.12, sustain: 0 },
  }).connect(master);

  /* 號角與傷音：一個複音合成器就夠撐起輸贏的兩種心情。 */
  synths.sting = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.02, decay: 0.5, sustain: 0.15, release: 1.1 },
    volume: -6,
  }).connect(master);
  synths.hurt = new Tone.MonoSynth({
    oscillator: { type: 'square' },
    filter: { type: 'lowpass', Q: 2 },
    envelope: { attack: 0.004, decay: 0.35, sustain: 0, release: 0.2 },
    filterEnvelope: { attack: 0.004, decay: 0.3, sustain: 0, release: 0.2, baseFrequency: 420, octaves: -2 },
  }).connect(master);

  /* 海面與風：棕色噪音過低通，極小聲地一直墊在底下。 */
  synths.wind = new Tone.Noise('brown').connect(new Tone.Filter({ type: 'lowpass', frequency: 420, rolloff: -12 }).connect(musicBus));
  synths.surf = new Tone.Noise('pink').connect(new Tone.Filter({ type: 'bandpass', frequency: 900, Q: 0.6 }).connect(new Tone.Gain(0.35).connect(musicBus)));
}

/* ---- the recipes: what plays when a recording is missing ------------------ */
/* Each one is written so the event still *reads*: a swing has to sound like a
   swing, a block like steel, a body blow like something giving way. */
const RECIPES = {
  swing: () => {
    synths.swing.filter.frequency.rampTo(2800 + Math.random() * 700, 0.2);
    synths.swing.triggerAttackRelease(0.24);
  },
  block: () => {
    synths.block.triggerAttackRelease('C6', 0.28);
    synths.hit.triggerAttackRelease('C3', 0.12);          // a little weight behind it
  },
  hit: () => {
    synths.hit.triggerAttackRelease('C2', 0.32);
    synths.block.triggerAttackRelease('G5', 0.1);         // the blade biting
  },
  miss: () => {
    synths.miss.filter.frequency.rampTo(4200, 0.2);
    synths.miss.triggerAttackRelease(0.3);
  },
  charge: () => synths.charge.triggerAttackRelease('A2', 1.1),
  turn: () => synths.turn.triggerAttackRelease('G4', 0.45),
  click: () => synths.click.triggerAttackRelease('E5', '16n'),
  hurt: () => {
    synths.hurt.triggerAttackRelease('C4', 0.3);
    synths.hit.triggerAttackRelease('E2', 0.2);
  },
  death: () => {
    synths.hit.triggerAttackRelease('A1', 0.8);
    synths.hurt.triggerAttackRelease('A3', 0.7);
  },
  foghorn: () => synths.sting.triggerAttackRelease(['D2', 'A2'], 1.5, undefined, 0.08),
  victory: () => {
    const t = Tone.now();
    ['D4', 'F4', 'A4', 'D5'].forEach((n, i) => synths.sting.triggerAttackRelease(n, '8n', t + i * 0.15));
    synths.sting.triggerAttackRelease('D3', '2n', t, 0.1);
  },
  defeat: () => {
    const t = Tone.now();
    ['D4', 'Bb3', 'F3'].forEach((n, i) => synths.sting.triggerAttackRelease(n, '4n', t + i * 0.32));
    synths.sting.triggerAttackRelease('D2', '2n', t + 0.9, 0.05);
  },
};

/* ---- the front door ------------------------------------------------------ */
export function isReady() { return ready; }

/* A small handle for the headless check: it lets a script ask the audio layer
   where its sounds came from, without reaching into the React tree. */
function exposeDebug() {
  if (typeof window === 'undefined') return;
  window.__sailorSfx = {
    getStatus,
    play,
    setMuted,
    isMuted,
    sampleNames: () => Object.keys(players),
  };
}

/* Must be called from a user gesture (a click). Returns even if it fails: the
   game carries on silently rather than breaking. */
export async function start({ ambient = true } = {}) {
  if (ready) return status;
  try {
    await Tone.start();
    buildVoices();
    ready = true;
    status.started = true;
    if (ambient) startAmbience();
    exposeDebug();
    loadSamples();                 // fire and forget: the fight never waits
    play('foghorn');
  } catch (e) {
    status.error = String(e && e.message ? e.message : e);
  }
  return status;
}

export function play(name, { gain = 1, rate = 1 } = {}) {
  if (!ready || muted) return false;
  try {
    const player = players[name];
    if (player) {
      /* A touch of variation, so the tenth identical swing is not the tenth
         identical sample: rate 0.95–1.06 and a small level trim. */
      player.playbackRate = rate * (0.95 + Math.random() * 0.11);
      player.volume.value = gain === 1 ? 0 : Tone.gainToDb(gain);
      player.start();
      return true;
    }
    const recipe = RECIPES[name];
    if (!recipe) return false;
    recipe();
    return true;
  } catch {
    return false;                  // a broken voice must never break the fight
  }
}

export function startAmbience() {
  if (!ready || status.ambience) return;
  try {
    synths.wind.start();
    synths.surf.start();
    status.ambience = true;
  } catch { /* already running */ }
}

export function stopAmbience() {
  if (!ready || !status.ambience) return;
  try {
    synths.wind.stop();
    synths.surf.stop();
  } catch { /* already stopped */ }
  status.ambience = false;
}

export function setMuted(v) {
  muted = !!v;
  if (master) master.gain.rampTo(muted ? 0 : 0.9, 0.08);
  return muted;
}
export function isMuted() { return muted; }
export function getStatus() {
  return {
    ...status,
    samplesLoaded: status.loaded.length,
    total: SOUND_NAMES.length,
    ready,
  };
}

async function loadSamples() {
  for (const name of SOUND_NAMES) {
    const urls = SAMPLES[name] || [];
    for (const url of urls) {
      try {
        buffers[name] = await Tone.ToneAudioBuffer.load(url);
        players[name] = new Tone.Player(buffers[name]).connect(master);
        status.loaded.push(name);
        break;                                   // first one that works wins
      } catch {
        status.failed.push(name + ' @ ' + url.split('/').pop());
      }
    }
    if (!players[name]) status.fallback.push(name);
  }
  return status;
}
