#!/usr/bin/env python3
"""Сборка статического макета: src/pages/*.html + src/partials -> site/*.html.

Метки в исходниках:
  <!--meta {...json...}-->        первая строка страницы: title, desc, nav, hero_dark
  {{icon:name}}                   иконка Lucide из src/icons (копия файла, без правок)
  {{img:slug|alt|sizes|pos|eager}} фото из site/assets/img с srcset
  {{include:name}}                файл из src/partials
  {{a:key}}                       активный пункт меню
"""
import json, re, pathlib, html

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / "src", ROOT / "site"
IMG = OUT / "assets" / "img"
import time
VER = str(int(time.time()))
CONFIG = json.loads((ROOT / "src" / "config.json").read_text()) if (ROOT / "src" / "config.json").exists() else {}
CREDITS = json.loads((IMG / "credits.json").read_text())


def icon(name, cls="i"):
    svg = (SRC / "icons" / f"{name}.svg").read_text()
    svg = re.sub(r"<!--.*?-->", "", svg, flags=re.S).strip()
    svg = re.sub(r'class="[^"]*"', f'class="{cls}" aria-hidden="true" focusable="false"', svg, count=1)
    return re.sub(r"\s*\n\s*", " ", svg)


def img(slug, alt="", sizes="100vw", pos="50% 50%", eager=""):
    w, h = CREDITS[slug]["size"]
    widths = [x for x in (960, 1600, 2400) if (IMG / f"{slug}-{x}.jpg").exists()]
    srcset = ", ".join(f"assets/img/{slug}-{x}.jpg {x}w" for x in widths)
    src = f"assets/img/{slug}-{1600 if 1600 in widths else widths[-1]}.jpg"
    load = 'fetchpriority="high"' if eager else 'loading="lazy" decoding="async"'
    return (f'<img src="{src}" srcset="{srcset}" sizes="{sizes}" width="{w}" height="{h}" '
            f'alt="{html.escape(alt, quote=True)}" style="object-position: {pos}" {load} data-photo="{slug}">')


DIRS = {
    "apt": ("service-apt.html", "g-sprinkler", "Красные стояки и узлы управления спринклерной системы", "50% 40%", "01", "Автоматическое пожаротушение", "АПТ"),
    "ps": ("service-ps.html", "g-detector", "Дымовой извещатель на потолке", "50% 30%", "02", "Пожарная сигнализация", "ПС"),
    "soue": ("service-soue.html", "g-exit", "Прибор системы оповещения на стене", "50% 35%", "03", "Оповещение и управление эвакуацией", "СОУЭ"),
    "os": ("service-os.html", "g-camera", "Прибор охранной сигнализации", "50% 50%", "04", "Охранная сигнализация", "ОС"),
    "skud": ("service-skud.html", "g-access", "Турникеты на проходной", "50% 50%", "05", "Контроль и управление доступом", "СКУД"),
    "eo": ("service-eo.html", "g-lights", "Шкафы электрощитовой", "50% 50%", "06", "Электроосвещение и инженерные сети", "ЭО"),
    "hvac": ("service-hvac.html", "g-hvac", "Воздуховоды и приточная установка в техническом помещении", "50% 50%", "07", "Отопление, вентиляция и кондиционирование", "ОВиК"),
    "sks": ("service-sks.html", "g-sks", "Патч-корды в коммутационной стойке серверной", "50% 50%", "08", "Структурированные кабельные сети", "СКС"),
    "smart": ("service-smart.html", "g-smart", "Сенсорная панель умного дома на стене гостиной", "22% 50%", "09", "Умный дом и автоматизация здания", ""),
    "vn": ("service-vn.html", "g-hv", "Трансформаторная подстанция на закате", "50% 50%", "10", "Высоковольтные сети", "ВН"),
    "net": ("service-net.html", "g-server", "Кабельные линии между стойками", "50% 50%", "11", "Инженерные сети", ""),
    "build": ("service-build.html", "g-engineers", "Атриум здания с перекрытиями", "50% 45%", "12", "Общестроительные работы", ""),
}


