/* UMARBEKOV GROUP: интерфейс и 3D-анимации прокрутки (GSAP + ScrollTrigger).
   Без JS и при prefers-reduced-motion страница показывается целиком, без анимаций. */
(() => {
  const d = document;
  const root = d.documentElement;

  /* ---------- шапка: компактнее при прокрутке ---------- */
  const hdr = d.querySelector('[data-hdr]');
  const onScroll = () => hdr && hdr.classList.toggle('is-compact', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- мобильное меню ---------- */
  const btn = d.querySelector('[data-menu]');
  const drawer = d.querySelector('[data-drawer]');
  const setMenu = (open) => {
    if (!btn || !drawer) return;
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    drawer.hidden = !open;
    d.body.classList.toggle('menu-open', open);
    d.body.style.overflow = open ? 'hidden' : '';
  };
  btn && btn.addEventListener('click', () => setMenu(btn.getAttribute('aria-expanded') !== 'true'));
  drawer && drawer.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  d.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- форма заявки ---------- */
  d.querySelectorAll('[data-form]').forEach((form) => {
    const file = form.querySelector('.file__input');
    const fileLabel = form.querySelector('[data-file-label]');
    file && file.addEventListener('change', () => {
      fileLabel.textContent = file.files.length ? file.files[0].name : 'Прикрепить техническое задание';
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let first = null;
      form.querySelectorAll('[required]').forEach((inp) => {
        const msg = inp.parentElement.querySelector('.field__msg');
        let err = '';
        if (!inp.value.trim()) err = inp.name === 'phone' ? 'Укажите телефон, чтобы мы могли перезвонить' : 'Укажите, как к вам обращаться';
        else if (inp.name === 'phone' && inp.value.replace(/\D/g, '').length < 9) err = 'В номере меньше 9 цифр, проверьте его';
        inp.setAttribute('aria-invalid', err ? 'true' : 'false');
        if (msg) msg.textContent = err;
        if (err && !first) first = inp;
      });
      if (first) { first.focus(); return; }
      const status = form.querySelector('[data-status]');
      const endpoint = form.dataset.endpoint;
      if (!endpoint) {
        status.textContent = 'Форма пока не подключена, заявка не отправлена. Позвоните: +998 88 800-00-56 или напишите на umarbekov.group@mail.ru.';
        return;
      }
      const submit = form.querySelector('[type="submit"]');
      submit.setAttribute('aria-busy', 'true');
      fetch(endpoint, { method: 'POST', body: new FormData(form) })
        .then((r) => { if (!r.ok) throw new Error(r.status); status.textContent = 'Заявка отправлена. Мы свяжемся с вами.'; form.reset(); })
        .catch(() => { status.textContent = 'Заявка не ушла из-за ошибки сети. Позвоните: +998 88 800-00-56.'; })
        .finally(() => submit.removeAttribute('aria-busy'));
    });
  });

  /* ---------- фильтр объектов ---------- */
  d.querySelectorAll('[data-filter]').forEach((bar) => {
    const items = d.querySelectorAll(bar.dataset.filter);
    bar.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      bar.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      const v = chip.dataset.value;
      items.forEach((it) => { it.hidden = v !== 'all' && !(it.dataset.type || '').split(' ').includes(v); });
      window.ScrollTrigger && window.ScrollTrigger.refresh();
    });
  });

  /* ---------- схема: подсветка системы по наведению на метку или пункт списка ---------- */
  d.querySelectorAll('[data-plan-scope]').forEach((scope) => {
    const plan = scope.querySelector('[data-plan]');
    const items = scope.querySelectorAll('.pin, [data-legend] li');
    const set = (sys) => {
      if (sys) plan.dataset.active = sys; else delete plan.dataset.active;
      items.forEach((it) => it.classList.toggle('is-on', !!sys && it.dataset.sys === sys));
    };
    const on = (e) => { const it = e.target.closest('[data-sys]'); set(it && it.dataset.sys); };
    scope.addEventListener('pointerover', on); scope.addEventListener('focusin', on);
    scope.addEventListener('pointerleave', () => set(null)); scope.addEventListener('focusout', () => set(null));
  });

  /* ---------- 3D-прокрутка ---------- */
  const start = () => {
    const { gsap, ScrollTrigger } = window;
    if (!gsap || !ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    const mm = gsap.matchMedia();

    mm.add({
      desk: '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
      mob: '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
    }, (ctx) => {
      const { desk } = ctx.conditions;
      root.classList.add('has-3d');
      const $ = (s, el = d) => Array.from(el.querySelectorAll(s));

      /* Герой: камера влетает в здание, внутри прорисовывается схема систем */
      const intro = d.querySelector('[data-intro]');
      const hero = d.querySelector('[data-hero]');
      const plan = d.querySelector('[data-plan]');
      if (hero) gsap.from($('[data-hero-copy] > *', hero), { y: 24, opacity: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out', delay: 0.1 });
      const prep = (lines) => lines.forEach((p) => { const l = p.getTotalLength(); p.style.strokeDasharray = l; p.style.strokeDashoffset = l; });
      if (intro && plan) {
        const lines = $('.plan .d', plan).filter((el) => !el.classList.contains('plan__cable'));
        const marks = $('.plan__sys > :not(.d)', plan);
        const pins = $('.pin, [data-legend] li', intro);
        if (desk || ctx.conditions.mob) {
          intro.classList.add('is-3d');
          prep(lines);
          const inside = intro.querySelector('[data-inside]');
          const media = intro.querySelector('[data-hero-media]');
          const innerL = intro.querySelector('[data-hero-inner]');
          const tl = gsap.timeline({ scrollTrigger: { trigger: intro, start: 'top top', end: '+=300%', scrub: 0.6, pin: true, anticipatePin: 1 } })
            .to('[data-hero-copy]', { opacity: 0, y: -80, duration: 0.12, ease: 'power1.in' }, 0)
            .to('[data-hero-scrim]', { opacity: 0, duration: 0.18 }, 0);
          const spec = (desk ? media.dataset.seqD : media.dataset.seqM) || media.dataset.seqD;
          if (spec) {
            /* Видео 1920: кадры листаются по скроллу на canvas */
            const [pattern, countS] = spec.split('|'); const count = +countS;
            const stage = intro.querySelector('.hero__stage');
            const canvas = d.createElement('canvas'); canvas.className = 'hero__canvas'; canvas.setAttribute('data-keep', '');
            stage.insertBefore(canvas, intro.querySelector('[data-hero-scrim]'));
            const g = canvas.getContext('2d', { alpha: false });
            const frames = []; let want = 0;
            const draw = (i) => {
              let k = i; while (k > 0 && !(frames[k] && frames[k].complete && frames[k].naturalWidth)) k--;
              const im = frames[k]; if (!im || !im.naturalWidth) return;
              const cw = canvas.width, ch = canvas.height, sc = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
              const w = im.naturalWidth * sc, h = im.naturalHeight * sc;
              g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
              g.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
            };
            const fit = () => { const dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Math.round(stage.clientWidth * dpr); canvas.height = Math.round(stage.clientHeight * dpr); draw(want); };
            for (let i = 0; i < count; i++) { const im = new Image(); im.decoding = 'async'; im.onload = () => { if (i === 0) fit(); else if (Math.abs(i - want) <= 2) draw(want); }; im.src = pattern.replace('%04d', String(i + 1).padStart(4, '0')); frames[i] = im; }
            window.addEventListener('resize', fit);
            const f = { i: 0 };
            tl.fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: 0.02, ease: 'none' }, 0)
              .to(f, { i: count - 1, duration: 0.56, ease: 'none', onUpdate: () => { want = Math.round(f.i); draw(want); } }, 0);
          } else {
            /* Без кадров: наезд на фасад и переход в атриум */
            tl.fromTo(media, { scale: 1 }, { scale: desk ? 2.1 : 1.7, duration: 0.4, ease: 'power2.in' }, 0)
              .fromTo(innerL, { opacity: 0, scale: 1.25, filter: 'blur(8px) brightness(1.6)' }, { opacity: 1, scale: 1.05, filter: 'blur(0px) brightness(1)', duration: 0.12, ease: 'power1.out' }, 0.32)
              .to(media, { opacity: 0, duration: 0.08 }, 0.38)
              .to(innerL, { scale: 1.32, duration: 0.18, ease: 'none' }, 0.44);
          }
          tl
            .to('[data-hero-veil]', { opacity: 1, duration: 0.08, ease: 'none' }, 0.56)
            .set(inside, { visibility: 'visible' }, 0.6)
            .fromTo(inside, { opacity: 0, scale: 1.3 }, { opacity: 1, scale: 1, duration: 0.1, ease: 'power2.out' }, 0.6)
            .to(lines, { strokeDashoffset: 0, duration: 0.18, stagger: 0.0012, ease: 'none' }, 0.66)
            .from(marks, { opacity: 0, scale: 0, transformOrigin: '50% 50%', duration: 0.05, stagger: 0.001, ease: 'back.out(2)' }, 0.8)
            .from(pins, { opacity: 0, y: 14, duration: 0.05, stagger: 0.012 }, 0.88)
            .to({}, { duration: 0.04 });
          ctx.add(() => () => { intro.classList.remove('is-3d'); lines.forEach((p) => { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; }); });
        } else {
          prep(lines);
          gsap.to(lines, { strokeDashoffset: 0, duration: 1.4, stagger: 0.006, ease: 'power1.inOut', scrollTrigger: { trigger: plan, start: 'top 80%' } });
          gsap.from(marks, { opacity: 0, scale: 0, transformOrigin: '50% 50%', duration: 0.3, stagger: 0.005, delay: 0.6, scrollTrigger: { trigger: plan, start: 'top 80%' } });
        }
      }

      /* Фото раскрываются из глубины, внутри кадра лёгкий параллакс */
      $('.tilt').forEach((el) => {
        const side = el.dataset.tilt === 'right' ? -1 : 1;
        gsap.fromTo(el,
          desk ? { rotateY: side * 30, rotateX: 8, z: -180, opacity: 0.35 } : { y: 40, opacity: 0 },
          { rotateY: 0, rotateX: 0, z: 0, y: 0, opacity: 1, ease: 'none',
            scrollTrigger: { trigger: el, start: 'top 98%', end: 'center 60%', scrub: 0.8 } });
        const img = el.querySelector('img');
        if (img && desk) gsap.fromTo(img, { yPercent: -7, scale: 1.14 }, { yPercent: 7, scale: 1.14, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
      });

      /* Карточки направлений поднимаются, как листы со стола */
      $('[data-deck] > li').forEach((c, i) => {
        gsap.fromTo(c,
          desk ? { rotateX: -55, y: 160, z: -220, opacity: 0, transformOrigin: '50% 100%' } : { y: 40, opacity: 0 },
          { rotateX: 0, y: 0, z: 0, opacity: 1, ease: 'power2.out',
            scrollTrigger: { trigger: c, start: 'top 100%', end: `top ${desk ? 62 - (i % 3) * 4 : 75}%`, scrub: 0.8 } });
      });

      /* Этапы работ: горизонтальный проезд с поворотом карточек */
      const proc = d.querySelector('[data-process]');
      if (proc) {
        const steps = $('.step', proc);
        if (desk) {
          proc.classList.add('is-h');
          const track = proc.querySelector('[data-process-track]');
          const rail = proc.querySelector('.process__rail');
          const dist = () => Math.max(0, track.scrollWidth - rail.clientWidth);
          const ride = gsap.to(track, { x: () => -dist(), ease: 'none',
            scrollTrigger: { trigger: proc, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8, invalidateOnRefresh: true } });
          gsap.fromTo('[data-process-line]', { scaleX: 0 }, { scaleX: 1, ease: 'none',
            scrollTrigger: { trigger: proc, start: 'top top', end: () => '+=' + dist(), scrub: 0.8, invalidateOnRefresh: true } });
          steps.forEach((s) => gsap.fromTo(s, { rotateY: -48, z: -160, opacity: 0.25, transformOrigin: '0% 50%' },
            { rotateY: 0, z: 0, opacity: 1, ease: 'none',
              scrollTrigger: { trigger: s, containerAnimation: ride, start: 'left 98%', end: 'left 62%', scrub: true } }));
          ctx.add(() => () => proc.classList.remove('is-h'));
        } else {
          steps.forEach((s) => gsap.from(s, { y: 32, opacity: 0, duration: 0.6, ease: 'power2.out', scrollTrigger: { trigger: s, start: 'top 88%' } }));
        }
      }

      /* Объекты: карточки разворачиваются к зрителю */
      $('[data-gallery] > li').forEach((c, i) => {
        gsap.fromTo(c,
          desk ? { rotateY: i % 2 ? -22 : 22, z: -200, opacity: 0.2, transformOrigin: i % 2 ? '100% 50%' : '0% 50%' } : { y: 40, opacity: 0 },
          { rotateY: 0, z: 0, y: 0, opacity: 1, ease: 'none',
            scrollTrigger: { trigger: c, start: 'top 100%', end: 'top 55%', scrub: 0.8 } });
      });

      /* Документы: стопка листов раскладывается веером */
      const sheets = $('[data-sheets] .sheet');
      if (sheets.length && desk) {
        gsap.from(sheets, {
          x: (i) => -i * (sheets[0].offsetWidth + 16),
          rotateZ: (i) => (i - 1.5) * 5,
          rotateY: -35, z: (i) => -i * 60, ease: 'none',
          scrollTrigger: { trigger: '[data-sheets]', start: 'top 90%', end: 'center 50%', scrub: 0.8 },
        });
      } else if (sheets.length) {
        gsap.from(sheets, { y: 32, opacity: 0, stagger: 0.08, duration: 0.6, scrollTrigger: { trigger: '[data-sheets]', start: 'top 85%' } });
      }

      /* Карта: из наклонной плоскости в план */
      const map = d.querySelector('[data-map3d] .uzmap');
      if (map) {
        gsap.fromTo(map,
          desk ? { rotateX: 60, rotateZ: -10, scale: 0.86, y: 80, transformOrigin: '50% 70%' } : { y: 30, opacity: 0 },
          { rotateX: 0, rotateZ: 0, scale: 1, y: 0, opacity: 1, ease: 'none',
            scrollTrigger: { trigger: map, start: 'top 100%', end: 'center 55%', scrub: 0.8 } });
        gsap.from(map.querySelector('.uzmap__halo'), { scale: 0, opacity: 0, transformOrigin: '50% 50%', duration: 0.8, ease: 'power2.out',
          scrollTrigger: { trigger: map, start: 'center 65%' } });
      }

      /* Ценности: цифры переворачиваются по оси X */
      $('[data-flip] > li').forEach((li, i) => {
        gsap.from(li, { rotateX: desk ? -85 : 0, y: desk ? 0 : 30, opacity: 0, duration: 0.8, delay: (i % 3) * 0.08, ease: 'power3.out',
          scrollTrigger: { trigger: li, start: 'top 88%' } });
      });

      /* Списки и карточки новостей: спокойное появление */
      $('[data-rise] > li, [data-rise] > div, .ncard, .doc, .ps__list li, .apt__types div, .rows > *').forEach((el) => {
        gsap.from(el, { y: 28, opacity: 0, duration: 0.6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
      });

      /* Этапы: золотая линия тянется, точки зажигаются по очереди */
      const steps = d.querySelector('[data-steps]');
      if (steps) {
        const dots = $('.steps__list li', steps);
        const stl = gsap.timeline({ scrollTrigger: { trigger: steps, start: 'top 75%', end: 'center 45%', scrub: 0.6 } });
        stl.fromTo('[data-steps-line]', { scaleX: 0 }, { scaleX: 1, ease: 'none', duration: 1 }, 0);
        dots.forEach((li, i) => stl.from(li, desk ? { opacity: 0, rotateY: -70, z: -80, y: 10, duration: 0.18 } : { opacity: 0, y: 16, duration: 0.18 }, i * 0.16));
        gsap.fromTo($('.steps__bg .plan', steps), { xPercent: 8, rotateY: -18 }, { xPercent: -4, rotateY: 0, ease: 'none',
          scrollTrigger: { trigger: steps, start: 'top bottom', end: 'bottom top', scrub: true } });
      }

      /* Параллакс фото с косым срезом */
      $('[data-parallax]').forEach((fig) => {
        const img = fig.querySelector('img'); if (!img) return;
        gsap.fromTo(img, { yPercent: -8, scale: 1.16 }, { yPercent: 8, scale: 1.16, ease: 'none',
          scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
      $('[data-pop]').forEach((el) => gsap.from(el, { y: 60, rotateX: desk ? -40 : 0, opacity: 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 92%' } }));

      /* Обложки внутренних страниц */
      const ph = d.querySelector('[data-phero]');
      if (ph && desk) {
        gsap.to(ph.querySelector('.phero__media'), { rotateX: 18, scale: 0.9, yPercent: 6, transformOrigin: '50% 100%', ease: 'none',
          scrollTrigger: { trigger: ph, start: 'top top', end: 'bottom top', scrub: true } });
      }

      return () => root.classList.remove('has-3d');
    });

    window.addEventListener('load', () => ScrollTrigger.refresh());
  };

  if (window.gsap) start();
  else window.addEventListener('DOMContentLoaded', start);
})();
