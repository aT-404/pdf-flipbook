/*
 * Standalone viewer that lives INSIDE an exported flipbook HTML file.
 * It needs no internet and no app. Everything it uses (the PDF, PDF.js and
 * the page-turn library) is stored in the same file.
 *
 * Keep this in sync with src/components/flipbook/* (the in-app viewer).
 */
(function () {
  'use strict';

  var MARK = 'https://flipbook.invalid/'; // fake address for files stored inside this page
  var KEEP_BEHIND = 2;
  var KEEP_AHEAD = 4;
  var MIN_ZOOM = 0.5;
  var MAX_ZOOM = 3;
  var ZOOM_STEP = 0.25;

  var ICONS = {
    grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    zoomIn: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/>',
    zoomOut: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M8 11h6"/>',
    reset: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    book: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
    full: '<path d="M15 3h6v6"/><path d="m21 3-7 7"/><path d="m3 21 7-7"/><path d="M9 21H3v-6"/>',
    unfull: '<path d="m14 10 7-7"/><path d="M20 10h-6V4"/><path d="m3 21 7-7"/><path d="M4 14h6v6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    volume: '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/>',
    download: '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
  };

  function icon(name, size) {
    var s = size || 16;
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      ICONS[name] + '</svg>'
    );
  }

  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html != null) node.innerHTML = html;
    return node;
  }

  // ---------------------------------------------------------------- data
  var config = JSON.parse(document.getElementById('fb-config').textContent);

  /** Reads a base64 block stored in the page, then frees it. Works for very big strings. */
  function readBase64(id) {
    var node = document.getElementById(id);
    if (!node) return new Uint8Array(0);
    var text = node.textContent.trim();
    node.textContent = '';
    var chunk = 4 * 262144; // characters per step (multiple of 4)
    var size = Math.floor((text.length * 3) / 4) - (text.endsWith('==') ? 2 : text.endsWith('=') ? 1 : 0);
    var out = new Uint8Array(size);
    var pos = 0;
    for (var i = 0; i < text.length; i += chunk) {
      var bin = atob(text.slice(i, i + chunk));
      for (var j = 0; j < bin.length; j++) out[pos++] = bin.charCodeAt(j);
    }
    return out;
  }

  function b64ToBytes(b64) {
    var bin = atob(b64);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  // PDF.js asks for helper files (image decoders). Serve them from inside this page.
  function installEmbeddedFetch(files) {
    var original = window.fetch ? window.fetch.bind(window) : null;
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var at = url.indexOf(MARK);
      if (at >= 0) {
        var b64 = files[url.slice(at + MARK.length)];
        return Promise.resolve(
          b64 ? new Response(b64ToBytes(b64), { status: 200 }) : new Response(null, { status: 404 })
        );
      }
      return original ? original(input, init) : Promise.reject(new Error('fetch unavailable'));
    };
  }

  // The same trick, but inside PDF.js's background worker
  function workerPatch(mark, files) {
    var original = self.fetch.bind(self);
    self.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var at = url.indexOf(mark);
      if (at >= 0) {
        var b64 = files[url.slice(at + mark.length)];
        if (!b64) return Promise.resolve(new Response(null, { status: 404 }));
        var bin = atob(b64);
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return Promise.resolve(new Response(bytes, { status: 200 }));
      }
      return original(input, init);
    };
  }


  // ---------------------------------------------------------------- page-turn sound
  // An ultra-subtle, smooth paper whisper synthesized with Web Audio API.
  var audioContext = null;
  var noiseBuffer = null;
  var lastPlayed = 0;
  function playFlipSound() {
    var now = performance.now();
    if (now - lastPlayed < 300) return;
    lastPlayed = now;
    try {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      if (!audioContext) audioContext = new Ctor();
      if (audioContext.state === 'suspended') audioContext.resume();
      if (!noiseBuffer) {
        noiseBuffer = audioContext.createBuffer(1, Math.floor(audioContext.sampleRate * 0.3), audioContext.sampleRate);
        var data = noiseBuffer.getChannelData(0);
        for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      var t = audioContext.currentTime;

      // 1) Featherlight paper slide (smooth whisper)
      var source = audioContext.createBufferSource();
      source.buffer = noiseBuffer;
      var band = audioContext.createBiquadFilter();
      band.type = 'bandpass';
      band.Q.value = 0.7;
      band.frequency.setValueAtTime(1800, t);
      band.frequency.exponentialRampToValueAtTime(2400, t + 0.14);
      var gain = audioContext.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.022, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      source.connect(band); band.connect(gain); gain.connect(audioContext.destination);
      source.start(t, Math.random() * 0.1);
      source.stop(t + 0.2);

      // 2) Faint low-mid cushion for natural paper body
      var cushion = audioContext.createBufferSource();
      cushion.buffer = noiseBuffer;
      var low = audioContext.createBiquadFilter();
      low.type = 'lowpass';
      low.frequency.value = 1000;
      var cushionGain = audioContext.createGain();
      cushionGain.gain.setValueAtTime(0.0001, t + 0.02);
      cushionGain.gain.linearRampToValueAtTime(0.008, t + 0.06);
      cushionGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      cushion.connect(low); cushion.connect(cushionGain); cushionGain.connect(audioContext.destination);
      cushion.start(t + 0.02, Math.random() * 0.1);
      cushion.stop(t + 0.18);
    } catch (e) { /* sound is optional */ }
  }

  // ---------------------------------------------------------------- page drawing
  function renderPageToCanvas(pdf, pageNumber, targetWidth) {
    var cancelled = false;
    var cancelRender = null;
    var promise = (async function () {
      var page = await pdf.getPage(pageNumber);
      if (cancelled) return null;
      var base = page.getViewport({ scale: 1 });
      var viewport = page.getViewport({ scale: targetWidth / base.width });
      var canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      var context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      var task = page.render({ canvasContext: context, canvas: canvas, viewport: viewport });
      cancelRender = function () { task.cancel(); };
      try {
        await task.promise;
      } catch (err) {
        if (err && err.name === 'RenderingCancelledException') return null;
        throw err;
      } finally {
        page.cleanup();
      }
      return cancelled ? null : canvas;
    })();
    return {
      promise: promise,
      cancel: function () {
        cancelled = true;
        if (cancelRender) cancelRender();
      },
    };
  }

  // ---------------------------------------------------------------- app
  var app = document.getElementById('app');
  var state = {
    twoPages: config.twoPages !== false,
    coverAlone: config.coverAlone !== false,
    soundOn: config.soundOn !== false,
    zoom: 1,
    currentPage: 1, // number of the first visible page
    total: 0,
  };
  var pdf = null;
  var book = null; // current flipbook (see createBook)
  var currentIndex = 0; // 0-based index of the first visible page (kept when settings change)

  // ----- layout
  var header = el('div', 'hdr');
  var title = el('h1');
  title.textContent = config.title || 'Flipbook';
  header.appendChild(title);
  var savePdfBtn = el('button', 'pill', icon('download') + '<span>Save PDF</span>');
  savePdfBtn.title = 'Save the original PDF file';
  header.appendChild(savePdfBtn);

  var scroll = el('div', 'scroll');
  var host = el('div', 'host');
  scroll.appendChild(host);

  var overlay = el('div', 'overlay', '<div class="spin"></div><span>Opening your flipbook…</span>');

  var toolbar = el('div', 'toolbar');
  var bar = el('div', 'bar');
  toolbar.appendChild(bar);

  app.appendChild(scroll);
  app.appendChild(header);
  app.appendChild(overlay);
  app.appendChild(toolbar);

  function showError(message) {
    overlay.className = 'overlay err';
    overlay.innerHTML = '';
    overlay.appendChild(document.createTextNode(message));
    overlay.style.display = 'flex';
  }

  // ----- toolbar
  function iconButton(name, titleText, onClick) {
    var b = el('button', 'ib', icon(name));
    b.title = titleText;
    b.addEventListener('click', onClick);
    return b;
  }
  function divider() { return el('div', 'div'); }

  var btnThumbs = iconButton('grid', 'See all pages', function () { openDrawer(); });
  var btnPrev = iconButton('left', 'Previous page (Left arrow key)', function () { if (book) book.prev(); });
  var labelBtn = el('button', 'lbl');
  labelBtn.title = 'Go to a page';
  var jumpForm = el('form', 'jump');
  var jumpInput = el('input');
  jumpInput.type = 'number';
  jumpInput.min = '1';
  var jumpTotal = el('span');
  jumpForm.appendChild(jumpInput);
  jumpForm.appendChild(jumpTotal);
  jumpForm.style.display = 'none';
  var btnNext = iconButton('right', 'Next page (Right arrow key)', function () { if (book) book.next(); });
  var btnZoomOut = iconButton('zoomOut', 'Zoom out', function () { setZoom(state.zoom - ZOOM_STEP); });
  var zoomText = el('span', 'zp');
  var btnZoomIn = iconButton('zoomIn', 'Zoom in', function () { setZoom(state.zoom + ZOOM_STEP); });
  var btnReset = iconButton('reset', 'Back to 100%', function () { setZoom(1); });
  var btnView = iconButton('book', 'How many pages to show', function () { toggleMenu(); });
  var menuWrap = el('div', 'menuwrap');
  menuWrap.appendChild(btnView);
  var btnFull = iconButton('full', 'Full screen', function () {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(function () {});
    else document.exitFullscreen().catch(function () {});
  });

  [btnThumbs, divider(), btnPrev, labelBtn, jumpForm, btnNext, divider(), btnZoomOut, zoomText, btnZoomIn, btnReset, divider(), menuWrap]
    .forEach(function (n) { bar.appendChild(n); });
  if (document.fullscreenEnabled) {
    bar.appendChild(divider());
    bar.appendChild(btnFull);
  }
  document.addEventListener('fullscreenchange', function () {
    btnFull.innerHTML = icon(document.fullscreenElement ? 'unfull' : 'full');
    btnFull.title = document.fullscreenElement ? 'Leave full screen (Esc)' : 'Full screen';
  });

  function pageLabelText() {
    var p = state.currentPage;
    var two = state.twoPages && !(state.coverAlone && p === 1) && p < state.total;
    return two ? p + '–' + Math.min(p + 1, state.total) : String(p);
  }

  function refreshToolbar() {
    labelBtn.innerHTML = 'Page ' + pageLabelText() + ' <i>/ ' + state.total + '</i>';
    jumpTotal.textContent = '/ ' + state.total;
    jumpInput.max = String(state.total);
    btnPrev.disabled = state.currentPage <= 1;
    btnNext.disabled = state.currentPage >= state.total;
    btnZoomOut.disabled = state.zoom <= MIN_ZOOM;
    btnZoomIn.disabled = state.zoom >= MAX_ZOOM;
    zoomText.textContent = Math.round(state.zoom * 100) + '%';
    btnReset.style.display = state.zoom !== 1 ? '' : 'none';
  }

  // ----- auto-hide
  var hideTimer = null;
  function busy() {
    return jumpForm.style.display !== 'none' || !!menuWrap.querySelector('.menu');
  }
  function wake() {
    toolbar.classList.remove('hide');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () { if (!busy()) toolbar.classList.add('hide'); }, 4000);
  }
  ['pointermove', 'pointerdown', 'keydown'].forEach(function (name) { window.addEventListener(name, wake); });
  wake();

  // ----- jump to page
  function openJump() {
    labelBtn.style.display = 'none';
    jumpForm.style.display = 'flex';
    jumpInput.value = String(state.currentPage);
    jumpInput.focus();
    jumpInput.select();
  }
  function closeJump() {
    jumpForm.style.display = 'none';
    labelBtn.style.display = '';
  }
  labelBtn.addEventListener('click', openJump);
  jumpInput.addEventListener('blur', closeJump);
  jumpForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = parseInt(jumpInput.value, 10);
    if (!isNaN(n) && n >= 1 && n <= state.total && book) book.goTo(n);
    closeJump();
  });

  // ----- View menu
  function closeMenu() {
    var m = menuWrap.querySelector('.menu');
    if (m) m.remove();
    btnView.classList.remove('on');
  }
  function renderMenu() {
    closeMenu();
    btnView.classList.add('on');
    var menu = el('div', 'menu');
    menu.appendChild(el('h4', null, 'Pages on screen'));
    [[true, '2 pages (like a book)'], [false, '1 page']].forEach(function (opt) {
      var b = el('button', null, '<span>' + opt[1] + '</span>' + (state.twoPages === opt[0] ? '<span class="ck">' + icon('check') + '</span>' : ''));
      b.addEventListener('click', function () {
        if (state.twoPages !== opt[0]) { state.twoPages = opt[0]; rebuildBook(); }
        renderMenu();
      });
      menu.appendChild(b);
    });
    menu.appendChild(el('hr'));
    var snd = el('button', null,
      '<span style="display:flex;align-items:center;gap:8px"><span style="color:#a3a3a3">' + icon('volume') + '</span>Page-turn sound</span>' +
      (state.soundOn ? '<span class="ck">' + icon('check') + '</span>' : ''));
    snd.addEventListener('click', function () { state.soundOn = !state.soundOn; renderMenu(); });
    menu.appendChild(snd);
    if (state.twoPages) {
      menu.appendChild(el('hr'));
      var c = el('button', null,
        '<span>First page alone<small>Turn off if pictures that cross two pages do not line up</small></span>' +
        (state.coverAlone ? '<span class="ck">' + icon('check') + '</span>' : ''));
      c.addEventListener('click', function () {
        state.coverAlone = !state.coverAlone;
        rebuildBook();
        renderMenu();
      });
      menu.appendChild(c);
    }
    menuWrap.appendChild(menu);
  }
  function toggleMenu() {
    if (menuWrap.querySelector('.menu')) closeMenu();
    else renderMenu();
  }
  window.addEventListener('pointerdown', function (e) {
    if (!menuWrap.contains(e.target)) closeMenu();
  });

  // ----- zoom
  function setZoom(z) {
    state.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
    host.style.width = state.zoom * 100 + '%';
    host.style.height = state.zoom * 100 + '%';
    refreshToolbar();
    requestAnimationFrame(function () {
      if (book) book.refresh();
      scroll.scrollLeft = (scroll.scrollWidth - scroll.clientWidth) / 2;
      scroll.scrollTop = (scroll.scrollHeight - scroll.clientHeight) / 2;
    });
    setTimeout(function () { if (book) book.refresh(); }, 250);
  }

  // ----- thumbnails
  var drawer = null;
  function closeDrawer() {
    if (drawer) {
      drawer.cleanup();
      drawer.root.remove();
      drawer = null;
    }
  }
  function openDrawer() {
    if (drawer) return;
    var root = el('div', 'drawer');
    var back = el('div', 'back');
    back.addEventListener('click', closeDrawer);
    var panel = el('div', 'panel');
    var ph = el('div', 'ph', '<b>All pages (' + state.total + ')</b>');
    var closeBtn = iconButton('close', 'Close', closeDrawer);
    ph.appendChild(closeBtn);
    var grid = el('div', 'grid');
    var jobs = [];
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        var n = Number(entry.target.getAttribute('data-page'));
        var holder = entry.target.querySelector('.pic');
        var job = renderPageToCanvas(pdf, n, 260);
        jobs.push(job);
        job.promise.then(function (canvas) { if (canvas) holder.replaceChildren(canvas); }).catch(function () {});
      });
    }, { root: grid, rootMargin: '400px' });
    for (var n = 1; n <= state.total; n++) {
      var t = el('button', 'th' + (n === state.currentPage ? ' cur' : ''),
        '<div class="sp"></div><div class="pic"></div><div class="num">' + n + '</div>');
      t.setAttribute('data-page', String(n));
      (function (page) {
        t.addEventListener('click', function () { closeDrawer(); if (book) book.goTo(page); });
      })(n);
      grid.appendChild(t);
      observer.observe(t);
    }
    panel.appendChild(ph);
    panel.appendChild(grid);
    root.appendChild(back);
    root.appendChild(panel);
    app.appendChild(root);
    var current = grid.querySelector('.cur');
    if (current) current.scrollIntoView({ block: 'center' });
    drawer = {
      root: root,
      cleanup: function () {
        observer.disconnect();
        jobs.forEach(function (j) { j.cancel(); });
      },
    };
  }

  // ----- keyboard
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeMenu();
      closeDrawer();
      return;
    }
    if (drawer || !book) return;
    if (e.target && e.target.tagName === 'INPUT') return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') book.next();
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') book.prev();
    else if (e.key === 'Home') book.goTo(1);
    else if (e.key === 'End') book.goTo(state.total);
  });

  // ---------------------------------------------------------------- the flipbook itself
  function createBook(opts) {
    var twoPages = opts.twoPages;
    var coverAlone = opts.coverAlone;
    var total = state.total;
    var cancelled = false;
    var pageFlip = null;
    var releaseHandler = null;
    var ratio = 1.414;
    var slots = [];
    var drawn = new Map();
    var jobs = new Map();
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function blankCanvas() {
      var c = document.createElement('canvas');
      c.width = 1;
      c.height = 1;
      c.style.cssText = 'display:block;width:100%;height:100%;object-fit:contain;background:#fff;';
      return c;
    }

    function wantedWidth() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var columns = twoPages ? 2 : 1;
      var availableWidth = Math.max(200, host.clientWidth - 24);
      var availableHeight = Math.max(200, host.clientHeight - 136);
      var cssWidth = Math.min(availableWidth / columns, availableHeight / ratio);
      return Math.round(Math.min(1800, Math.max(600, cssWidth * dpr)));
    }

    function swapCanvas(pageNumber, next) {
      var old = slots[pageNumber - 1];
      if (!old) return;
      next.style.cssText = 'display:block;width:100%;height:100%;object-fit:contain;background:#fff;';
      old.replaceWith(next);
      old.width = 0;
      old.height = 0;
      slots[pageNumber - 1] = next;
    }

    function drawPage(pageNumber) {
      var want = wantedWidth();
      var have = drawn.get(pageNumber);
      if (have && have >= want * 0.8 && have <= want * 1.6) return Promise.resolve();
      var running = jobs.get(pageNumber);
      if (running) {
        if (Math.abs(running.width - want) / want < 0.2) return Promise.resolve();
        running.cancel();
      }
      var job = renderPageToCanvas(pdf, pageNumber, want);
      jobs.set(pageNumber, { width: want, cancel: job.cancel });
      return job.promise
        .then(function (canvas) {
          if (cancelled || !canvas) return;
          swapCanvas(pageNumber, canvas);
          drawn.set(pageNumber, want);
        })
        .catch(function (err) { console.error('Could not draw page ' + pageNumber, err); })
        .then(function () {
          var j = jobs.get(pageNumber);
          if (j && j.cancel === job.cancel) jobs.delete(pageNumber);
        });
    }

    function updateVisiblePages(current) {
      var min = Math.max(1, current - KEEP_BEHIND);
      var max = Math.min(total, current + KEEP_AHEAD);
      var order = [];
      for (var p = min; p <= max; p++) order.push(p);
      order.sort(function (a, b) { return Math.abs(a - current) - Math.abs(b - current); });
      var firstPromises = order.map(drawPage);
      Array.from(drawn.keys()).forEach(function (p) {
        if (p < min - 2 || p > max + 2) {
          swapCanvas(p, blankCanvas());
          drawn.delete(p);
        }
      });
      Array.from(jobs.keys()).forEach(function (p) {
        if (p < min - 2 || p > max + 2) {
          jobs.get(p).cancel();
          jobs.delete(p);
        }
      });
      return Promise.all(firstPromises.slice(0, 2));
    }

    function toFirstVisible(index) {
      if (!twoPages) return index;
      if (coverAlone) return index > 0 && index % 2 === 0 ? index - 1 : index;
      return index % 2 === 1 ? index - 1 : index;
    }

    function report(index) {
      if (!pageFlip) return;
      var idx = toFirstVisible(typeof index === 'number' ? index : pageFlip.getCurrentPageIndex());
      currentIndex = idx;
      state.currentPage = idx + 1;
      refreshToolbar();
      updateVisiblePages(idx + 1);
    }

    var api = {
      next: function () { if (pageFlip) pageFlip.flipNext(); },
      prev: function () { if (pageFlip) pageFlip.flipPrev(); },
      goTo: function (page) {
        if (!pageFlip) return;
        var target = Math.max(0, Math.min(total - 1, page - 1));
        var current = pageFlip.getCurrentPageIndex();
        if (target === current) return;
        if (Math.abs(target - current) > 3) {
          pageFlip.turnToPage(target);
          report();
        } else {
          pageFlip.flip(target);
        }
      },
      refresh: function () {
        if (!pageFlip) return;
        pageFlip.update();
        updateVisiblePages(currentIndex + 1);
      },
      destroy: function () {
        cancelled = true;
        if (releaseHandler) window.removeEventListener('pointerup', releaseHandler);
        jobs.forEach(function (j) { j.cancel(); });
        jobs.clear();
        try { if (pageFlip) pageFlip.destroy(); } catch (e) { /* already gone */ }
        pageFlip = null;
        host.replaceChildren();
      },
    };

    (async function init() {
      try {
        var first = await pdf.getPage(1);
        var vp = first.getViewport({ scale: 1 });
        ratio = Math.min(3.5, Math.max(0.3, vp.height / vp.width));
        if (cancelled) return;

        host.replaceChildren();
        var bookEl = document.createElement('div');
        bookEl.style.cssText = 'width:100%;height:100%;';
        host.appendChild(bookEl);

        var lastIsAlone = coverAlone ? total % 2 === 0 : total % 2 === 1;
        var pageElements = [];
        for (var n = 1; n <= total; n++) {
          var pageEl = document.createElement('div');
          pageEl.className = 'page-item';
          var hard = (coverAlone && n === 1) || (n === total && lastIsAlone);
          pageEl.setAttribute('data-density', hard ? 'hard' : 'soft');
          pageEl.style.cssText = 'background:#fff;overflow:hidden;';
          var canvas = blankCanvas();
          pageEl.appendChild(canvas);
          slots.push(canvas);
          pageElements.push(pageEl);
        }

        var startIndex = toFirstVisible(Math.min(Math.max(0, currentIndex), total - 1));
        var baseWidth = 500;
        pageFlip = new St.PageFlip(bookEl, {
          width: baseWidth,
          height: Math.round(baseWidth * ratio),
          size: 'stretch',
          // page-flip picks one vs two pages from minWidth. We decide ourselves,
          // so in one-page mode minWidth is huge and its side effect is undone below.
          minWidth: twoPages ? 100 : 5000,
          maxWidth: 1600,
          minHeight: 200,
          maxHeight: 2600,
          maxShadowOpacity: 0.5,
          showCover: coverAlone,
          mobileScrollSupport: false,
          usePortrait: !twoPages,
          useMouseEvents: true,
          swipeDistance: 30,
          clickEventForward: false,
          startPage: startIndex,
          drawShadow: !reducedMotion,
          flippingTime: reducedMotion ? 0 : 750,
        });
        pageFlip.loadFromHTML(pageElements);
        bookEl.style.minWidth = '0px';
        // 'flipping' = the page is turning now (button, key, swipe or drag)
        var dragging = false;
        pageFlip.on('changeState', function (e) {
          if (e.data === 'user_fold') dragging = true;
          else if (e.data === 'read') dragging = false;
          else if (e.data === 'flipping' && state.soundOn) playFlipSound();
        });
        releaseHandler = function () {
          if (dragging && state.soundOn) playFlipSound();
          dragging = false;
        };
        window.addEventListener('pointerup', releaseHandler);
        pageFlip.on('flip', function (e) { report(typeof e.data === 'number' ? e.data : undefined); });

        state.currentPage = startIndex + 1;
        currentIndex = startIndex;
        refreshToolbar();
        await updateVisiblePages(startIndex + 1);
        if (!cancelled && opts.onReady) opts.onReady();
      } catch (err) {
        console.error('Could not start the flipbook', err);
        if (!cancelled && opts.onReady) opts.onReady();
      }
    })();

    return api;
  }

  function rebuildBook() {
    if (book) book.destroy();
    refreshToolbar();
    book = createBook({ twoPages: state.twoPages, coverAlone: state.coverAlone });
  }

  // ---------------------------------------------------------------- start up
  async function start() {
    try {
      var pdfjsBytes = readBase64('fb-pdfjs');
      var workerBytes = readBase64('fb-worker');
      var files = JSON.parse(document.getElementById('fb-files').textContent);
      document.getElementById('fb-files').textContent = '';

      installEmbeddedFetch(files);

      var pdfjsUrl = URL.createObjectURL(new Blob([pdfjsBytes], { type: 'text/javascript' }));
      var workerSource =
        '(' + workerPatch.toString() + ')(' + JSON.stringify(MARK) + ',' + JSON.stringify(files) + ');\n';
      var workerUrl = URL.createObjectURL(
        new Blob([workerSource, workerBytes], { type: 'text/javascript' })
      );
      var pdfjs = await import(pdfjsUrl);
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

      var data = readBase64('fb-pdf');
      var task = pdfjs.getDocument({
        data: data,
        // Only the image decoders are stored in this file. Text uses the
        // fonts already on the reader's computer (no font files are downloaded).
        wasmUrl: MARK + 'wasm/',
      });
      task.onPassword = function (update, reason) {
        var pw = window.prompt(
          reason === 2 ? 'That password was not correct. Try again:' : 'This PDF is locked. Please type its password:'
        );
        if (pw === null) task.destroy();
        else update(pw);
      };
      pdf = await task.promise;
      state.total = pdf.numPages;

      savePdfBtn.addEventListener('click', async function () {
        var bytes = await pdf.getData();
        var a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        a.download = (config.title || 'document') + '.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
      });

      refreshToolbar();
      setZoom(1);
      book = createBook({
        twoPages: state.twoPages,
        coverAlone: state.coverAlone,
        onReady: function () { overlay.style.display = 'none'; },
      });
    } catch (err) {
      console.error(err);
      showError(
        'Sorry, this flipbook could not be opened. Please try a recent version of Chrome, Edge, Firefox or Safari.'
      );
    }
  }

  start();
})();
