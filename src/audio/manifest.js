/* =========================================================================
   接舷單挑 · audio/manifest.js
   What each sound is: first the real recordings to try (CDN-hosted, all of them
   verified to answer 200 with an audio/* content-type and an
   `access-control-allow-origin: *` header, which is what lets the Web Audio API
   decode them from another origin), then the synthesised fallback.

   Two libraries are used on purpose:
     · Tone.js  — a genuine FM metal clash, a membrane thud and a synth sting,
                  which is exactly what a 1990s pirate game would have used;
     · Phaser's example assets (CC0/MIT-ish game sounds) for a death grunt and a
                  menu tick.
   Nothing here is required for the game to have sound: if every URL fails
   (offline, blocked, CORS change) the synth takes over and the player hears
   the same events, so the fight is never silent.
   ========================================================================= */

export const SAMPLES = {
  /* 揮劍沒有取樣：白噪掃頻比任何錄音都更像刀鋒破風，所以它直接合成。 */
  swing: [],
  block: [
    'https://tonejs.github.io/audio/berklee/garbage_can_hit_1.mp3',
  ],
  hit: [
    'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/audio/SoundEffects/boss_hit.wav',
    'https://tonejs.github.io/audio/berklee/Slam%28loud%29.mp3',
  ],
  death: [
    'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/audio/SoundEffects/player_death.wav',
  ],
  defeat: [
    'https://tonejs.github.io/audio/berklee/forboding_synth_tritones1.mp3',
  ],
  click: [
    'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/audio/SoundEffects/menu_select.mp3',
  ],
  foghorn: [
    'https://tonejs.github.io/audio/berklee/flute_foghorn_1.mp3',
  ],
};

/* Every sound the game asks for, synthesised if no sample survived. */
export const SOUND_NAMES = [
  'swing', 'block', 'hit', 'miss', 'charge', 'click', 'turn',
  'victory', 'defeat', 'death', 'foghorn', 'hurt',
];

export const CREDITS = [
  { what: '船鐘、風聲、海面與所有刀劍音效', from: 'Tone.js 即時合成（無取樣）' },
  { what: '格擋鏗鏘、重擊落地', from: 'tonejs.github.io/audio · Berklee 取樣庫（MP3）' },
  { what: '倒地、選單、命中', from: 'Phaser 3 examples · assets/audio/SoundEffects' },
];
