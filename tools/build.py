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
    "os": ("service-os.html", "g-os-pir", "Датчик движения охранной сигнализации в углу помещения", "50% 50%", "04", "Охранная сигнализация", "ОС"),
    "skud": ("service-skud.html", "g-access", "Турникеты на проходной", "50% 50%", "05", "Контроль и управление доступом", "СКУД"),
    "eo": ("service-eo.html", "g-lights", "Шкафы электрощитовой", "50% 50%", "06", "Электроснабжение и электроосвещение", "ЭО"),
    "hvac": ("service-hvac.html", "g-hvac", "Воздуховоды и приточная установка в техническом помещении", "50% 50%", "07", "Отопление, вентиляция и кондиционирование", "ОВиК"),
    "sks": ("service-sks.html", "g-sks", "Патч-корды в коммутационной стойке серверной", "50% 50%", "08", "Структурированные кабельные сети", "СКС"),
    "smart": ("service-smart.html", "g-smart", "Сенсорная панель умного дома на стене гостиной", "22% 50%", "09", "Умный дом KNX", ""),
    "vn": ("service-vn.html", "g-camera", "Купольная камера видеонаблюдения на потолке", "50% 50%", "10", "Видеонаблюдение", "ВН"),
    "net": ("service-net.html", "g-server", "Кабельные линии между стойками", "50% 50%", "11", "Инженерные сети", ""),
    "to": ("service-to.html", "g-ps-panel", "Приёмно-контрольный прибор пожарной сигнализации", "50% 50%", "13", "Техническое обслуживание", ""),
    "build": ("service-build.html", "g-engineers", "Атриум здания с перекрытиями", "50% 45%", "12", "Общестроительные работы", ""),
}


def tiles(keys, mod=""):
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
    cls = f"tiles tiles--{mod}" if mod else "tiles"
    return f'<ol class="{cls}" data-deck>\n      ' + "\n      ".join(out) + "\n    </ol>"


def svc_img(spec, sizes, slot, eager=""):
    slug, alt, pos = spec
    if slug not in CREDITS:  # фото ещё не сделано: временная замена
        slug = FALLBACK
    return f'<figure class="{{cls}}" data-slot="{slot}" data-alt="{html.escape(alt, quote=True)}" data-parallax>{{{{img:{slug}|{alt}|{sizes}|{pos}{"|eager" if eager else ""}}}}}</figure>'


FALLBACK = "g-engineers"
CHECK = lambda items: "".join(f"<li>{{{{icon:check}}}}{html.escape(x)}</li>" for x in items)
PRICE = ("Цена зависит от площади, состава системы и оборудования. Пришлите проект или техническое задание: "
         "посчитаем смету с ресурсной ведомостью. Проекта нет — инженер приедет на объект.")
# документы компании (файлы в site/assets/docs)
LICENSES = {
    "mchs": ("Подтверждение МЧС Республики Узбекистан", "№ 1662197 от 22.06.2026",
             "Монтаж, наладка, ремонт и обслуживание систем автоматического пожаротушения и пожарной сигнализации",
             "assets/docs/ug-mchs.pdf", "assets/docs/ug-mchs.jpg"),
    "ng": ("Подтверждение Национальной гвардии Республики Узбекистан", "№ 1666746 от 24.06.2026",
           "Монтаж, наладка, ремонт и обслуживание технических средств и систем охраны",
           "assets/docs/ug-ng.pdf", "assets/docs/ug-ng.jpg"),
    "certs": ("Сертификаты специалистов", "4 инженера, 26.05.2026, действуют 3 года",
              "Повышение квалификации по монтажу, наладке, ремонту и обслуживанию АПТ и пожарной сигнализации, 48 часов",
              "docs.html#certs", "assets/docs/cert-001342.jpg"),
}


def lic_cards(keys):
    out = []
    for k in keys:
        t, n, what, href, thumb = LICENSES[k]
        out.append(f'''<li class="lic"><a href="{href}"{' target="_blank" rel="noopener"' if href.endswith('.pdf') else ''}>
        <span class="lic__img"><img src="{thumb}" alt="{html.escape(t)}" loading="lazy" decoding="async"></span>
        <span class="lic__t">{html.escape(t)}</span><span class="lic__n">{html.escape(n)}</span><span class="lic__d">{html.escape(what)}</span></a></li>''')
    return "".join(out)


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
    parts = "".join(f'<li class="part"><span class="part__ic">{{{{icon:{i}}}}}</span><h3 class="part__h">{e(h)}</h3><p>{e(p)}</p></li>'
                    for i, h, p in s["parts"]["items"])
    objs = "".join(f'<li>{{{{icon:{i}}}}}{e(t)}</li>' for i, t in s["objects"])
    steps = "".join(f'<li><span class="steps__dot">{n:02d}</span><span class="steps__t">{e(t)}</span></li>'
                    for n, t in enumerate(s["steps"], 1))
    lic = s.get("licenses", [])
    lic_sec = f'''
<section class="page-sec lics" aria-labelledby="lic-h">
  <div class="container">
    <div class="sec-head sec-head--row"><div><h2 id="lic-h">Лицензии и допуски</h2><p class="sec-head__sub">Документы открываются в полном размере.</p></div><a class="link" href="docs.html">Все документы{{{{icon:arrow-up-right}}}}</a></div>
    <ul class="lics__list">{lic_cards(lic)}</ul>
  </div>
</section>''' if lic else ""
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
        <a class="btn btn--gold" href="#request">Рассчитать стоимость{{{{icon:arrow-up-right}}}}</a>
        <a class="btn btn--line" href="#f-file">Загрузить проект или ТЗ</a>
      </div>
    </div>
    {hero}
  </div>
