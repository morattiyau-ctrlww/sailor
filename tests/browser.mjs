#!/usr/bin/env node
/* =========================================================================
   Checks the running game in headless Chrome, over the DevTools protocol.

   The point is the brief's central rule: the two halves of a turn must be
   strictly separated. So this drives the real page — click 登船開戰, click an
   attack, watch the plates vanish while the blow resolves, then click a guard
   — counting what is on screen at each step, with a screenshot each time.

   usage: node tests/browser.mjs [dev|dist] [outDir]
   ========================================================================= */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SERVE = process.argv[2] === 'dev' ? ROOT : join(ROOT, 'dist');
const OUT = process.argv[3] || '/tmp/sailor';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const server = createServer((req, res) => {
  const p = decodeURIComponent((req.url || '/').split('?')[0]);
  const file = join(SERVE, p === '/' ? 'index.html' : p);
  if (!existsSync(file)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

const DP = 9700 + Math.floor(Math.random() * 200);
const profile = mkdtempSync(join(tmpdir(), 'sailor-check-'));
const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--enable-unsafe-swiftshader',
  '--no-first-run', '--disable-extensions', '--mute-audio', '--autoplay-policy=no-user-gesture-required',
  `--user-data-dir=${profile}`, '--window-size=1280,760', `--remote-debugging-port=${DP}`, 'about:blank'],
  { stdio: 'ignore' });
const kill = () => { try { chrome.kill('SIGKILL'); } catch { /* gone */ } };
process.on('exit', () => { kill(); server.close(); });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(path) {
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(`http://127.0.0.1:${DP}${path}`); if (r.ok) return await r.json(); } catch { /* not up */ }
    await sleep(200);
  }
  throw new Error('devtools never answered');
}
const page = (await getJson('/json/list')).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const problems = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') {
    problems.push('exception: ' + String(m.params?.exceptionDetails?.exception?.description || '?').split('\n')[0]);
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params?.type === 'error') {
    problems.push('console.error: ' + (m.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 160));
  }
  if (m.method === 'Log.entryAdded' && m.params?.entry?.level === 'error') {
    problems.push('log: ' + String(m.params.entry.text).slice(0, 160));
  }
});
await new Promise((r) => ws.addEventListener('open', r));
const send = (method, params = {}) => new Promise((res, rej) => {
  const i = ++id;
  pending.set(i, (m) => (m.error ? rej(new Error(m.error.message)) : res(m.result)));
  ws.send(JSON.stringify({ id: i, method, params }));
});
await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
const js = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval failed');
  return r.result?.value;
};
const shot = async (name) => {
  const s = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(OUT, name + '.png'), Buffer.from(s.data, 'base64'));
};

/* ---- what is on screen right now ---------------------------------------- */
const DOM_PROBE = `(() => {
  const plates = [...document.querySelectorAll('button[data-kind]')];
  const body = document.body.textContent || '';
  return {
    plates: plates.length,
    attack: plates.filter(b => b.dataset.kind === 'attack').map(b => b.dataset.move),
    defence: plates.filter(b => b.dataset.kind === 'defence').map(b => b.dataset.move),
    locked: body.includes('按鍵已鎖定'),
    charging: body.includes('蓄勢待發'),
    heading: body.includes('你的回合') ? '你的回合' : body.includes('蓄勢待發') ? '敵人的回合' : '結算中',
    turn: (body.match(/第 (\\d+) 回合/) || [])[1] || null,
    log: document.querySelectorAll('ol li').length,
    hp: [...document.querySelectorAll('.hp-track span')].map(s => s.textContent).filter(t => /\\d+ \\/ \\d+/.test(t)),
  };
})()`;

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass: !!pass, detail });
  console.log((pass ? '  PASS  ' : '  FAIL  ') + name + (detail ? '   [' + detail + ']' : ''));
};

/* =============================== the run =================================== */
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
await sleep(2000);

