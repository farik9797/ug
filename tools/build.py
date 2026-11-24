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
    "ps": ("services.html#ps", "g-detector", "Дымовой извещатель на потолке", "50% 30%", "02", "Пожарная сигнализация", "ПС"),
    "soue": ("services.html#soue", "g-exit", "Прибор системы оповещения на стене", "50% 35%", "03", "Оповещение и управление эвакуацией", "СОУЭ"),
    "os": ("services.html#os", "g-camera", "Прибор охранной сигнализации", "50% 50%", "04", "Охранная сигнализация", "ОС"),
    "skud": ("services.html#skud", "g-access", "Турникеты на проходной", "50% 50%", "05", "Контроль и управление доступом", "СКУД"),
    "eo": ("services.html#eo", "g-lights", "Шкафы электрощитовой", "50% 50%", "06", "Электроосвещение и инженерные сети", "ЭО"),
    "net": ("services.html#net", "g-server", "Кабельные линии между стойками", "50% 50%", "07", "Инженерные сети", ""),
    "build": ("services.html#build", "g-engineers", "Атриум здания с перекрытиями", "50% 45%", "08", "Общестроительные работы", ""),
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
    for page in sorted((SRC / "pages").glob("*.html")):
        raw = page.read_text()
        m = re.match(r"<!--meta (.*?)-->\n", raw, flags=re.S)
        meta = json.loads(m[1])
        body = raw[m.end():]
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
        used_all |= set(re.findall(r'data-photo="([\w-]+)"', out))
        (OUT / page.name).write_text(out)
        print("built", page.name, len(out) // 1024, "KB")
    unused = set(CREDITS) - used_all
    if unused:
        print("не используются:", ", ".join(sorted(unused)))


if __name__ == "__main__":
    main()
