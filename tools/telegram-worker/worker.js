/**
 * UMARBEKOV GROUP: заявки с сайта → Telegram.
 * Cloudflare Worker. Токен бота хранится в секрете BOT_TOKEN, на сайте его нет.
 *
 * Переменные (wrangler.toml / секреты):
 *   BOT_TOKEN        секрет: токен бота от @BotFather
 *   CHAT_IDS         куда слать, через запятую (личный чат или группа, напр. -1001234567890)
 *   ALLOWED_ORIGINS  с каких сайтов принимать, через запятую
 *
 * Сайт шлёт POST multipart/form-data: name, phone, object_type, service, comment, source, tz (файл), website (ловушка для ботов).
 * Ответ: {ok:true} только если Telegram подтвердил доставку хотя бы в один чат.
 */
const MAX_FILE = 20 * 1024 * 1024; // предел Telegram для sendDocument через бота
const esc = (s) => String(s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const clip = (v, n) => String(v || '').trim().slice(0, n);

async function tg(env, method, body) {
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, { method: 'POST', body });
  let j = {};
  try { j = await r.json(); } catch (e) { j = { ok: false, description: 'bad json' }; }
  return j;
}

async function sendTo(env, chatId, text, file) {
  const msg = new FormData();
  msg.set('chat_id', chatId); msg.set('text', text); msg.set('parse_mode', 'HTML'); msg.set('disable_web_page_preview', 'true');
  let res = await tg(env, 'sendMessage', msg);
  // группа стала супергруппой: Telegram сообщает новый ID, повторяем туда
  const moved = res.parameters && res.parameters.migrate_to_chat_id;
  if (!res.ok && moved) { chatId = String(moved); msg.set('chat_id', chatId); res = await tg(env, 'sendMessage', msg); res.migrated_to = chatId; }
  if (res.ok && file) {
    const doc = new FormData();
    doc.set('chat_id', chatId); doc.set('document', file, file.name || 'tz'); doc.set('caption', 'Техническое задание к заявке выше');
    const d = await tg(env, 'sendDocument', doc);
    res.document = d.ok;
  }
  return res;
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const okOrigin = allowed.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': okOrigin ? origin : (allowed[0] || ''),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    };
    const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
    if (!okOrigin) return json({ ok: false, error: 'origin' }, 403);
    if (!env.BOT_TOKEN || !env.CHAT_IDS) return json({ ok: false, error: 'not configured' }, 500);

    let fd;
    try { fd = await req.formData(); } catch (e) { return json({ ok: false, error: 'form' }, 400); }
    if (clip(fd.get('website'), 200)) return json({ ok: true }); // ловушка: заполнил бот

    const name = clip(fd.get('name'), 100);
    const phone = clip(fd.get('phone'), 40);
    if (!name || phone.replace(/\D/g, '').length < 9) return json({ ok: false, error: 'fields' }, 400);

    const rows = [
      ['Имя', name],
      ['Телефон', phone],
      ['Тип объекта', clip(fd.get('object_type'), 100)],
      ['Услуга', clip(fd.get('service'), 120)],
      ['Комментарий', clip(fd.get('comment'), 2000)],
      ['Откуда', clip(fd.get('source'), 200)],
    ].filter(([, v]) => v);
    const text = '<b>Заявка с сайта UMARBEKOV GROUP</b>\n\n' + rows.map(([k, v]) => `<b>${esc(k)}:</b> ${esc(v)}`).join('\n');

    let file = fd.get('tz');
    if (!(file && typeof file === 'object' && file.size > 0)) file = null;
    if (file && file.size > MAX_FILE) file = null;

    const results = [];
    for (const chatId of String(env.CHAT_IDS).split(',').map((s) => s.trim()).filter(Boolean)) {
      const r = await sendTo(env, chatId, text, file);
      results.push({ chat: chatId, ok: !!r.ok, migrated_to: r.migrated_to, document: r.document, error: r.ok ? undefined : r.description });
    }
    const delivered = results.some((r) => r.ok);
    if (!delivered) console.log('telegram failed', JSON.stringify(results));
    if (results.some((r) => r.migrated_to)) console.log('chat migrated, update CHAT_IDS', JSON.stringify(results));
    return json({ ok: delivered }, delivered ? 200 : 502);
  },
};
