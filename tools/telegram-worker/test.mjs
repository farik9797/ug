import worker from './worker.js';
let mode = 'ok'; const calls = [];
globalThis.fetch = async (url, opt) => {
  const m = url.split('/').pop(); const chat = opt.body.get('chat_id'); calls.push(m + ':' + chat);
  if (mode === 'migrate' && chat === '-500' ) return new Response(JSON.stringify({ ok: false, description: 'group chat was upgraded to a supergroup chat', parameters: { migrate_to_chat_id: -1009 } }));
  if (mode === 'fail') return new Response(JSON.stringify({ ok: false, description: 'Forbidden: bot was blocked' }));
  return new Response(JSON.stringify({ ok: true, result: {} }));
};
const env = { BOT_TOKEN: 'x', CHAT_IDS: '-500', ALLOWED_ORIGINS: 'https://farik9797.github.io' };
const send = async (fields, origin = 'https://farik9797.github.io') => {
  const fd = new FormData(); for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  const r = await worker.fetch(new Request('https://w/x', { method: 'POST', body: fd, headers: { Origin: origin } }), env);
  return r.status + ' ' + await r.text();
};
const base = { name: 'Тест <b>', phone: '+998 90 123 45 67', service: 'АПТ', source: 'Оставить заявку / index' };
console.log('ok       ', await send(base), calls.splice(0));
console.log('file     ', await send({ ...base, tz: new File(['pdf'], 'tz.pdf') }), calls.splice(0));
mode = 'migrate'; console.log('migrate  ', await send(base), calls.splice(0)); mode = 'ok';
mode = 'fail'; console.log('fail     ', await send(base), calls.splice(0)); mode = 'ok';
console.log('honeypot ', await send({ ...base, website: 'spam' }), calls.splice(0));
console.log('origin   ', await send(base, 'https://evil.example'), calls.splice(0));
console.log('nophone  ', await send({ name: 'A', phone: '12' }), calls.splice(0));
