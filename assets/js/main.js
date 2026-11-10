/* «Аура» — общий скрипт: время суток на главной, живые стеклянные плашки, меню, форма */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const lite = () => document.documentElement.classList.contains('lite');
  const slowNet = () => { const c = navigator.connection; return !!c && (c.saveData || (c.downlink && c.downlink < 4) || /2g|3g/.test(c.effectiveType || '')); };   // слабое устройство, экономия трафика или низкий заряд

  /* ── 1. Главная: свет за окном по времени суток ─────────────── */
  const media = $('#heroMedia');
  if (media) {
    const layers = Object.fromEntries($$('.tod', media).map(img => [img.dataset.tod, img]));
    const ORDER = ['night', 'morning', 'day', 'evening'];          // порядок слоёв в DOM
    const KEYS = [[0, 'night'], [5, 'night'], [6.5, 'morning'], [10, 'morning'], [11.5, 'day'],
                  [16.5, 'day'], [18, 'evening'], [20.5, 'evening'], [22, 'night'], [24, 'night']];
    const LUX = { night: 0, morning: .7, day: 1, evening: .4 };
    const ORB = { night: '#a9b8ff', morning: '#ffcf8f', day: '#fff0c4', evening: '#ff9f6e' };
    const NAME = { night: 'ночь', morning: 'утро', day: 'день', evening: 'вечер' };
    const ease = t => t * t * (3 - 2 * t);
    const mixAt = hour => {
      hour = ((hour % 24) + 24) % 24;
      let i = 0;
      while (i < KEYS.length - 2 && hour >= KEYS[i + 1][0]) i++;
      const [h0, a] = KEYS[i], [h1, b] = KEYS[i + 1];
      return { a, b, t: a === b ? 0 : ease((hour - h0) / (h1 - h0)) };
    };
    // телефон (вертикальный экран): вместо 4 фото — 17 кадров из видео дня (5:00 → 22:00) и само видео
    const VMODE = $('#hero').classList.contains('vmode');
    // компьютер (горизонтальный экран): 24 кадра из видео полных суток — по кадру на каждый час, и само видео
    const HMODE = $('#hero').classList.contains('hmode'), FMODE = VMODE || HMODE;
    // 15 декабря — 14 января: новогодняя заставка (класс ставит скрипт в разметке главной)
    const NY = FMODE && $('#hero').classList.contains('ny');
    const vImgs = $$('.tod-v', media), vid = $('#todVideo');
    const small = innerWidth * (devicePixelRatio || 1) <= (HMODE ? 1600 : 760);
    const idxAt = h => { h = ((h % 24) + 24) % 24; if (HMODE) return Math.floor(h); return (h < 5 || h >= 22) ? 16 : Math.round((h - 5) / 17 * 16); };
    // чёткие кадры в AVIF (компьютер 4K, телефон 1440×2560); браузер без AVIF (метку ставит скрипт в разметке) получает WebP
    const avif = () => FMODE && !NY && !small && !document.documentElement.dataset.noavif;
    const frameUrl = ix => `/assets/img/home/${HMODE ? 'h' : 'v'}${NY ? '-ny' : ''}/d${String(ix).padStart(2, '0')}${small ? '-m' : ''}.${avif() ? 'avif' : 'webp'}?v=8`;
    let vFront = 0;
    const setFrame = ix => {                      // мягкая смена кадра: новый грузится под старым и проявляется
      if (+vImgs[vFront].dataset.ix === ix) return;
      const next = vImgs[1 - vFront];
      next.onload = () => { next.style.opacity = 1; vImgs[vFront].style.opacity = 0; vFront = 1 - vFront; };
      next.onerror = () => { if (!avif()) return; document.documentElement.dataset.noavif = 1; next.src = frameUrl(ix); };
      next.dataset.ix = ix; next.src = frameUrl(ix);
    };
    const paint = hour => {
      const { a, b, t } = mixAt(hour);
      if (FMODE) {
        root.style.setProperty('--lux', (LUX[a] + (LUX[b] - LUX[a]) * t).toFixed(3));
        root.style.setProperty('--orb', t < .5 ? ORB[a] : ORB[b]);
        $('#dtPhase').textContent = NAME[t < .5 ? a : b];
        if (!playing) setFrame(idxAt(hour));
        return;
      }
      ORDER.forEach(k => { layers[k].style.opacity = 0; });
      if (a === b || t <= 0) layers[a].style.opacity = 1;
      else if (ORDER.indexOf(b) > ORDER.indexOf(a)) { layers[a].style.opacity = 1; layers[b].style.opacity = t; }
      else { layers[b].style.opacity = 1; layers[a].style.opacity = 1 - t; }
      root.style.setProperty('--lux', (LUX[a] + (LUX[b] - LUX[a]) * t).toFixed(3));
      root.style.setProperty('--orb', t < .5 ? ORB[a] : ORB[b]);
      $('#dtPhase').textContent = NAME[t < .5 ? a : b];
    };
    const fmt = h => { h = ((h % 24) + 24) % 24; const H = Math.floor(h), M = Math.floor((h - H) * 60); return String(H).padStart(2, '0') + ':' + String(M).padStart(2, '0'); };
    const nowHour = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600; };
    const loadLayer = img => new Promise(res => {
      if (!img.dataset.src) return res();
      img.onload = img.onerror = () => res();
      img.srcset = img.dataset.srcset; img.src = img.dataset.src; delete img.dataset.src;
    });

    var playing = false;
    const tick = () => { if (!playing) { const h = nowHour(); paint(h); $('#dtTime').textContent = fmt(h); } };
    const m0 = mixAt(nowHour());
    if (FMODE) { tick(); requestAnimationFrame(() => document.body.classList.add('is-ready')); }
    else Promise.all([loadLayer(layers[m0.a]), loadLayer(layers[m0.b])]).then(() => {
      tick();
      requestAnimationFrame(() => document.body.classList.add('is-ready'));
      const rest = () => Promise.all(ORDER.map(k => loadLayer(layers[k])));
      'requestIdleCallback' in window ? requestIdleCallback(rest, { timeout: 2500 }) : setTimeout(rest, 1200);
    });
    setInterval(tick, 20000);



    // сутки за 10 секунд — по нажатию на часы
    const dt = $('#daytime');
    dt.addEventListener('click', async () => {
      if (playing || reduced) return;
      playing = true; dt.classList.add('playing');
      if (VMODE || NY) {                            // телефон и новогодняя заставка: видео дня 5:00 → 22:00, часы бегут вместе с ним
        if (!vid.src) vid.src = `/assets/video/day-${VMODE ? 'v' : 'h'}${NY ? '-ny' : ''}${(small || slowNet()) ? '-m' : ''}.mp4?v=8`;
        vid.currentTime = 0;
        const sync = () => { if (!playing) return; const h = 5 + 17 * (vid.currentTime / (vid.duration || 8));
          $('#dtTime').textContent = fmt(h); requestAnimationFrame(sync); };
        const done = () => { vid.classList.remove('on'); playing = false; dt.classList.remove('playing'); tick(); };
        vid.onended = done;
        try { await vid.play(); vid.classList.add('on'); requestAnimationFrame(sync); } catch (e) { done(); }
        return;
      }
      if (HMODE) {                                  // компьютер: сутки по кругу с текущего часа (кадр 0 видео ≈ 5:00)
        if (!vid.src) { vid.src = (small || slowNet()) ? '/assets/video/day-h-m.mp4?v=8' : innerWidth * (devicePixelRatio || 1) > 2000 ? '/assets/video/day-h-hq.mp4?v=8' : '/assets/video/day-h.mp4?v=8'; vid.preload = 'auto'; vid.load(); }
        const at = h => (((h - 5) % 24) + 24) % 24 / 24;
        const start = at(nowHour());
        let lap = 0;
        const done = () => { vid.classList.remove('on'); playing = false; dt.classList.remove('playing'); vid.onended = null; tick(); };
        const sync = () => {
          if (!playing) return;
          const d = vid.duration || 9, p = vid.currentTime / d;
          if (lap && p >= start) { vid.pause(); done(); return; }
          $('#dtTime').textContent = fmt(5 + 24 * p);
          requestAnimationFrame(sync);
        };
        vid.onended = () => { lap = 1; vid.currentTime = 0; vid.play().catch(done); if (start < .01) done(); };
        try {
          if (vid.readyState < 1) await new Promise((r, j) => { vid.addEventListener('loadedmetadata', r, { once: true }); vid.addEventListener('error', j, { once: true }); setTimeout(j, 15000); });
          vid.currentTime = start * vid.duration;
          await vid.play(); vid.classList.add('on'); requestAnimationFrame(sync);
        } catch (e) { done(); }
        return;
      }
      await Promise.all(ORDER.map(k => loadLayer(layers[k])));
      const from = nowHour(), dur = 10000, t0 = performance.now();
      const step = now => {
        const p = Math.min(1, (now - t0) / dur), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        const h = from + 24 * e; paint(h); $('#dtTime').textContent = fmt(h);
        if (p < 1) requestAnimationFrame(step); else { playing = false; dt.classList.remove('playing'); tick(); }
      };
      requestAnimationFrame(step);
    });
    dt.addEventListener('mouseenter', () => $('#tlHint').classList.add('show'));
    dt.addEventListener('mouseleave', () => $('#tlHint').classList.remove('show'));

    // плашки на первом экране покачиваются (только компьютер)
    const heroCards = $$('.hero .card');
    heroCards.forEach((c, i) => c.style.setProperty('--fd', (-i * 2.2) + 's'));
    setTimeout(() => { if (fine && !reduced) heroCards.forEach(c => c.classList.add('floating')); }, 2700);
  } else {
    // внутренние страницы: просто часы
    const clock = $('#dtTime');
    const tickClock = () => { const d = new Date(); clock.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
    if (clock) { tickClock(); setInterval(tickClock, 20000); }
    document.body.classList.add('is-ready');
  }

  // температура воздуха в Казани (на всех страницах) — наш сервер берёт её у метеосервиса и кеширует
  const tEl = $('#dtTemp');
  const showTemp = () => fetch('https://auraint.auraint-site.workers.dev/weather.php').then(r => r.json()).then(j => {
    if (!j.ok) return;
    tEl.textContent = (j.t > 0 ? '+' : j.t < 0 ? '−' : '') + Math.abs(j.t) + '\u00a0°C';
    tEl.title = 'Сейчас в Казани'; tEl.hidden = false;
  }).catch(() => {});
  if (tEl) { showTemp(); setInterval(showTemp, 20 * 60 * 1000); }

  /* ── 1б. Второй экран: таймлапс ремонта — играет, когда экран в кадре ── */
  const reno = $('#reno'), rvid = $('#renoVideo');
  if (reno && rvid) {
    const vert = matchMedia('(max-aspect-ratio: 4/5)').matches, d = rvid.dataset;
    // слабое устройство, медленная сеть или «меньше движения» в системе — облегчённый ролик, но играет всегда
    const small = slowNet() || lite() || reduced || innerWidth * (devicePixelRatio || 1) <= (vert ? 1100 : 1400);
    const src = vert ? (small ? d.srcVm : d.srcV) : small ? d.srcM : innerWidth * (devicePixelRatio || 1) > 2000 && d.srcHq ? d.srcHq : d.src;   // ретина и большие мониторы — 1440p
    const ps = $('.reno-poster', reno);
    // без ролика (экономия, нельзя запустить видео) — сразу готовый интерьер и текст
    const still = () => {
      rvid.removeAttribute('src'); rvid.preload = 'none';
      if (ps) { ps.closest('picture')?.querySelectorAll('source').forEach(x => x.remove()); ps.src = vert ? d.finalV : d.final; }
      reno.classList.remove('playing'); reno.classList.add('done'); reno.style.setProperty('--p', 1);
      // ролик не запускаем сам, но даём посмотреть по кнопке
      const btn = $('#renoReplay'); btn.textContent = 'Смотреть ролик';
      btn.onclick = () => {
        rvid.src = src; rvid.preload = 'auto';
        rvid.addEventListener('playing', () => reno.classList.add('playing'), { once: true });
        rvid.addEventListener('ended', () => setTimeout(() => reno.classList.remove('playing'), 1200), { once: true });
        rvid.play().catch(() => { rvid.controls = true; });
      };
    };
    {
      reno.classList.add('auto');
      let loaded = false, fallback = 0;
      const load = () => { if (loaded) return; loaded = true; rvid.preload = 'auto'; rvid.src = src; };
      // убираем постер, только когда браузер уже отрисовал кадр видео
      const shown = () => reno.classList.add('playing');
      rvid.addEventListener('playing', () => {
        clearTimeout(fallback); fallback = setTimeout(finish, (rvid.duration || 12) * 1000 + 3000);   // страховка, если «ended» не придёт
        if (rvid.requestVideoFrameCallback) rvid.requestVideoFrameCallback(() => requestAnimationFrame(shown));
        else setTimeout(shown, 150);
      });
      const finish = () => { reno.classList.add('done'); reno.style.setProperty('--p', 1); };
      const play = () => {
        load(); rvid.play().catch(still);               // браузер запретил автозапуск (энергосбережение) — готовый интерьер и кнопка «Смотреть ролик»
      };
      new IntersectionObserver(es => es.forEach(en => {
        if (en.isIntersecting) { reno.classList.add('in'); if (!rvid.ended) play(); }
        else rvid.pause();
      }), { threshold: .55 }).observe(reno);
      // заранее подгружаем ролик, когда посетитель начал листать
      const pre = () => { if (scrollY > innerHeight * .05) { load(); removeEventListener('scroll', pre); } };
      addEventListener('scroll', pre, { passive: true });
      rvid.addEventListener('timeupdate', () => {
        const p = rvid.currentTime / (rvid.duration || 1);
        reno.style.setProperty('--p', p.toFixed(3));
      });
      rvid.addEventListener('ended', () => setTimeout(finish, 1200));   // секунда, чтобы рассмотреть готовую комнату
      $('#renoReplay').addEventListener('click', () => { reno.classList.remove('done'); rvid.currentTime = 0; play(); });
    }
  }


  /* ── 1г. Видео с объекта: играет без звука, когда в кадре; звук — по кнопке ── */
  $$('.pvid').forEach(box => {
    const v = $('video', box), snd = $('.pvid-snd', box);
    const src = (slowNet() || innerWidth * (devicePixelRatio || 1) <= 1400 ? v.dataset.srcM : v.dataset.src);
    const load = () => { if (!v.src) { v.src = src; v.preload = 'auto'; } };
    if (reduced || lite()) { v.controls = true; v.preload = 'none'; v.src = src; snd.hidden = true; return; }
    new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { load(); v.play().catch(() => { v.controls = true; }); } else v.pause(); }), { threshold: .35 }).observe(box);
    snd.addEventListener('click', () => { v.muted = !v.muted; snd.setAttribute('aria-pressed', String(!v.muted)); snd.textContent = v.muted ? 'Включить звук' : 'Выключить звук'; if (v.paused) v.play().catch(() => {}); });
  });

  /* ── 1в. Карта на «Контактах» — подгружаем только по нажатию ── */
  $$('.map-lazy').forEach(m => $('.map-btn', m).addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = m.dataset.src; f.title = 'Офис «Аура» на Яндекс Картах'; f.allowFullscreen = true;
    $('.map-ph', m).replaceWith(f);
  }, { once: true }));

  /* ── 2. Живые стеклянные плашки на всех страницах ──────────────
     Поворачиваются за курсором, по стеклу бежит блик. Форма — едва заметно. */
  if (fine && !reduced) {
    $$('.live').forEach(c => {
      const amp = c.classList.contains('soft') ? .25 : 1;
      let raf = 0;
      c.addEventListener('pointerenter', () => c.classList.add('hot'));
      c.addEventListener('pointermove', e => {
        if (c.matches(':focus-within') && amp < 1) return;
        const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          c.style.transform = `perspective(900px) rotateX(${(.5 - y) * 12 * amp}deg) rotateY(${(x - .5) * 14 * amp}deg) translateZ(${12 * amp}px)`;
        });
      });
      c.addEventListener('pointerleave', () => { cancelAnimationFrame(raf); c.classList.remove('hot'); c.style.transform = ''; });
    });
    $$('.glass').forEach(g => g.addEventListener('pointermove', e => {
      const r = g.getBoundingClientRect();
      g.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      g.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }));
  }

  /* ── 3. Появление блоков при прокрутке ───────────────────────── */
  const rv = $$('.reveal:not(.phero .reveal)');
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }),
      { rootMargin: '0px 0px -8% 0px' });
    rv.forEach(el => io.observe(el));
  } else rv.forEach(el => el.classList.add('in'));

  /* ── 4. Меню и шапка ─────────────────────────────────────────── */
  const burger = $('#burger');
  burger.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', open);
  });
  $$('#menuSheet a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('menu-open')));
  // затемнение фона при прокрутке: один раз за кадр и только прозрачность отдельного слоя
  let dim = null, lastSv = -1, lastScrolled = null, ticking = false;
  if ($('.page-veil')) { dim = document.createElement('div'); dim.className = 'page-dim'; dim.setAttribute('aria-hidden', 'true'); $('.page-veil').after(dim); }
  const phone = matchMedia('(max-width:640px)'), inner = document.body.classList.contains('page-inner');
  let lastY = scrollY, idle = 0;
  const update = () => {
    ticking = false;
    const y = scrollY, h = innerHeight;
    if (phone.matches) {                               // кнопки связи не закрывают текст, пока человек читает
      if (y > lastY + 6 && y > h * .6) document.body.classList.add('dock-away');
      else if (y < lastY - 6) document.body.classList.remove('dock-away');
      clearTimeout(idle); idle = setTimeout(() => document.body.classList.remove('dock-away'), 1200);
    }
    lastY = y;
    const sc = y > (inner ? 8 : h * .35);           // на внутренних страницах подложка под шапкой — сразу, чтобы шапка не ложилась на текст
    if (sc !== lastScrolled) { document.body.classList.toggle('scrolled', sc); lastScrolled = sc; }
    if (dim) {
      const sv = Math.round(Math.min(1, y / (h * .9)) * 50) / 50;
      if (sv !== lastSv) { dim.style.opacity = (sv * .45).toFixed(3); lastSv = sv; }
    }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true }); update();
  // переход по ссылке с якорем (например, /kontakty/#zayavka) — докручиваем после загрузки картинок
  if (location.hash) addEventListener('load', () => { const t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(() => t.scrollIntoView({ behavior: 'instant', block: 'start' }), 120); });

  /* ── 5. Форма заявки ─────────────────────────────────────────── */
  const form = $('#leadForm');
  // /kontakty/?usluga=elektrika — сразу отмечаем нужную услугу
  const pre = new URLSearchParams(location.search).get('usluga');
  if (form && pre) $$('input[name="usluga"]', form).forEach(i => { if (i.value === pre) i.checked = true; });
  if (form) {
    // на телефоне при вводе прячем кнопки связи, чтобы не закрывали поля над клавиатурой
    form.addEventListener('focusin', e => { if (e.target.matches('input:not([type=checkbox]):not([type=radio]),textarea')) document.body.classList.add('typing'); });
    form.addEventListener('focusout', () => setTimeout(() => { if (!form.contains(document.activeElement)) document.body.classList.remove('typing'); }, 50));
    // «Ещё N направлений»
    const more = $('.chips-more', form), box = more && more.closest('.chips');
    if (box && $$('label.x input:checked', box).length) box.classList.remove('collapsed');
    if (more) more.addEventListener('click', () => { box.classList.remove('collapsed'); more.remove(); });
    const cons = $('input[name="consent"]', form);
    if (cons) cons.addEventListener('change', () => cons.closest('.consent').classList.remove('err'));
    // телефон: +7 и формат номера по мере ввода
    const tel = $('input[name="phone"]', form);
    tel.addEventListener('focus', () => { if (!tel.value) tel.value = '+7 '; });
    tel.addEventListener('blur', () => { if (tel.value.replace(/\D/g, '').length <= 1) tel.value = ''; });
    tel.addEventListener('input', e => {
      if (e.inputType && e.inputType.startsWith('delete')) return;     // стирать можно свободно
      let d = tel.value.replace(/\D/g, '');
      if (d[0] === '7' || d[0] === '8') d = d.slice(1);                 // код страны (+7 или 8)
      if (d.length > 10 && (d[0] === '7' || d[0] === '8')) d = d.slice(1); // набрали «8…» поверх «+7»
      d = d.slice(0, 10);
      const p = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)];
      tel.value = '+7' + (p[0] ? ' (' + p[0] : '') + (p[0].length === 3 && p[1] ? ') ' + p[1] : '') + (p[2] ? '-' + p[2] : '') + (p[3] ? '-' + p[3] : '');
    });
  }
  if (form) form.addEventListener('submit', async e => {
    e.preventDefault();
    let ok = true;
    $$('[required]', form).forEach(i => { const bad = !i.value.trim(); i.closest('.field').classList.toggle('err', bad); if (bad) ok = false; });
    // согласие на обработку данных — отдельной галочкой (152-ФЗ), без неё не отправляем
    const cons = $('input[name="consent"]', form);
    if (cons) { cons.closest('.consent').classList.toggle('err', !cons.checked); if (!cons.checked) ok = false; }
    if (!ok) return;
    const fd = new FormData(form);
    const labels = $$('input[name="usluga"]:checked', form).map(i => i.nextElementSibling.textContent);
    fd.set('uslugi', labels.join(', ')); fd.set('page', location.href);
    // готовый текст заявки для WhatsApp — клиент может продублировать её в мессенджер
    const wa = ['Здравствуйте! Заявка с сайта «Аура».', 'Имя: ' + fd.get('name'), 'Телефон: ' + fd.get('phone'),
      labels.length ? 'Нужно: ' + labels.join(', ') : '', 'Объект: ' + fd.get('type'), fd.get('msg') ? 'Комментарий: ' + fd.get('msg') : '']
      .filter(Boolean).join('\n');
    $$('.form-wa', form).forEach(a => a.href = a.href.split('?')[0] + '?text=' + encodeURIComponent(wa));
    const btn = $('button[type="submit"]', form), err = $('.form-err', form);
    btn.disabled = true; btn.textContent = 'Отправляем…'; err.hidden = true;
    try {
      const r = await fetch('https://auraint.auraint-site.workers.dev/lead.php', { method: 'POST', body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || `Не получилось отправить (код ${r.status})`);
      $$('.field,.chips,.form-foot', form).forEach(el => el.hidden = true);
      $('.form-done', form).hidden = false;
      document.body.classList.remove('typing');
      $('.form-done', form).scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (x) {
      err.innerHTML = `${x.message}. Напишите нам в <a class="form-wa" href="${$('.form-wa', form).href}" target="_blank" rel="noopener">WhatsApp</a> — текст заявки уже готов — или позвоните: <a href="tel:+79686288888">+7 968 628-88-88</a>.`;
      err.hidden = false;
      btn.disabled = false; btn.textContent = 'Отправить заявку';
    }
  });

  /* ── 6. Защита фото и текстов от копирования ───────────────────
     Полностью запретить копирование в браузере невозможно — это заметно усложняет его обычному посетителю. */
  const MEDIA = 'img,video,picture,.page-bg,.hero-media,.reno,.gal,.pcard-img,.acard-img,.lb';
  const FREE = 'input,textarea,[contenteditable],.cinfo,.f-copy,.f-col,.quick-mail,.map-addr,.order-tel,a[href^="tel:"],a[href^="mailto:"]';
  addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest(MEDIA)) e.preventDefault(); });
  addEventListener('dragstart', e => { if (e.target.closest && e.target.closest('img,video,a')) e.preventDefault(); });
  addEventListener('keydown', e => {                       // «сохранить страницу» и «исходный код»
    if ((e.ctrlKey || e.metaKey) && ['s', 'u'].includes(e.key.toLowerCase())) e.preventDefault();
  });
  addEventListener('copy', e => {
    const sel = getSelection(), text = sel ? sel.toString() : '';
    const node = sel && sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
    if (!text || (node && node.closest(FREE))) return;      // телефон, почту, реквизиты — копировать можно
    e.preventDefault();
    e.clipboardData.setData('text/plain', (text.length > 90 ? text.slice(0, 90) + '…' : text) +
      '\n\nИсточник: ' + location.href + '\n© «Аура». Копирование материалов без письменного согласия запрещено.');
  });
  // галерея: фото открывается поверх страницы, а не отдельным файлом
  const gals = $$('.gal-i');
  if (gals.length) {
    const lb = document.createElement('div'); lb.className = 'lb'; lb.hidden = true;
    lb.innerHTML = '<button class="lb-x" type="button" aria-label="Закрыть">×</button><img alt="">';
    document.body.append(lb);
    const lbImg = $('img', lb), close = () => { lb.hidden = true; lbImg.removeAttribute('src'); };
    gals.forEach(a => { const full = a.getAttribute('href'); a.dataset.full = full; a.removeAttribute('href'); a.removeAttribute('target');
      a.setAttribute('role', 'button'); a.tabIndex = 0;
      a.addEventListener('click', () => { lbImg.src = a.dataset.full; lbImg.alt = $('img', a).alt; lb.hidden = false; }); });
    lb.addEventListener('click', e => { if (e.target !== lbImg) close(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) close(); });
  }
})();