</section>

<section class="page-sec parts" id="types" aria-labelledby="t-h">
  <div class="container">
    <div class="sec-head"><h2 id="t-h">{e(s["parts"]["h"])}</h2></div>
    <ul class="parts__list">{parts}</ul>
  </div>
</section>

<section class="about" aria-labelledby="d-h">
  <div class="about__grid">
    <div class="about__text">
      <h2 id="d-h">{e(ab["h"])}</h2>
      {"".join(f"<p>{e(p)}</p>" for p in ab["p"])}
      <h3 class="objs__h">Для каких объектов</h3>
      <ul class="objs">{objs}</ul>
    </div>
    <div class="about__visual">
      {about}
      {plate}
    </div>
  </div>
</section>

<section class="steps dark" aria-labelledby="steps-h" data-steps>
  <div class="steps__bg" aria-hidden="true">{{{{include:plan}}}}</div>
  <div class="container steps__grid">
    <div class="steps__text">
      <h2 id="steps-h">Как работаем</h2>
      <p>Срок каждого этапа зависит от объекта, его называем вместе со сметой.</p>
      <a class="btn btn--gold btn--sm" href="#request">Вызвать инженера{{{{icon:arrow-up-right}}}}</a>
    </div>
    <div class="steps__rail">
      <div class="steps__line" aria-hidden="true"><span data-steps-line></span></div>
      <ol class="steps__list" style="--n: {len(s["steps"])}">{steps}</ol>
    </div>
  </div>
</section>

<section class="sys" aria-labelledby="w-h">
  <div class="sys__grid">
    {wl}
    <div class="sys__col">
      <h2 id="w-h">Почему с нами</h2>
      <ul class="checks">{CHECK(s["args"])}</ul>
    </div>
    <div class="sys__col" id="price">
      <h2>Стоимость</h2>
      <p>{e(s.get("price", PRICE))}</p>
      <div class="sys__acts">
        <a class="btn btn--gold btn--sm" href="#request">Рассчитать стоимость{{{{icon:arrow-up-right}}}}</a>
        <a class="link" href="#f-file">{{{{icon:paperclip}}}}Загрузить проект или ТЗ</a>
      </div>
    </div>
    {wr}
  </div>
</section>
{lic_sec}
{faq_sec}

<section class="page-sec dirs" aria-labelledby="rel-h">
  <div class="container">
    <div class="sec-head sec-head--row"><h2 id="rel-h">Связанные услуги</h2><a class="link" href="services.html">Все услуги{{{{icon:arrow-up-right}}}}</a></div>
    {{{{tiles:{s["related"]}}}}}
  </div>
</section>

