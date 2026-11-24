// Локальная проверка: посредник с подставным Telegram на :8787
import http from 'node:http';
import worker from './worker.js';
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opt) => { const m = String(url).split('/').pop(); const chat = opt.body.get('chat_id'); const extra = m === 'sendDocument' ? ' file=' + opt.body.get('document').name : ' text=' + JSON.stringify(opt.body.get('text')); console.log('TG', m, chat, extra); return new Response(JSON.stringify({ ok: true })); };
const env = { BOT_TOKEN: 'test', CHAT_IDS: '-100', ALLOWED_ORIGINS: 'http://localhost:4180' };
http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const r = await worker.fetch(new Request('http://localhost:8787' + req.url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks), duplex: 'half' }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer()));
}).listen(8787, () => console.log('dev 8787'));