console.log('\n1. the title card');
const bodyText = await (async () => {
  /* The bundle carries Tone.js, so give the page a moment to boot before
     deciding the start screen is missing. */
  for (let i = 0; i < 40; i++) {
    const t = await js('document.body.textContent || ""');
    if (/接舷單挑/.test(t)) return t;
    await sleep(300);
  }
  return '';
})();
if (problems.length) console.log('   early problems: ' + problems.join(' | '));
console.log('   body starts: ' + JSON.stringify(bodyText.slice(0, 90)));
check('sits on the start screen', /接舷單挑/.test(bodyText));
check('no battle plates before you board', (await js(DOM_PROBE)).plates === 0);
await shot('01-start');

console.log('\n2. 登船開戰 — the click that unlocks the sound');
await click('登船開戰');
await sleep(900);
const started = await js(`window.__sailorSfx ? window.__sailorSfx.getStatus() : null`);
check('the audio context started', !!started?.ready && started?.started, JSON.stringify({ ready: started?.ready, started: started?.started }));
if (started?.error) console.log('   audio error: ' + started.error);
const p1 = await js(DOM_PROBE);
check('opens in 你的回合', p1.heading === '你的回合', p1.heading);
check('round one', p1.turn === '1', 'turn=' + p1.turn);
check('four attack plates, and *only* attack plates', p1.attack.length === 4 && p1.defence.length === 0,
  `attack=${p1.attack.length} defence=${p1.defence.length}`);
check('the attacks are the brief\u2019s four', p1.attack.join('／') === '上部劈刺／中部橫斬／下部力劈／虛招', p1.attack.join('／'));
check('both health bars are full', p1.hp.length === 2 && p1.hp.every((h) => h.startsWith('100')), p1.hp.join(' | '));
check('the log has opened', p1.log >= 1, 'lines=' + p1.log);
await shot('02-player-attack');

console.log('\n3. 點中部橫斬 — the plates must vanish while the blow resolves');
const hpBefore = (await js(DOM_PROBE)).hp[1];
await click('中部橫斬');
await sleep(120);
const mid = await js(DOM_PROBE);
check('resolving locks every plate', mid.attack.length === 0 && mid.defence.length === 0,
  `attack=${mid.attack.length} defence=${mid.defence.length}`);
check('the lock is announced on screen', mid.locked, 'locked=' + mid.locked);
await shot('03-resolving');

console.log('\n4. after the blow — it is the enemy\u2019s turn now');
await sleep(1500);
const p2 = await js(DOM_PROBE);
check('moves to 敵人的回合', p2.heading === '敵人的回合', p2.heading);
check('says it is winding up', p2.charging, 'charging=' + p2.charging);
check('still round one', p2.turn === '1', 'turn=' + p2.turn);
check('four defence plates, and *only* defence plates', p2.defence.length === 4 && p2.attack.length === 0,
  `attack=${p2.attack.length} defence=${p2.defence.length}`);
check('the guards are the brief\u2019s four', p2.defence.join('／') === '防守上部／防守中部／防守下部／全力防守', p2.defence.join('／'));
check('the enemy actually lost health', p2.hp[1] !== hpBefore, `${hpBefore} -> ${p2.hp[1]}`);
await shot('04-enemy-attack');

console.log('\n5. 點防守下部 — you defend, then the turn rolls over');
await click('防守下部');
await sleep(150);
const mid2 = await js(DOM_PROBE);
check('your defence also locks the screen', mid2.attack.length === 0 && mid2.defence.length === 0);
await sleep(1500);
const p3 = await js(DOM_PROBE);
check('the turn rolled over to round two', p3.turn === '2', 'turn=' + p3.turn);
check('and back to 你的回合', p3.heading === '你的回合', p3.heading);
check('with attack plates again', p3.attack.length === 4 && p3.defence.length === 0);
check('the log recorded the exchange', p3.log > p1.log, `${p1.log} -> ${p3.log}`);
await shot('05-round-two');

console.log('\n6. the log and the machines behind it');
const tally = await js(`document.body.innerText.replace(/\\s+/g, ' ').slice(0, 4000)`);
check('the log names the moves that were used', /中部橫斬/.test(tally) && /(防守下部|防守上部|全力防守)/.test(tally));
check('the turn markers are in the log', /第 2 回合/.test(tally));

