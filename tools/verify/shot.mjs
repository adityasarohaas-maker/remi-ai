// Headless screenshot via the DevTools protocol (Edge). Emulates the device size properly,
// unlike `msedge --screenshot`, which can't make a window narrower than ~500px.
//   node tools/verify/shot.mjs <outFile.png> <url> [width=1440] [height=900] [mobile=0] [settleMs=2500]
//   Add FULL=1 to capture the whole page height.
//   JS runs on the target after it settles (e.g. open a screen), then waits again.
//   PREP_URL + PREP_JS run first in the same profile (e.g. click the demo sign-in button).
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const EDGE = process.env.EDGE ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const [out, url, w = '1440', h = '900', mobile = '0', settle = '2500'] = process.argv.slice(2);
const port = 9334;
const profile = mkdtempSync(join(tmpdir(), 'shot-'));
const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });

try {
  let target;
  for (let i = 0; i < 40 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch { /* not up yet */ }
    if (!target) await sleep(250);
  }
  if (!target) throw new Error('no devtools');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (e) => { const m = JSON.parse(e.data); const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile: mobile === '1' });
  if (process.env.PREP_URL) {
    await send('Page.navigate', { url: process.env.PREP_URL });
    await sleep(+settle);
    if (process.env.PREP_JS) await send('Runtime.evaluate', { expression: process.env.PREP_JS });
    await sleep(+settle);
  }
  await send('Page.navigate', { url });
  await sleep(+settle);
  if (process.env.JS) { await send('Runtime.evaluate', { expression: process.env.JS }); await sleep(+settle); }
  const metrics = await send('Page.getLayoutMetrics');
  const overflow = metrics.cssContentSize.width > +w + 1;
  const clip = process.env.FULL ? { x: 0, y: 0, width: +w, height: Math.ceil(metrics.cssContentSize.height), scale: 1 } : undefined;
  const img = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: Boolean(clip), ...(clip ? { clip } : {}) });
  writeFileSync(out, Buffer.from(img.data, 'base64'));
  console.log(JSON.stringify({ out, contentWidth: metrics.cssContentSize.width, contentHeight: metrics.cssContentSize.height, horizontalOverflow: overflow }));
} finally {
  ws?.close();
  edge.kill();
}