def tiles(keys):
    out = []
    for k in keys.split(","):
        href, im, alt, pos, n, t, ab = DIRS[k.strip()]
        abbr = f' <span class="tile__abbr">({ab})</span>' if ab else ""
        out.append(f'''<li class="tile" id="t-{k.strip()}">
        <a class="tile__link" href="{href}">
          <figure class="tile__media" data-slot="tile-{k.strip()}" data-alt="Фото направления: {t}">{{{{img:{im}|{alt}|(min-width: 60rem) 33vw, 100vw|{pos}}}}}</figure>
          <span class="tile__n">{n}</span>
          <h3 class="tile__t">{t}{abbr}</h3>
          <span class="tile__go" aria-hidden="true">{{{{icon:arrow-up-right}}}}</span>
        </a>
      </li>''')
    return '<ol class="tiles" data-deck>\n      ' + "\n      ".join(out) + "\n    </ol>"


def svc_img(spec, sizes, slot, eager=""):
    slug, alt, pos = spec
    if slug not in CREDITS:  # фото ещё не сделано: временная замена
        slug = FALLBACK
    return f'<figure class="{{cls}}" data-slot="{slot}" data-alt="{html.escape(alt, quote=True)}" data-parallax>{{{{img:{slug}|{alt}|{sizes}|{pos}{"|eager" if eager else ""}}}}}</figure>'


FALLBACK = "g-engineers"
CHECK = lambda items: "".join(f"<li>{{{{icon:check}}}}{html.escape(x)}</li>" for x in items)
GET = ["Проект, поставку и монтаж у одного подрядчика", "Смету и ресурсную ведомость до начала работ",
       "Полный пакет документов при сдаче", "Работу с НДС для юрлиц и госзаказчиков"]


def service_page(s):
    """Одна страница услуги из записи src/services.json. Разметка общая для всех услуг."""
    k = s["slug"]
    e = lambda t: html.escape(t)
    hero = svc_img(s["hero"], "(min-width: 60rem) 60vw, 100vw", f"{k}-hero", True).replace("{cls}", "phero__photo")
    ab = s["about"]
    about = svc_img(ab["img"], "(min-width: 60rem) 60vw, 100vw", f"{k}-about").replace("{cls}", "about__photo")
    plate = (f'<div class="about__plate" data-pop><span class="about__plate-n">{e(ab["plate"][0])}</span><p>{e(ab["plate"][1])}</p></div>'
             if ab.get("plate") else "")
    wl = svc_img(s["wl"], "(min-width: 60rem) 25vw, 100vw", f"{k}-w1").replace("{cls}", "sys__photo sys__photo--l")
    wr = svc_img(s["wr"], "(min-width: 60rem) 25vw, 100vw", f"{k}-w2").replace("{cls}", "sys__photo sys__photo--r")
    types = "".join(f'''
    <div class="sys__col">
      <span class="sys__n">{i:02d}</span>
      <h3 class="sys__h">{e(t["h"])}</h3>
      <p>{e(t["p"])}</p>
      <ul class="checks">{CHECK(t["li"])}</ul>
    </div>''' for i, t in enumerate(s["types"]["items"], 1))
    # вопросы без подтверждённого ответа не выводим (список — в PROGRESS.md)
    faq = "".join(f'<details><summary>{e(q)}{{{{icon:plus}}}}</summary><p>{e(a)}</p></details>'
                  for q, a in s["faq"] if not a.startswith("["))
    faq_sec = f'''
<section class="faq" aria-labelledby="faq-h">
  <div class="container faq__grid">
    <h2 id="faq-h">Частые вопросы</h2>
    <div class="faq__list">{faq}</div>
  </div>
</section>''' if faq else ""
    meta = {"title": s["title"], "desc": s["desc"], "nav": "services", "hdr": "over"}
    body = f'''<section class="phero phero--split dark" aria-labelledby="ph-h" data-service="{e(s["service"])}">
  <div class="phero__grid">
    <div class="phero__text">
      <nav class="crumbs" aria-label="Хлебные крошки"><ol><li><a href="index.html">Главная</a></li><li><a href="services.html">Услуги</a></li><li><span aria-current="page">{e(s["crumb"])}</span></li></ol></nav>
      <span class="phero__rule" aria-hidden="true"></span>
      <h1 id="ph-h">{e(s["h1"])}</h1>
      <p class="lead">{e(s["lead"])}</p>
      <div class="phero__actions">
        <a class="btn btn--gold" href="#request">Заказать расчёт{{{{icon:arrow-up-right}}}}</a>
        <a class="btn btn--line" href="#types">{e(s["types"]["h"])}</a>
      </div>
    </div>
    {hero}
  </div>
</section>

<section class="about" aria-labelledby="d-h">
  <div class="about__grid">
    <div class="about__text">
      <h2 id="d-h">{e(ab["h"])}</h2>
      {"".join(f"<p>{e(p)}</p>" for p in ab["p"])}
    </div>
    <div class="about__visual">
      {about}
      {plate}
    </div>
  </div>
</section>

<section class="sys sys--3 dark" id="types" aria-labelledby="t-h">
  <h2 id="t-h" class="visually-hidden">{e(s["types"]["h"])}</h2>
  <div class="sys__grid">{types}
  </div>
</section>

<section class="sys" aria-labelledby="w-h">
  <div class="sys__grid">
    {wl}
    <div class="sys__col">
      <h2 id="w-h">Состав работ</h2>
      <ul class="checks">{CHECK(s["work"])}</ul>
    </div>
    <div class="sys__col">
      <h2>Что вы получаете</h2>
      <ul class="checks">{CHECK(s.get("get", GET))}</ul>
      <a class="btn btn--gold btn--sm" href="#request">Заказать расчёт{{{{icon:arrow-up-right}}}}</a>
    </div>
    {wr}
  </div>
</section>
{faq_sec}

<section class="page-sec dirs" aria-labelledby="rel-h">
  <div class="container">
    <div class="sec-head sec-head--row"><h2 id="rel-h">Похожие услуги</h2><a class="link" href="services.html">Все услуги{{{{icon:arrow-up-right}}}}</a></div>
    {{{{tiles:{s["related"]}}}}}
  </div>
</section>

{{{{include:cta}}}}
{{{{include:request}}}}
'''
    return meta, body