await sleep(2600);
const sfx = await js(`window.__sailorSfx.getStatus()`);
check('the synth is up (so the game is never silent)', sfx.ready, JSON.stringify({ ready: sfx.ready, fallback: sfx.fallback }));
console.log('   samples loaded: ' + (sfx.loaded || []).join(', ') || '   (none yet)');
console.log('   fell back to synth: ' + (sfx.fallback || []).join(', '));
if (sfx.failed?.length) console.log('   sample fetches that failed: ' + sfx.failed.join(', '));

/* ---- the verdict --------------------------------------------------------- */
console.log('\n7. playing it out to a decision');
let exchanges = 0;
let decided = false;
for (let i = 0; i < 46 && !decided; i++) {
  const st = await js(DOM_PROBE);
  if (await js(`document.body.textContent.includes('再來一場')`)) { decided = true; break; }
  if (st.attack.length) { await click(st.attack[i % 2 === 0 ? 2 : 1]); exchanges++; }
  else if (st.defence.length) { await click(st.defence[2]); exchanges++; }
  await sleep(1350);
}
const endText = await js('document.body.textContent || ""');
check('the fight reaches a decision', decided || /再來一場/.test(endText), `exchanges=${exchanges}`);
check('the ending is one of the two', /勝利|戰敗/.test(endText), /勝利/.test(endText) ? '勝利' : /戰敗/.test(endText) ? '戰敗' : 'neither');
check('the plaque reports the score', /回合數|交鋒次數/.test(endText));
await shot('06-ending');

console.log('\n8. 再來一場 — straight back into a new fight, as the machine intends');
await click('再來一場');
await sleep(1000);
const fresh = await js(DOM_PROBE);
check('the new fight starts at once, in 你的回合', fresh.heading === '你的回合', fresh.heading);
check('from round one', fresh.turn === '1', 'turn=' + fresh.turn);
check('with attack plates again', fresh.attack.length === 4, 'attack=' + fresh.attack.length);
check('both health bars back to full', fresh.hp.every((h) => h.startsWith('100')), fresh.hp.join(' | '));
check('the log has been swept clean', fresh.log <= 3, 'lines=' + fresh.log);

console.log('\n9. the same game on a phone');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
const phone = await js(DOM_PROBE);
check('a phone gets the same four attack plates', phone.attack.length === 4, 'attack=' + phone.attack.length);
const overflow = await js(
  `({ docW: document.documentElement.scrollWidth, winW: window.innerWidth, docH: document.documentElement.scrollHeight, winH: window.innerHeight })`,
);
check('nothing spills off the screen sideways', overflow.docW <= overflow.winW + 1, JSON.stringify(overflow));
check('and nothing spills off the bottom', overflow.docH <= overflow.winH + 1, JSON.stringify(overflow));
const reachable = await js(`(() => {
  const b = [...document.querySelectorAll('button[data-kind]')];
  return b.filter(el => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight && r.width > 40; }).length;
})()`);
check('every plate is on screen and tappable', reachable === 4, 'reachable=' + reachable);
await shot('07-phone');
await send('Emulation.clearDeviceMetricsOverride');
await sleep(300);

console.log('\n' + (problems.length ? 'BROWSER COMPLAINTS:' : 'no console errors, no exceptions'));
problems.forEach((p) => console.log('   ' + p));
const failed = results.filter((r) => !r.pass);
console.log(`\n${failed.length || problems.length ? 'FAIL' : 'PASS'}: ${results.length} checks, ${failed.length} failed, ${problems.length} browser problems`);
failed.forEach((f) => console.log('   x ' + f.name + '  [' + f.detail + ']'));
console.log('screenshots: ' + OUT);
ws.close();
kill();
process.exit(failed.length || problems.length ? 1 : 0);

function click(text) { return js(
  `[...document.querySelectorAll('button')].find(b => b.textContent.includes(${JSON.stringify(text)})).click()`);
}
