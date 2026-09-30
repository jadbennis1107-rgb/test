#!/usr/bin/env node
// Renders index.html frame by frame (deterministic timeline) and encodes an MP4 with ffmpeg.
//
//   node export/render-video.cjs [out.mp4] [--fps 60] [--width 1920] [--sheet sheet.png]
//
// Needs Playwright (Chromium) and an ffmpeg binary (FFMPEG env var, or `ffmpeg` on PATH).
const path = require('path');
const fs = require('fs');
const { spawn, execFileSync } = require('child_process');

function loadPlaywright() {
  try { return require('playwright'); } catch { /* fall through */ }
  const globalRoot = require('child_process').execSync('npm root -g').toString().trim();
  return require(path.join(globalRoot, 'playwright'));
}

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : def; };
const fps = Number(opt('--fps', 60));
const width = Number(opt('--width', 1920));
const sheet = opt('--sheet', null);
const times = opt('--times', null);
const out = args[0] || path.join(__dirname, '..', 'le-trajet-d-un-message.mp4');
const height = Math.round(width * 9 / 16);

(async () => {
  const { chromium } = loadPlaywright();
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
  const browser = await chromium.launch({ proxy });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  // Serve Google Fonts through curl (it trusts the system CA store, which headless Chromium may not).
  const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, async route => {
    const url = route.request().url();
    try {
      const body = execFileSync('curl', ['-sSL', '--fail', '-A', UA, url], { maxBuffer: 1 << 26 });
      const type = url.includes('googleapis') ? 'text/css; charset=utf-8' : 'font/woff2';
      await route.fulfill({ status: 200, body, headers: { 'content-type': type, 'access-control-allow-origin': '*' } });
    } catch (e) { console.error('font fetch failed', url); await route.abort(); }
  });
  await page.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await page.waitForFunction(() => window.__anim);
  await page.evaluate(() => window.__anim.ready);
  const loaded = await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => `${f.family} ${f.weight}`));
  console.log('web fonts loaded:', [...new Set(loaded)].join(', ') || 'none');
  await page.evaluate(([w, h]) => window.__anim.exportMode(w, h), [width, height]);

  if (sheet) {
    const ts = times ? times.split(',').map(Number) : [0.6, 1.3, 2.2, 2.9, 3.5, 4.5, 5.2, 5.9, 6.5, 7.3, 8.3, 9.6, 10.2, 11.6, 12.4, 13.0, 13.7, 15];
    const cols = 3, cw = 640, ch = 360, rows = Math.ceil(ts.length / cols);
    const url = await page.evaluate(([ts, cols, cw, ch, rows]) => {
      const sc = document.createElement('canvas');
      sc.width = cols * cw; sc.height = rows * ch;
      const g = sc.getContext('2d');
      const src = document.getElementById('scene');
      ts.forEach((t, i) => {
        window.__anim.frame(t);
        const x = (i % cols) * cw, y = Math.floor(i / cols) * ch;
        g.drawImage(src, x, y, cw, ch);
        g.fillStyle = '#ff0'; g.font = '600 18px monospace'; g.fillText('t=' + t, x + 8, y + 22);
        g.strokeStyle = '#333'; g.strokeRect(x, y, cw, ch);
      });
      return sc.toDataURL('image/png');
    }, [ts, cols, cw, ch, rows]);
    fs.writeFileSync(sheet, Buffer.from(url.split(',')[1], 'base64'));
    console.log('contact sheet ->', sheet);
    await browser.close();
    return;
  }

  const ffmpegBin = process.env.FFMPEG || 'ffmpeg';
  const ff = spawn(ffmpegBin, [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round(15 * fps);
  const t0 = Date.now();
  for (let f = 0; f <= total; f++) {
    const url = await page.evaluate(t => window.__anim.frame(t), f / fps);
    const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % fps === 0) process.stdout.write(`\r${f}/${total} frames (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg exited with ' + c)))));
  console.log('\nvideo ->', out);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
