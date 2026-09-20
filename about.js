/* =========================================================
   About | Desktop environment (vanilla JS, optional GSAP)
   ========================================================= */
(() => {
  'use strict';

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const windowsLayer = $('#windows');
  const taskItems    = $('#taskItems');
  const startBtn     = $('#startBtn');
  const startMenu    = $('#startMenu');
  const startList    = $('#startList');
  const clockTime    = $('#clockTime');
  const clockDate    = $('#clockDate');

  const mobileMQ = window.matchMedia('(max-width: 700px)');
  const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isMobile = () => mobileMQ.matches;
  const canAnimate = () => typeof window.gsap !== 'undefined' && !reduceMQ.matches;

  const ICONS = {
    min:   '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 6h8"/></svg>',
    max:   '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="2" width="8" height="8"/></svg>',
    restore:'<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="4" width="6" height="6"/><path d="M4 4V2h6v6H8"/></svg>',
    close: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 2l8 8M10 2l-8 8"/></svg>'
  };

  /* -------------------------------------------------------
     App registry, built from the desktop icons
     ------------------------------------------------------- */
  const apps = {};
  $$('.d-icon[data-app]').forEach((btn) => {
    apps[btn.dataset.app] = {
      id: btn.dataset.app,
      title: btn.dataset.title,
      iconSVG: $('svg', btn).outerHTML,
      button: btn
    };
  });

  /* -------------------------------------------------------
     Wallpaper: seeded low-poly facets on a canvas
     ------------------------------------------------------- */
  const canvas = $('#wallpaper');
  const ctx = canvas.getContext('2d');

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function paintWallpaper() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const rnd = mulberry32(1337);
    const size = w < 700 ? 84 : 128;
    const cols = Math.ceil(w / size) + 2;
    const rows = Math.ceil(h / size) + 2;

    // jittered grid of vertices
    const pts = [];
    for (let j = 0; j <= rows; j++) {
      pts[j] = [];
      for (let i = 0; i <= cols; i++) {
        pts[j][i] = {
          x: (i - 1) * size + (rnd() - 0.5) * size * 0.75,
          y: (j - 1) * size + (rnd() - 0.5) * size * 0.75
        };
      }
    }

    ctx.fillStyle = '#05080b';
    ctx.fillRect(0, 0, w, h);

    const shade = (cx, cy) => {
      const t = Math.min(1, Math.max(0, (cx / w) * 0.55 + (1 - cy / h) * 0.45));
      let light = 4.5 + t * 9 + (rnd() - 0.5) * 4.5 + Math.sin(cx * 0.013 + cy * 0.021) * 1.6;
      let hue = 214 - t * 22;
      let sat = 38 + t * 10;
      if (rnd() < 0.045) { light += 6; hue = 200; sat = 55; }   // occasional bright facet
      return `hsl(${hue} ${sat}% ${light}%)`;
    };

    const tri = (a, b, c) => {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y);
      ctx.closePath();
      ctx.fillStyle = shade((a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(47,168,255,0.05)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    };

    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const p00 = pts[j][i], p10 = pts[j][i + 1];
        const p01 = pts[j + 1][i], p11 = pts[j + 1][i + 1];
        if ((i + j) % 2 === 0) { tri(p00, p10, p01); tri(p10, p11, p01); }
        else                   { tri(p00, p10, p11); tri(p00, p11, p01); }
      }
    }
  }

  /* -------------------------------------------------------
     Window manager
     ------------------------------------------------------- */
  const wins = new Map();   // id -> { el, task, app }
  let zTop = 10;
  let cascade = 0;
  let activeId = null;

  function taskbarHeight() { return $('#taskbar').offsetHeight; }

  function createWindow(app) {
    const el = document.createElement('section');
    el.className = 'win';
    el.dataset.app = app.id;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', app.title);
    el.innerHTML = `
      <header class="win-bar">
        <span class="win-ico">${app.iconSVG}</span>
        <span class="win-title">${app.title}</span>
        <div class="win-ctrls">
          <button class="wc wc-min" type="button" aria-label="Minimize ${app.title}">${ICONS.min}</button>
          <button class="wc wc-max" type="button" aria-label="Maximize ${app.title}">${ICONS.max}</button>
          <button class="wc wc-close" type="button" aria-label="Close ${app.title}">${ICONS.close}</button>
        </div>
      </header>
      <div class="win-body"></div>`;

    const tpl = $('#tpl-' + app.id);
    if (tpl) $('.win-body', el).appendChild(tpl.content.cloneNode(true));

    windowsLayer.appendChild(el);

    // taskbar item
    const task = document.createElement('button');
    task.className = 'task';
    task.type = 'button';
    task.innerHTML = `${app.iconSVG}<span>${app.title}</span>`;
    task.setAttribute('aria-label', app.title);
    task.addEventListener('click', () => onTaskClick(app.id));
    taskItems.appendChild(task);

    const rec = { el, task, app };
    wins.set(app.id, rec);

    // initial position: centered, with a small cascade offset
    if (!isMobile()) {
      const r = el.getBoundingClientRect();
      const vw = windowsLayer.clientWidth, vh = windowsLayer.clientHeight;
      const off = (cascade++ % 5) * 28 - 56;
      el.style.left = Math.max(8, (vw - r.width) / 2 + off) + 'px';
      el.style.top  = Math.max(8, (vh - r.height) / 2 + off) + 'px';
    }

    // controls
    $('.wc-min', el).addEventListener('click', () => minimize(app.id));
    $('.wc-max', el).addEventListener('click', () => toggleMax(app.id));
    $('.wc-close', el).addEventListener('click', () => closeWindow(app.id));
    $('.win-bar', el).addEventListener('dblclick', (e) => {
      if (!e.target.closest('.wc') && !isMobile()) toggleMax(app.id);
    });
    el.addEventListener('pointerdown', () => focusWindow(app.id));
    enableDrag(rec);

    if (app.id === 'physical') markToday(el);

    focusWindow(app.id);
    if (canAnimate()) {
      gsap.fromTo(el,
        { opacity: 0, scale: 0.93, y: 14 },
        { opacity: 1, scale: 1, y: 0, duration: 0.28, ease: 'power2.out', clearProps: 'transform,opacity' });
    }
  }

  function openApp(id) {
    const app = apps[id];
    if (!app) return;
    const rec = wins.get(id);
    if (!rec) return createWindow(app);
    if (rec.el.classList.contains('is-min')) return restore(id);
    focusWindow(id);
  }

  function focusWindow(id) {
    const rec = wins.get(id);
    if (!rec) return;
    zTop += 1;
    rec.el.style.zIndex = zTop;
    activeId = id;
    wins.forEach((r, key) => {
      const on = key === id;
      r.el.classList.toggle('is-active', on);
      r.task.classList.toggle('is-active', on);
    });
  }

  function minimize(id) {
    const rec = wins.get(id);
    if (!rec || rec.el.classList.contains('is-min')) return;
    const finish = () => {
      rec.el.classList.add('is-min');
      rec.task.classList.add('is-min');
      rec.task.classList.remove('is-active');
      rec.el.classList.remove('is-active');
      if (canAnimate()) gsap.set(rec.el, { clearProps: 'transform,opacity' });
      if (activeId === id) activeId = null;
    };
    if (!canAnimate()) return finish();

    const from = rec.el.getBoundingClientRect();
    const to = rec.task.getBoundingClientRect();
    gsap.to(rec.el, {
      x: (to.left + to.width / 2) - (from.left + from.width / 2),
      y: (to.top + to.height / 2) - (from.top + from.height / 2),
      scale: 0.15, opacity: 0,
      duration: 0.3, ease: 'power2.in',
      onComplete: finish
    });
  }

  function restore(id) {
    const rec = wins.get(id);
    if (!rec) return;
    rec.el.classList.remove('is-min');
    rec.task.classList.remove('is-min');
    focusWindow(id);
    if (!canAnimate()) return;

    const to = rec.el.getBoundingClientRect();
    const from = rec.task.getBoundingClientRect();
    gsap.fromTo(rec.el,
      {
        x: (from.left + from.width / 2) - (to.left + to.width / 2),
        y: (from.top + from.height / 2) - (to.top + to.height / 2),
        scale: 0.15, opacity: 0
      },
      { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.3, ease: 'power2.out', clearProps: 'transform,opacity' });
  }

  function toggleMax(id) {
    const rec = wins.get(id);
    if (!rec || isMobile()) return;
    const on = rec.el.classList.toggle('is-max');
    const btn = $('.wc-max', rec.el);
    btn.innerHTML = on ? ICONS.restore : ICONS.max;
    btn.setAttribute('aria-label', (on ? 'Restore ' : 'Maximize ') + rec.app.title);
    focusWindow(id);
  }

  function closeWindow(id) {
    const rec = wins.get(id);
    if (!rec) return;
    const finish = () => {
      rec.el.remove();
      rec.task.remove();
      wins.delete(id);
      if (activeId === id) activeId = null;
      // hand focus to the top-most remaining visible window
      let top = null, best = -1;
      wins.forEach((r, key) => {
        const z = parseInt(r.el.style.zIndex || '0', 10);
        if (!r.el.classList.contains('is-min') && z > best) { best = z; top = key; }
      });
      if (top) focusWindow(top);
    };
    if (!canAnimate()) return finish();
    gsap.to(rec.el, { opacity: 0, scale: 0.94, y: 10, duration: 0.2, ease: 'power1.in', onComplete: finish });
  }

  function onTaskClick(id) {
    const rec = wins.get(id);
    if (!rec) return;
    if (rec.el.classList.contains('is-min')) restore(id);
    else if (activeId === id) minimize(id);
    else focusWindow(id);
  }

  /* -------------------------------------------------------
     Dragging (title bar, pointer events)
     ------------------------------------------------------- */
  function enableDrag(rec) {
    const { el } = rec;
    const bar = $('.win-bar', el);
    let startX = 0, startY = 0, baseLeft = 0, baseTop = 0, dragging = false;

    bar.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('.wc')) return;
      if (isMobile() || el.classList.contains('is-max')) return;
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      baseLeft = el.offsetLeft; baseTop = el.offsetTop;
      el.classList.add('is-dragging');
      bar.setPointerCapture(e.pointerId);
    });

    bar.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const vw = windowsLayer.clientWidth, vh = windowsLayer.clientHeight;
      let left = baseLeft + (e.clientX - startX);
      let top  = baseTop  + (e.clientY - startY);
      left = Math.min(Math.max(left, 80 - el.offsetWidth), vw - 80);   // keep part of the bar reachable
      top  = Math.min(Math.max(top, 0), vh - 40);
      el.style.left = left + 'px';
      el.style.top  = top + 'px';
    });

    const end = (e) => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('is-dragging');
      if (bar.hasPointerCapture(e.pointerId)) bar.releasePointerCapture(e.pointerId);
    };
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);
  }

  /* -------------------------------------------------------
     Desktop icons
     ------------------------------------------------------- */
  Object.values(apps).forEach((app) => {
    app.button.addEventListener('click', () => {
      $$('.d-icon.is-selected').forEach((n) => n.classList.remove('is-selected'));
      app.button.classList.add('is-selected');
      openApp(app.id);
    });
  });
  $('#desktop').addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.d-icon')) $$('.d-icon.is-selected').forEach((n) => n.classList.remove('is-selected'));
  });

  /* -------------------------------------------------------
     Start menu
     ------------------------------------------------------- */
  Object.values(apps).forEach((app) => {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button">${app.iconSVG}<span>${app.title}</span></button>`;
    $('button', li).addEventListener('click', () => { toggleStart(false); openApp(app.id); });
    startList.appendChild(li);
  });

  function toggleStart(force) {
    const open = typeof force === 'boolean' ? force : !startMenu.classList.contains('is-open');
    startMenu.classList.toggle('is-open', open);
    startMenu.setAttribute('aria-hidden', String(!open));
    startBtn.setAttribute('aria-expanded', String(open));
  }
  startBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleStart(); });
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('#startMenu') && !e.target.closest('#startBtn')) toggleStart(false);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleStart(false); });

  /* -------------------------------------------------------
     Clock
     ------------------------------------------------------- */
  function tick() {
    const now = new Date();
    clockTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    clockDate.textContent = now.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  }
  tick();
  setInterval(tick, 1000);

  /* -------------------------------------------------------
     App-specific behavior
     ------------------------------------------------------- */
  // highlight today's row in the weekly split
  function markToday(win) {
    const today = String(new Date().getDay());
    const row = $(`tr[data-day="${today}"]`, win);
    if (row) row.classList.add('today');
  }

  // simulated update progress in media_archive.exe
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-update]');
    if (!btn || btn.disabled) return;
    const card = btn.closest('.game');
    const fill = $('.bar > span', card);
    const pctEl = $('.pct', card);
    const statusEl = $('.status-text', card);
    let pct = parseFloat(card.dataset.pct) || 0;

    btn.disabled = true;
    btn.textContent = 'Updating…';
    statusEl.textContent = 'Downloading update files';

    const timer = setInterval(() => {
      // stop quietly if the window was closed mid-download
      if (!document.body.contains(card)) return clearInterval(timer);
      pct = Math.min(100, pct + 2 + Math.random() * 5);
      card.dataset.pct = pct;
      fill.style.width = pct + '%';
      pctEl.textContent = Math.floor(pct) + '%';
      if (pct >= 100) {
        clearInterval(timer);
        card.classList.add('is-done');
        statusEl.textContent = 'Up to date';
        btn.textContent = 'Installed';
      }
    }, 140);
  });

  /* -------------------------------------------------------
     Resize handling
     ------------------------------------------------------- */
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      paintWallpaper();
      // pull any window that ended up off-screen back into view
      const vw = windowsLayer.clientWidth, vh = windowsLayer.clientHeight;
      wins.forEach(({ el }) => {
        if (el.classList.contains('is-max') || isMobile()) return;
        const left = Math.min(Math.max(el.offsetLeft, 80 - el.offsetWidth), vw - 80);
        const top  = Math.min(Math.max(el.offsetTop, 0), vh - 40);
        el.style.left = left + 'px';
        el.style.top  = top + 'px';
      });
    }, 150);
  });

  /* -------------------------------------------------------
     Boot
     ------------------------------------------------------- */
  paintWallpaper();

  // greet desktop visitors with the profile window (skipped on phones, where it would cover the icons)
  if (!isMobile()) setTimeout(() => openApp('profile'), 350);
})();