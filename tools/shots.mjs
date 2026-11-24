// Съёмка секций: node tools/shots.mjs <url> <outdir> <width> <height> [selectors,через,запятую]
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const groot = require('child_process').execSync('npm root -g').toString().trim();
const puppeteer = require(groot + '/puppeteer-core');
const [url, out, w = 1440, h = 900, sels = ''] = process.argv.slice(2);
const fs = await import('fs'); fs.mkdirSync(out, { recursive: true });
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--hide-scrollbars'] });
const p = await b.newPage(); await p.setViewport({ width: +w, height: +h });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto(url, { waitUntil: 'networkidle0', timeout: 90000 }); await new Promise(r => setTimeout(r, 1500));
await p.screenshot({ path: `${out}/00-top.jpg`, type: 'jpeg', quality: 60 });
const list = sels ? sels.split(',') : [];
let i = 1;
for (const s of list) {
  const [sel, off = '0'] = s.split('@');
  const ok = await p.evaluate((sel, off) => { const el = document.querySelector(sel); if (!el) return false; window.scrollTo(0, el.getBoundingClientRect().top + scrollY + (+off)); return true; }, sel, off);
  if (!ok) { console.log('нет', sel); continue; }
  await new Promise(r => setTimeout(r, 1700));
  await p.screenshot({ path: `${out}/${String(i++).padStart(2, '0')}-${sel.replace(/[^\w-]/g, '')}.jpg`, type: 'jpeg', quality: 60 });
}
const sw = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
console.log('scrollWidth/innerWidth', sw, 'errors:', errs.length ? errs : 'нет');
await b.close();
