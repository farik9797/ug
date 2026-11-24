# Заявки с сайта → Telegram

Посредник на Cloudflare Workers: принимает форму с сайта, проверяет и пересылает в Telegram. Токен бота хранится секретом в Cloudflare, на сайте его нет.

## Что нужно один раз
1. Бот: в Telegram @BotFather → /newbot → получить токен.
2. Чат: создать группу «UG Заявки», добавить туда бота и сотрудников. Написать в группу любое сообщение.
3. ID группы: открыть `https://api.telegram.org/bot<ТОКЕН>/getUpdates` → `chat.id` (вида -100…).
4. Cloudflare: `npx wrangler login` (откроется браузер, вход в аккаунт Cloudflare).

## Развернуть
```bash
cd tools/telegram-worker
npx wrangler secret put BOT_TOKEN      # вставить токен
# в wrangler.toml заполнить CHAT_IDS = "-100…"
npx wrangler deploy                    # выдаст адрес https://ug-leads.<аккаунт>.workers.dev
```
Адрес вписать в `src/config.json` → `lead_endpoint`, затем `python3 tools/build.py` и публикация.

## Проверка
- `node test.mjs` — тесты на подставном Telegram (доставка, файл, смена ID группы, отказ, ловушка, чужой сайт, пустой телефон).
- `node dev-server.mjs` — локальный посредник на :8787 с подставным Telegram, для проверки форм на localhost:4180.

## Важно
- Ответ `{ok:true}` только если Telegram подтвердил доставку; иначе сайт покажет «Заявка не ушла» и телефон.
- Если группу превратят в супергруппу, её ID меняется. Посредник сам повторит отправку на новый ID и запишет в лог `chat migrated` — обновите CHAT_IDS.
- Разрешённые сайты — `ALLOWED_ORIGINS` в wrangler.toml (превью GitHub Pages, umgroup.uz, localhost).
- На WordPress то же самое сделает PHP-обработчик в теме/mu-plugin (токен в wp-config).