def render(text, meta):
    text = re.sub(r"\{\{tiles:([\w,]+)\}\}", lambda m: tiles(m[1]), text)
    for _ in range(3):
        text = re.sub(r"\{\{include:([\w-]+)\}\}",
                      lambda m: (SRC / "partials" / (m[1] if "." in m[1] else m[1] + ".html")).read_text()
                      if (SRC / "partials" / (m[1] + ".html")).exists()
                      else (SRC / "partials" / (m[1] + ".svg")).read_text(), text)
    text = re.sub(r"\{\{icon:([\w-]+)\}\}", lambda m: icon(m[1]), text)
    text = re.sub(r"\{\{img:([^}]+)\}\}", lambda m: img(*m[1].split("|")), text)
    if "{{credits_list}}" in text:
        items = "".join(
            f'<li><a href="{v["page"]}">{html.escape(k)}</a>: {html.escape(v["author"])}, {html.escape(v["license"])}, Wikimedia Commons</li>'
            for k, v in sorted(CREDITS.items()) if not v.get('own'))
        text = text.replace("{{credits_list}}", items)
    nav = meta.get("nav", "")
    text = re.sub(r"\{\{a:(\w+)\}\}",
                  lambda m: ' is-active" aria-current="page' if m[1] == nav else "", text)
    return text


def main():
    layout = (SRC / "partials" / "layout.html").read_text()
    used_all = set()
    pages = []
    for page in sorted((SRC / "pages").glob("*.html")):
        raw = page.read_text()
        m = re.match(r"<!--meta (.*?)-->\n", raw, flags=re.S)
        pages.append((page.name, json.loads(m[1]), raw[m.end():]))
    for s in json.loads((SRC / "services.json").read_text()):
        pages.append((f"service-{s['slug']}.html", *service_page(s)))
    for name, meta, body in pages:
        page = pathlib.Path(name)
        out = layout.replace("{{body}}", body)
        out = out.replace("{{title}}", html.escape(meta["title"]))
        out = out.replace("{{desc}}", html.escape(meta["desc"], quote=True))
        out = out.replace("{{page}}", page.stem).replace("{{ver}}", VER)
        out = out.replace("{{hdr_mode}}", meta.get("hdr", "solid"))
        seq_attr = ""
        for key, d in (("d", "fly-1920"), ("m", "fly-960")):
            mf = OUT / "assets" / d / "manifest.json"
            if mf.exists():
                mj = json.loads(mf.read_text())
                seq_attr += f' data-seq-{key}="{mj["pattern"]}|{mj["count"]}"'
        out = out.replace("{{seq}}", seq_attr)
        out = render(out, meta)
        out = out.replace('data-endpoint=""', f'data-endpoint="{html.escape(CONFIG.get("lead_endpoint", ""), quote=True)}"')
        used_all |= set(re.findall(r'data-photo="([\w-]+)"', out))
        (OUT / page.name).write_text(out)
        print("built", page.name, len(out) // 1024, "KB")
    unused = set(CREDITS) - used_all
    if unused:
        print("не используются:", ", ".join(sorted(unused)))


if __name__ == "__main__":
    main()
