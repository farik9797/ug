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
        if (desk) {
          intro.classList.add('is-3d');
          prep(lines);
          const inside = intro.querySelector('[data-inside]');
          gsap.timeline({ scrollTrigger: { trigger: intro, start: 'top top', end: '+=280%', scrub: 0.7, pin: true, anticipatePin: 1 } })
            .to('[data-hero-copy]', { opacity: 0, y: -80, duration: 0.14, ease: 'power1.in' }, 0)
            .to('[data-hero-scrim]', { opacity: 0, duration: 0.2 }, 0)
            .fromTo('[data-hero-media]', { scale: 1, rotateY: 0 }, { scale: 5.2, duration: 0.46, ease: 'power2.in' }, 0)
            .to('[data-hero-veil]', { opacity: 1, duration: 0.1, ease: 'none' }, 0.36)
            .set(inside, { visibility: 'visible' }, 0.42)
            .fromTo(inside, { opacity: 0, scale: 1.35, z: 0 }, { opacity: 1, scale: 1, duration: 0.14, ease: 'power2.out' }, 0.42)
            .to(lines, { strokeDashoffset: 0, duration: 0.22, stagger: 0.0015, ease: 'none' }, 0.5)
            .from(marks, { opacity: 0, scale: 0, transformOrigin: '50% 50%', duration: 0.06, stagger: 0.0012, ease: 'back.out(2)' }, 0.66)
            .from(pins, { opacity: 0, y: 14, duration: 0.06, stagger: 0.02 }, 0.8)
            .to({}, { duration: 0.08 });
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
      $('[data-rise] > li, .ncard, .doc, .ps__list li, .apt__types div, .rows > *').forEach((el) => {
        gsap.from(el, { y: 28, opacity: 0, duration: 0.6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
      });

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