{{{{include:cta}}}}
{{{{include:request}}}}
'''
    return meta, body


def render(text, meta):
    text = re.sub(r"\{\{tiles(\d?):([\w,]+)\}\}", lambda m: tiles(m[2], m[1]), text)
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


# ---------- SEO: canonical, Open Graph, JSON-LD, sitemap, robots ----------
SITE = CONFIG.get("site_url", "").rstrip("/") + "/"
ORG_ID = SITE + "#org"
ORG = {
    "@type": "LocalBusiness", "@id": ORG_ID, "name": "UMARBEKOV GROUP",
    "legalName": "ООО «UMARBEKOV GROUP»", "url": SITE,
    "logo": SITE + "assets/logo/ug-04_minimal_eastern-gold.png",
    "image": SITE + "assets/img/ug-exterior-1600.jpg",
    "telephone": "+998888000056", "email": "umarbekov.group@mail.ru",
    "taxID": "311802238", "vatID": "326040261596",
    "address": {"@type": "PostalAddress", "streetAddress": "ул. Кичик Мирабад 2-берк, дом 3, МСГ «Хамид Сулаймонов»",
                "addressLocality": "Ташкент", "addressRegion": "Яккасарайский район", "addressCountry": "UZ"},
    "areaServed": {"@type": "Country", "name": "Узбекистан"},
}
strip = lambda h: re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", h))).strip()


def page_url(name):
    return SITE if name == "index.html" else SITE + name


# Переключатель палитры тёмных блоков: только на превью, пока клиент выбирает.
PALETTES = [("graphite", "Графит", "oklch(16% 0.004 85)"), ("navy", "Синий", "oklch(20% 0.045 258)"),
            ("emerald", "Изумруд", "oklch(21% 0.038 168)"), ("bronze", "Бронза", "oklch(20.5% 0.022 55)")]
PALETTE_HEAD = """<script>(function(){var k='ug-palette',p=new URLSearchParams(location.search).get('palette');try{if(p)localStorage.setItem(k,p);p=p||localStorage.getItem(k)}catch(e){}if(p&&p!=='graphite')document.documentElement.dataset.palette=p})()</script>"""
PALETTE_UI = ('<div class="pal" role="group" aria-label="Вариант цвета"><span class="pal__t">Цвет блоков:</span>'
    + "".join(f'<button class="pal__b" type="button" data-pal="{k}" style="--sw: {c}" title="{n}" aria-label="{n}" aria-pressed="false"></button>' for k, n, c in PALETTES)
    + """</div><script>(function(){var r=document.documentElement,bs=document.querySelectorAll('[data-pal]');function sync(){var c=r.dataset.palette||'graphite';bs.forEach(function(b){b.setAttribute('aria-pressed',b.dataset.pal===c)})}bs.forEach(function(b){b.addEventListener('click',function(){var k=b.dataset.pal;if(k==='graphite')delete r.dataset.palette;else r.dataset.palette=k;try{localStorage.setItem('ug-palette',k)}catch(e){}sync()})});sync()})()</script>""")


def seo_head(name, meta, body):
    url = page_url(name)
    m = re.search(r'data-photo="([\w-]+)"', body)
    img = f"{SITE}assets/img/{m[1]}-1600.jpg" if m and (IMG / f"{m[1]}-1600.jpg").exists() else ORG["image"]
    graph = []
    if name in ("index.html", "contacts.html", "about.html", "docs.html"):
        graph.append(ORG)
    crumbs = re.search(r'<nav class="crumbs".*?</nav>', body, flags=re.S)
    if crumbs:
        items = re.findall(r'<li>(?:<a href="([^"]+)">(.*?)</a>|<span[^>]*>(.*?)</span>)</li>', crumbs[0])
        graph.append({"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": i, "name": strip(a_t or s_t), "item": page_url(href) if href else url}
            for i, (href, a_t, s_t) in enumerate(items, 1)]})
    if name.startswith("service-") or name == "complex.html":
        h1 = re.search(r"<h1[^>]*>(.*?)</h1>", body, flags=re.S)
        svc = re.search(r'data-service="([^"]+)"', body)
        graph.append({"@type": "Service", "name": strip(h1[1]) if h1 else meta["title"],
                      "serviceType": html.unescape(svc[1]) if svc else "", "description": meta["desc"], "url": url,
                      "provider": {"@id": ORG_ID}, "areaServed": {"@type": "City", "name": "Ташкент"}})
    faq = re.findall(r"<details>\s*<summary>(.*?)</summary>\s*<p>(.*?)</p>\s*</details>", body, flags=re.S)
    if faq:
        graph.append({"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": strip(q), "acceptedAnswer": {"@type": "Answer", "text": strip(a)}} for q, a in faq]})
    head = [f'<link rel="canonical" href="{url}">',
            '<meta property="og:type" content="website">', '<meta property="og:locale" content="ru_RU">',
            '<meta property="og:site_name" content="UMARBEKOV GROUP">',
            f'<meta property="og:title" content="{html.escape(meta["title"], quote=True)}">',
            f'<meta property="og:description" content="{html.escape(meta["desc"], quote=True)}">',
            f'<meta property="og:url" content="{url}">', f'<meta property="og:image" content="{img}">']
    if CONFIG.get("preview", True):
        head.insert(0, '<meta name="robots" content="noindex">')
    if graph:
        ld = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False).replace("</", "<\\/")
        head.append(f'<script type="application/ld+json">{ld}</script>')
    return "\n".join(head)


def write_sitemap(names):
    urls = "".join(f"<url><loc>{page_url(n)}</loc></url>" for n in names if n not in ("privacy.html",))
    (OUT / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>\n')
    rule = "Disallow: /" if CONFIG.get("preview", True) else "Disallow:"
    (OUT / "robots.txt").write_text(f"User-agent: *\n{rule}\n\nSitemap: {SITE}sitemap.xml\n")


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
        out = out.replace("{{seo_head}}", seo_head(name, meta, out))
        out = out.replace("{{palette_head}}", PALETTE_HEAD if CONFIG.get("preview", True) else "")
        out = out.replace("{{palette_ui}}", PALETTE_UI if CONFIG.get("preview", True) else "")
        out = out.replace('data-endpoint=""', f'data-endpoint="{html.escape(CONFIG.get("lead_endpoint", ""), quote=True)}"')
        used_all |= set(re.findall(r'data-photo="([\w-]+)"', out))
        (OUT / page.name).write_text(out)
        print("built", page.name, len(out) // 1024, "KB")
    write_sitemap([n for n, _, _ in pages])
    unused = set(CREDITS) - used_all
    if unused:
        print("не используются:", ", ".join(sorted(unused)))


if __name__ == "__main__":
    main()
