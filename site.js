// Accretion Compute — small progressive enhancements. The site works without this file.
(function () {
  document.documentElement.classList.add('js');

  document.addEventListener('DOMContentLoaded', function () {
    // Mobile menu
    var toggle = document.querySelector('[data-nav-toggle]');
    var nav = document.getElementById('nav');
    if (toggle && nav) {
      var setOpen = function (open) {
        toggle.setAttribute('aria-expanded', String(open));
        nav.classList.toggle('open', open);
      };
      toggle.addEventListener('click', function () { setOpen(toggle.getAttribute('aria-expanded') !== 'true'); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
      nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') setOpen(false); });
    }

    // Colour theme for the whole site (black by default). The page head sets it before paint.
    var root = document.documentElement;
    var modeButtons = [].slice.call(document.querySelectorAll('[data-theme-set]'));
    var pressTheme = function () {
      var t = root.getAttribute('data-theme');
      modeButtons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-theme-set') === t)); });
    };
    modeButtons.forEach(function (b) {
      b.addEventListener('click', function () {
        var t = b.getAttribute('data-theme-set');
        if (root.getAttribute('data-theme') === t) return;
        root.setAttribute('data-theme', t);
        try { localStorage.setItem('ac-theme', t); } catch (e) {}
        var meta = document.querySelector('meta[name=theme-color]');
        if (meta) meta.content = t === 'dark' ? '#050506' : '#ffffff';
        pressTheme();
        document.dispatchEvent(new CustomEvent('ac-theme', { detail: t }));
      });
    });
    pressTheme();

    // Top bar: a hairline and a slimmer height once the page scrolls
    var bar = document.querySelector('[data-bar]');
    if (bar) {
      var onScroll = function () { bar.classList.toggle('scrolled', window.scrollY > 8); };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    // Reveal on scroll
    var items = document.querySelectorAll('.reveal, .draw');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      items.forEach(function (el) { io.observe(el); });
    } else {
      items.forEach(function (el) { el.classList.add('in'); });
    }

    // Contact form: opens the visitor's email app with the message filled in. Nothing is sent or stored by this site.
    var form = document.querySelector('[data-mail-form]');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!form.reportValidity()) return;
        var data = new FormData(form);
        var about = data.get('about') || 'General';
        var lines = [
          'Name: ' + (data.get('name') || ''),
          'Organisation: ' + (data.get('org') || ''),
          'Email: ' + (data.get('email') || ''),
          'About: ' + about,
          '',
          data.get('message') || ''
        ];
        var to = form.getAttribute('data-mail-to');
        var subject = 'Accretion Compute enquiry: ' + about;
        window.location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
        var note = form.querySelector('[data-mail-note]');
        if (note) note.hidden = false;
      });
    }
  });
})();

// Home hero: a living logo with a glowing horizon bent around it and a few grains of dust. It follows the site colour theme.
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var hero = document.querySelector('[data-hero]');
    var canvas = hero && hero.querySelector('.hero-canvas');
    var logo = hero && hero.querySelector('.alogo');
    if (!canvas || !canvas.getContext || !logo) return;
    var ctx = canvas.getContext('2d');
    var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    var theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

    // The brand symbol (same geometry as the logo SVGs), with slowly turning rings.
    var uid = 0;
    function symbol(tone) {
      var id = 'L' + (uid++), lit = tone !== 'light';
      var stops = lit ? ['#FFFFFF', '#B9BDC4', '#F3F4F6', '#8E939B', '#E6E8EB', '#A9ADB4'] : ['#050506', '#5A5E66', '#0B0C0E', '#3A3D42', '#1A1B1E', '#5A5E66'];
      var c = lit ? '#F3F4F6' : '#0B0C0E', core = lit ? '#FFFFFF' : '#050506', glow = lit ? '#D9DCE1' : '#3A3D42';
      var fade = function (d) {
        return '<linearGradient id="' + id + d + '" x1="0" y1="0" x2="' + (d === 'h' ? 1 : 0) + '" y2="' + (d === 'h' ? 0 : 1) + '"><stop offset="0" stop-color="' + c + '" stop-opacity="0"/><stop offset=".5" stop-color="' + c + '"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></linearGradient>';
      };
      var ring = function (cls, cx, cy, op, dur, rev) {
        return '<g class="' + cls + '"><animateTransform attributeName="transform" type="rotate" from="' + (rev ? 360 : 0) + ' 0 0" to="' + (rev ? 0 : 360) + ' 0 0" dur="' + dur + 's" repeatCount="indefinite"/>' +
          '<circle class="glow" cx="' + cx + '" cy="' + cy + '" r="100" stroke="' + glow + '" stroke-width="32" filter="url(#' + id + 'b)"/>' +
          '<circle class="ring" cx="' + cx + '" cy="' + cy + '" r="100" stroke="url(#' + id + 'p)" stroke-width="2.4" opacity="' + op + '"/></g>';
      };
      return '<svg class="sym" viewBox="-130 -130 260 260" aria-hidden="true"><defs>' + fade('h') + fade('v') +
        '<filter id="' + id + 'b" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="12"/></filter>' +
        '<filter id="' + id + 's" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5"/></filter>' +
        '<linearGradient id="' + id + 'p" gradientUnits="userSpaceOnUse" x1="-110" y1="-110" x2="110" y2="110">' +
        stops.map(function (s, i) { return '<stop offset="' + (i / 5) + '" stop-color="' + s + '"/>'; }).join('') +
        '<animateTransform attributeName="gradientTransform" type="rotate" from="0 0 0" to="360 0 0" dur="14s" repeatCount="indefinite"/></linearGradient></defs>' +
        '<g fill="none">' + ring('r1', 0, -7, .55, 26) + ring('r2', 6, 4, 1, 34, true) + ring('r3', -6, 4, .55, 30) + '</g>' +
        '<circle r="2.2" fill="' + core + '" opacity=".9"><animateMotion dur="9s" repeatCount="indefinite" path="M106 4a100 100 0 1 0-200 0a100 100 0 1 0 200 0"/></circle>' +
        '<circle r="1.6" fill="' + core + '" opacity=".5"><animateMotion dur="14s" repeatCount="indefinite" path="M-106 4a100 100 0 1 1 200 0a100 100 0 1 1-200 0"/></circle>' +
        '<rect class="fh" x="-70" y="-.8" width="140" height="1.6" fill="url(#' + id + 'h)"/>' +
        '<rect class="fv" x="-.8" y="-30" width="1.6" height="60" fill="url(#' + id + 'v)"/>' +
        '<circle class="halo" r="10" fill="' + core + '" filter="url(#' + id + 's)"/><circle class="core" r="3.5" fill="' + core + '"/></svg>';
    }

    // Sizes are in symbol widths (S). Every point is pushed outward by a point-mass lens,
    // so the horizon and the dust bend around the logo instead of passing through it.
    var INK = { dark: [243, 244, 246], light: [11, 12, 14] };
    var LINES = [0, -0.1, 0.1], REACH = 2.6, GRAINS = 5;
    var w, h, cx, cy, S, E, ink, on = false, last = 0, energy = 0, halo, core, glows;
    // The visitor's pointer acts as a small second mass; clicks make the core flare.
    var ptr = { x: 0, y: 0, tx: 0, ty: 0, inf: 0, want: 0 }, sym;

    function grain(fresh) {
      var life = 6 + Math.random() * 8;
      return { r: 0.5 + Math.random() * (fresh ? 1.1 : 0.35), a: Math.random() * 6.2832, v: 0.02 + Math.random() * 0.05,
        y: (Math.random() - 0.5) * 0.05, s: 0.7 + Math.random() * 0.8, o: 0.3 + Math.random() * 0.4, life: life, t: fresh ? Math.random() * life : 0 };
    }
    var dust = [];
    for (var i = 0; i < GRAINS; i++) dust.push(grain(true));
    // Faint background dust drifting across the whole hero, like the story section's, but sparser.
    var motes = [];
    for (i = 0; i < (innerWidth < 720 ? 70 : 160); i++) motes.push({ x: Math.random(), y: Math.random(), ph: Math.random(), o: Math.random(), s: 0.6 + Math.random() * 1.1 });
    var runners = [];
    for (i = 0; i < 4; i++) runners.push({ u: Math.random(), sp: 0.12 + Math.random() * 0.06, o: 0.25 + Math.random() * 0.15 });

    function mount() {
      logo.innerHTML = symbol(theme) + '<div class="wm"></div>';
      var s = logo.querySelector('.sym');
      sym = s; halo = s.querySelector('.halo'); core = s.querySelector('.core'); glows = [].slice.call(s.querySelectorAll('.glow'));
    }
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2), hr = hero.getBoundingClientRect();
      var c = logo.querySelector('.sym .core').getBoundingClientRect(), sym = logo.querySelector('.sym').getBoundingClientRect();
      w = hr.width; h = hr.height; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = c.left - hr.left + c.width / 2; cy = c.top - hr.top + c.height / 2; S = sym.width; E = 0.44 * S; ink = INK[theme];
    }
    function lens(x, y) { var b = Math.hypot(x, y) || 0.001, k = (b + Math.sqrt(b * b + 4 * E * E)) / 2 / b; return [cx + x * k, cy + y * k]; }
    // The horizon and dust follow the pointer, strongest close to it and fading with distance.
    // Over the disk itself everything calms down, and the lines hugging the ring barely move,
    // so the black hole never looks bent out of shape.
    function smooth(v) { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); }
    function calm() { return 0.6 + 0.4 * smooth((Math.hypot(ptr.x - cx, ptr.y - cy) - 0.45 * S) / (0.5 * S)); }
    function pull(p, most) {
      if (ptr.inf < 0.002) return p;
      // Very wide reach, so the pull is about as strong from across the page as up close.
      var dx = ptr.x - p[0], dy = ptr.y - p[1], d2 = dx * dx + dy * dy, d = Math.sqrt(d2) || 1, s2 = 9 * S * S;
      var m = ptr.inf * calm() * most * S * Math.sqrt(s2 / (d2 + s2));
      m *= 0.4 + 0.6 * smooth((Math.hypot(p[0] - cx, p[1] - cy) - 0.55 * S) / (0.6 * S));
      m = Math.min(m, d * 0.3);
      return [p[0] + dx / d * m, p[1] + dy / d * m];
    }
    function rgba(a) { return 'rgba(' + ink[0] + ',' + ink[1] + ',' + ink[2] + ',' + Math.max(0, a).toFixed(3) + ')'; }
    // Nothing is drawn behind the wordmark and headline.
    function clearAt(y) { return y < cy + 0.45 * S ? 1 : Math.max(0, 1 - (y - cy - 0.45 * S) / (0.35 * S)); }

    function frame(dt, t) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = rgba(1);
      motes.forEach(function (m) {
        var a = (0.15 + 0.4 * m.o * (0.6 + 0.4 * Math.sin(t * 1.3 + m.ph * 40))) * (theme === 'dark' ? 1 : 0.7);
        ctx.globalAlpha = a;
        ctx.fillRect(m.x * w + Math.sin(t * 0.15 + m.ph * 6) * 16, m.y * h + Math.cos(t * 0.12 + m.ph * 5) * 16, m.s, m.s);
      });
      ctx.globalAlpha = 1;
      var ease = 1 - Math.exp(-dt * 6);
      ptr.x += (ptr.tx - ptr.x) * ease; ptr.y += (ptr.ty - ptr.y) * ease;
      ptr.inf += (ptr.want - ptr.inf) * (1 - Math.exp(-dt * 3));
      var breathe = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI / 5.5);
      var L = Math.min(REACH * S, w * 0.46), glow = 0.75 + 0.25 * breathe;
      var grad = function (a) {
        var g = ctx.createLinearGradient(cx - L, 0, cx + L, 0);
        g.addColorStop(0, rgba(0)); g.addColorStop(0.3, rgba(a * 0.35)); g.addColorStop(0.5, rgba(a)); g.addColorStop(0.7, rgba(a * 0.35)); g.addColorStop(1, rgba(0));
        return g;
      };
      LINES.forEach(function (off) {
        var main = off === 0, base = (main ? 0.9 : 0.4) * glow * (theme === 'dark' ? 1 : 0.8);
        ctx.beginPath();
        for (var x = -L, n = 0; x <= L; x += 3, n++) { var p = pull(lens(x, off * S), 0.035); n ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
        ctx.save(); ctx.strokeStyle = grad(base * 0.35); ctx.lineWidth = main ? 7 : 4; ctx.filter = 'blur(4px)'; ctx.stroke(); ctx.restore();
        ctx.strokeStyle = grad(base); ctx.lineWidth = main ? 1.2 : 0.8; ctx.stroke();
      });
      energy = Math.max(energy, 0.45 * breathe);

      // A few grains circle the logo on flat, lensed orbits, drift outward, fade and are reborn near the ring.
      var dim = theme === 'dark' ? 1 : 0.8;
      ctx.fillStyle = rgba(1);
      dust.forEach(function (p, k) {
        p.t += dt; if (p.t > p.life) { p = dust[k] = grain(false); }
        p.a -= dt * 0.42 / Math.pow(p.r, 1.5); p.r += dt * p.v;
        var q = pull(lens(Math.cos(p.a) * p.r * S, Math.sin(p.a) * p.r * S * 0.22 + p.y * S), 0.1);
        var edge = Math.max(0, 1 - Math.abs(q[0] - cx) / L);
        var a = Math.sin(Math.PI * p.t / p.life) * p.o * edge * clearAt(q[1]) * dim * (0.8 + 0.2 * breathe);
        if (a < 0.01) return;
        ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(q[0], q[1], p.s, 0, 6.2832); ctx.fill();
      });
      // A few dim runners orbit on the two outer horizon lines, all the same way round (anticlockwise):
      // right to left along the top line, out at the left tip, back in on the bottom line at the
      // same tip and left to right along it, out at the right tip and round again.
      runners.forEach(function (p) {
        p.u = (p.u + dt * p.sp) % 1;
        for (var j = 0; j < 4; j++) {
          var u = p.u - j * 0.006; if (u < 0) u += 1;
          var top = u < 0.5, f = top ? u * 2 : (u - 0.5) * 2, x = (top ? 1 - 2 * f : -1 + 2 * f) * L * 0.95;
          var q = pull(lens(x, (top ? -0.1 : 0.1) * S), 0.035);
          var a = (1 - j / 4) * p.o * smooth((1 - Math.abs(x) / (L * 0.95)) / 0.2) * clearAt(q[1]) * dim;
          if (a < 0.01) continue;
          ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(q[0], q[1], j ? 0.8 : 1.1, 0, 6.2832); ctx.fill();
        }
      });
      ctx.globalAlpha = 1;

      // The logo answers the breath: its core and glow brighten with it.
      energy *= Math.exp(-dt * 1.4);
      var e = Math.min(1, energy + 0.12 * breathe);
      halo.style.opacity = (0.3 + 0.55 * e).toFixed(3); halo.style.transform = 'scale(' + (1 + 0.7 * e).toFixed(3) + ')';
      core.style.transform = 'scale(' + (1 + 0.25 * e).toFixed(3) + ')';
      glows.forEach(function (g) { g.style.opacity = (0.08 + 0.18 * e).toFixed(3); });
      // The symbol tips gently toward the pointer.
      var nx = Math.max(-1, Math.min(1, (ptr.x - cx) / (w * 0.5))), ny = Math.max(-1, Math.min(1, (ptr.y - cy) / (h * 0.5)));
      sym.style.transform = ptr.inf < 0.002 ? '' : 'perspective(700px) rotateX(' + (-ny * 2 * ptr.inf * calm()).toFixed(2) + 'deg) rotateY(' + (nx * 2 * ptr.inf * calm()).toFixed(2) + 'deg)';
    }
    function loop(t) { if (!on) return; var dt = Math.min(0.05, (t - last) / 1000 || 0); last = t; frame(dt, t / 1000); requestAnimationFrame(loop); }

    // Follow the site colour switch
    document.addEventListener('ac-theme', function (ev) { theme = ev.detail === 'dark' ? 'dark' : 'light'; mount(); size(); if (still) frame(0, 0); });

    // Mouse: the horizon and dust lean toward the pointer. Click or tap: the core flares and the dust is pushed out.
    // Phones that allow it without asking (most Android): tilting the phone moves the pull.
    if (!still) {
      hero.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        var r = hero.getBoundingClientRect();
        ptr.tx = e.clientX - r.left; ptr.ty = e.clientY - r.top;
        if (ptr.inf < 0.05) { ptr.x = ptr.tx; ptr.y = ptr.ty; }
        ptr.want = 1;
      });
      hero.addEventListener('pointerleave', function () { ptr.want = 0; });
      hero.addEventListener('pointerdown', function (e) {
        if (e.target.closest('a, button')) return;
        energy = 1;
        dust.forEach(function (p) { p.r += 0.15 + Math.random() * 0.2; });
      });
      if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function' && matchMedia('(pointer: coarse)').matches) {
        window.addEventListener('deviceorientation', function (e) {
          if (e.gamma == null || !w) return;
          ptr.tx = cx + Math.max(-1, Math.min(1, e.gamma / 30)) * w * 0.35;
          ptr.ty = cy + Math.max(-1, Math.min(1, (e.beta - 45) / 30)) * S * 1.2;
          ptr.want = 0.7;
        });
      }
    }

    mount(); size();
    window.addEventListener('resize', function () { size(); if (still) frame(0, 0); });
    if (still || !('IntersectionObserver' in window)) { frame(0, 0); return; }
    new IntersectionObserver(function (en) {
      var was = on; on = en[0].isIntersecting;
      if (on && !was) { last = performance.now(); requestAnimationFrame(loop); }
    }).observe(hero);
  });
})();

// Energy-to-compute chain drawn in particles: a wellsite, an on-site generator, a data hall and the
// Accretion black hole. data-mode="pan" pans a camera across them; data-mode="all" shows the whole chain.
(function () {
  var sec = document.querySelector('[data-story]');
  if (!sec) return;
  var MODE = sec.getAttribute('data-mode') || 'pan';
  var canvas = sec.querySelector('.ps-canvas'), ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) { sec.classList.add('no-ps'); return; }
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var steps = sec.querySelectorAll('.ps-step'), track = sec.querySelector('.ps-track'), textEl = sec.querySelector('.ps-text');
  var bl = document.createElement('canvas'), bctx = bl.getContext('2d');
  var w, h, dpr, R, wide, P = [], N, bg, light, ox = 0, oy = 0, cx, cy, POS, BHS, BHL;
  var v = 0, vs = 0, T = 0, last = 0, raf = 0, visible = false, shown = 0;
  var o = { x: 0, y: 0, a: 0, z: 1 };

  function rnd() { return Math.random(); }
  function smooth(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  // ---------- 3D line work, in units of R. y points down (ground at y = G), z points toward the viewer.
  // A segment is [x1, y1, z1, x2, y2, z2, brightness]; each scene is seen through its own camera ----------
  var G = 0.62;
  function L(s, x1, y1, z1, x2, y2, z2, b) { s.push([x1, y1, z1, x2, y2, z2, b == null ? 1 : b]); }
  function box(s, x0, y0, z0, x1, y1, z1, b) {
    L(s, x0, y0, z0, x1, y0, z0, b); L(s, x1, y0, z0, x1, y1, z0, b); L(s, x1, y1, z0, x0, y1, z0, b); L(s, x0, y1, z0, x0, y0, z0, b);
    L(s, x0, y0, z1, x1, y0, z1, b); L(s, x1, y0, z1, x1, y1, z1, b); L(s, x1, y1, z1, x0, y1, z1, b); L(s, x0, y1, z1, x0, y0, z1, b);
    L(s, x0, y0, z0, x0, y0, z1, b); L(s, x1, y0, z0, x1, y0, z1, b); L(s, x1, y1, z0, x1, y1, z1, b); L(s, x0, y1, z0, x0, y1, z1, b);
  }
  function rp(cx, cy, cz, r, ax, u) { var c = Math.cos(u) * r, d = Math.sin(u) * r; return ax === 'y' ? [cx + c, cy, cz + d] : ax === 'z' ? [cx + c, cy + d, cz] : [cx, cy + d, cz + c]; }
  function ring(s, cx, cy, cz, r, ax, n, b, a0, a1) { // ax: the ring's axis ('y' lies flat, 'z' faces the viewer, 'x' faces sideways)
    a0 = a0 || 0; a1 = a1 == null ? 6.2832 : a1;
    for (var i = 0; i < n; i++) { var p = rp(cx, cy, cz, r, ax, a0 + (a1 - a0) * i / n), q = rp(cx, cy, cz, r, ax, a0 + (a1 - a0) * (i + 1) / n); L(s, p[0], p[1], p[2], q[0], q[1], q[2], b); }
  }
  function vcyl(s, cx, cz, r, y0, y1, n, b, bands) { // upright cylinder, y0 top to y1 bottom
    ring(s, cx, y0, cz, r, 'y', n, b); ring(s, cx, y1, cz, r, 'y', n, b * 0.8);
    for (var i = 0; i < 6; i++) { var u = i * 1.0472 + 0.3; L(s, cx + Math.cos(u) * r, y0, cz + Math.sin(u) * r, cx + Math.cos(u) * r, y1, cz + Math.sin(u) * r, b * 0.55); }
    for (var j = 1; j <= (bands || 0); j++) ring(s, cx, y0 + (y1 - y0) * j / (bands + 1), cz, r, 'y', n, b * 0.4);
  }
  function xcyl(s, x0, x1, cy, cz, r, n, b, bands) { // lying cylinder along x
    ring(s, x0, cy, cz, r, 'x', n, b); ring(s, x1, cy, cz, r, 'x', n, b);
    for (var i = 0; i < 6; i++) { var u = i * 1.0472 + 0.3; L(s, x0, cy + Math.sin(u) * r, cz + Math.cos(u) * r, x1, cy + Math.sin(u) * r, cz + Math.cos(u) * r, b * 0.55); }
    for (var j = 1; j <= (bands || 0); j++) ring(s, x0 + (x1 - x0) * j / (bands + 1), cy, cz, r, 'x', n, b * 0.4);
  }
  function dome(s, cx, cy, cz, r, dir, b) { // a dished head on an upright vessel; dir -1 up, 1 down
    ring(s, cx, cy + dir * r * 0.35, cz, r * 0.8, 'y', 12, b * 0.6); ring(s, cx, cy + dir * r * 0.6, cz, r * 0.4, 'y', 8, b * 0.5);
    for (var i = 0; i < 4; i++) { var u = i * 1.5708 + 0.3; L(s, cx + Math.cos(u) * r, cy, cz + Math.sin(u) * r, cx + Math.cos(u) * r * 0.4, cy + dir * r * 0.6, cz + Math.sin(u) * r * 0.4, b * 0.45); }
  }
  function wheel(s, x, y, z, r, ax, b) { ring(s, x, y, z, r, ax, 8, b); var p = rp(x, y, z, r, ax, 0), q = rp(x, y, z, r, ax, 3.1416); L(s, p[0], p[1], p[2], q[0], q[1], q[2], b * 0.5); }

  // Cameras: look from a point at a target; the target lands at the scene origin (plus sx, sy)
  function lookAt(px, py, pz, tx, ty, tz, f, sx, sy) {
    var yaw = -Math.atan2(px - tx, pz - tz), hd = Math.hypot(px - tx, pz - tz), pit = Math.atan2(ty - py, hd);
    return { px: px, py: py, pz: pz, cy: Math.cos(yaw), sy: Math.sin(yaw), cp: Math.cos(pit), sp: Math.sin(pit), f: f || Math.hypot(hd, ty - py), sx: sx || 0, sy0: sy || 0 };
  }
  function proj(c, x, y, z) {
    var rx = x - c.px, ry = y - c.py, rz = z - c.pz;
    var x1 = rx * c.cy + rz * c.sy, z1 = -rx * c.sy + rz * c.cy;
    var y2 = ry * c.cp + z1 * c.sp, z2 = z1 * c.cp - ry * c.sp, d = -z2;
    if (d < 0.05) { o.a = 0; o.z = 0; return; }
    var k = c.f / d; o.x = x1 * k + c.sx; o.y = y2 * k + c.sy0; o.z = k * (c.k0 || 1);
  }
  var CAM = [
    lookAt(1.5, -0.85, 4.6, 0, 0.12, 0, 0, 0, 0.12),
    lookAt(1.4, -0.9, 4.6, 0, 0.12, 0, 0, 0, 0.12),
    { px: 0, py: 0, pz: 0, cy: 1, sy: 0, cp: 1, sp: 0, f: 1.5, sx: 0, sy0: -0.05, k0: 1 / 0.6 } // straight down the aisle
  ];
  CAM[0].k0 = 1; CAM[1].k0 = 1;

  // 1. Wellsite: a pumpjack nodding over the well, a separator, a knockout drum, a flare stack and a tank battery
  function energySegs(T) {
    var s = [], i, z;
    for (i = 0; i <= 10; i++) L(s, -1.15, G, -0.5 + i * 0.1, 1.15, G, -0.5 + i * 0.1, i % 5 === 0 ? 0.3 : 0.1); // pad
    L(s, -1.15, G, -0.5, -1.15, G, 0.5, 0.3); L(s, 1.15, G, -0.5, 1.15, G, 0.5, 0.3);
    // skid: two rails with cross members
    for (z = -1; z <= 1; z += 2) { box(s, -1.12, G - 0.05, z * 0.14, -0.12, G, z * 0.1, 0.8); }
    for (i = 0; i <= 8; i++) L(s, -1.1 + i * 0.12, G - 0.05, -0.1, -1.1 + i * 0.12, G - 0.05, 0.1, 0.35);
    // samson post: four legs to the saddle, braced
    var px = -0.55, py = -0.02;
    for (z = -1; z <= 1; z += 2) {
      L(s, -0.8, G - 0.05, z * 0.12, px - 0.02, py + 0.04, z * 0.035, 1); L(s, -0.3, G - 0.05, z * 0.12, px + 0.02, py + 0.04, z * 0.035, 1);
      L(s, -0.74, 0.42, z * 0.107, -0.36, 0.42, z * 0.107, 0.55); L(s, -0.68, 0.22, z * 0.085, -0.42, 0.22, z * 0.085, 0.55);
      L(s, -0.74, 0.42, z * 0.107, -0.42, 0.22, z * 0.085, 0.3); L(s, -0.36, 0.42, z * 0.107, -0.68, 0.22, z * 0.085, 0.3);
    }
    L(s, -0.74, 0.42, -0.107, -0.74, 0.42, 0.107, 0.4); L(s, -0.36, 0.42, -0.107, -0.36, 0.42, 0.107, 0.4);
    box(s, px - 0.035, py, -0.045, px + 0.035, py + 0.04, 0.045, 0.9);
    // walking beam, an I-beam that rocks
    var th = 0.16 * Math.sin(T * 0.9), ca = Math.cos(th), sa = Math.sin(th);
    function bp(d, n) { return [px + ca * d - sa * n, py + sa * d + ca * n]; }
    function bl(d1, n1, z1, d2, n2, z2, b) { var a = bp(d1, n1), c = bp(d2, n2); L(s, a[0], a[1], z1, c[0], c[1], z2, b); }
    for (z = -1; z <= 1; z += 2) { bl(-0.44, -0.03, z * 0.035, 0.44, -0.03, z * 0.035, 1); bl(-0.44, 0.03, z * 0.035, 0.44, 0.03, z * 0.035, 0.75); }
    bl(-0.44, 0, 0, 0.44, 0, 0, 0.35);
    for (i = 0; i <= 10; i++) bl(-0.42 + i * 0.084, -0.03, 0, -0.42 + i * 0.084, 0.03, 0, 0.25);
    bl(-0.44, -0.03, -0.035, -0.44, -0.03, 0.035, 0.6); bl(0.44, -0.03, -0.035, 0.44, -0.03, 0.035, 0.6);
    // equalizer at the tail
    bl(-0.48, 0.03, -0.11, -0.38, 0.03, -0.11, 0.8); bl(-0.48, 0.03, 0.11, -0.38, 0.03, 0.11, 0.8); bl(-0.43, 0.06, -0.11, -0.43, 0.06, 0.11, 0.9);
    // horsehead, a curved plate with two faces
    var hc = bp(0.44, 0);
    for (z = -1; z <= 1; z += 2) { ring(s, hc[0], hc[1], z * 0.05, 0.16, 'z', 10, 1, -Math.PI / 2 + th, Math.PI / 2 + th); ring(s, hc[0], hc[1], z * 0.05, 0.12, 'z', 8, 0.4, -Math.PI / 2 + th, Math.PI / 2 + th); }
    for (i = 0; i <= 6; i++) { var an = -Math.PI / 2 + th + i * Math.PI / 6; L(s, hc[0] + Math.cos(an) * 0.16, hc[1] + Math.sin(an) * 0.16, -0.05, hc[0] + Math.cos(an) * 0.16, hc[1] + Math.sin(an) * 0.16, 0.05, 0.45); }
    // bridle, carrier bar, polished rod, stuffing box and wellhead
    var bx = 0.05, cb = hc[1] + 0.22;
    L(s, bx, hc[1], -0.02, bx, cb, -0.02, 0.55); L(s, bx, hc[1], 0.02, bx, cb, 0.02, 0.55);
    L(s, bx - 0.01, cb, -0.045, bx - 0.01, cb, 0.045, 0.9); L(s, bx, cb, 0, bx, G - 0.26, 0, 0.85);
    vcyl(s, bx, 0, 0.018, G - 0.26, G - 0.22, 8, 0.9);
    vcyl(s, bx, 0, 0.03, G - 0.22, G - 0.12, 10, 0.8, 2);
    ring(s, bx, G - 0.2, 0, 0.042, 'y', 10, 0.6); ring(s, bx, G - 0.14, 0, 0.042, 'y', 10, 0.6);
    xcyl(s, bx + 0.03, 0.25, G - 0.17, 0, 0.012, 6, 0.75);
    wheel(s, 0.14, G - 0.21, 0, 0.022, 'y', 0.85); L(s, 0.14, G - 0.18, 0, 0.14, G - 0.21, 0, 0.6);
    xcyl(s, bx - 0.12, bx - 0.03, G - 0.17, 0, 0.012, 6, 0.6); wheel(s, bx - 0.09, G - 0.21, 0, 0.02, 'y', 0.7);
    box(s, bx - 0.06, G - 0.05, -0.06, bx + 0.06, G, 0.06, 0.6);
    vcyl(s, bx, 0, 0.022, G - 0.12, G - 0.05, 8, 0.6);
    // gearbox, crank arms, counterweights and pitman arms on both sides
    var kx = -0.97, ky = G - 0.3, ph = T * 0.9 + Math.PI / 2, c = Math.cos(ph), sn = Math.sin(ph);
    box(s, kx - 0.08, ky + 0.03, -0.07, kx + 0.08, G - 0.05, 0.07, 0.75);
    L(s, kx, ky, -0.14, kx, ky, 0.14, 0.7);
    for (z = -1; z <= 1; z += 2) {
      var zz = z * 0.13;
      ring(s, kx, ky, zz, 0.03, 'z', 6, 0.9);
      L(s, kx, ky, zz, kx + c * 0.17, ky + sn * 0.17, zz, 0.9);
      ring(s, kx, ky, zz, 0.17, 'z', 5, 0.9, ph - 0.45, ph + 0.45); ring(s, kx, ky, zz, 0.11, 'z', 4, 0.6, ph - 0.45, ph + 0.45);
      L(s, kx + Math.cos(ph - 0.45) * 0.11, ky + Math.sin(ph - 0.45) * 0.11, zz, kx + Math.cos(ph - 0.45) * 0.17, ky + Math.sin(ph - 0.45) * 0.17, zz, 0.7);
      L(s, kx + Math.cos(ph + 0.45) * 0.11, ky + Math.sin(ph + 0.45) * 0.11, zz, kx + Math.cos(ph + 0.45) * 0.17, ky + Math.sin(ph + 0.45) * 0.17, zz, 0.7);
      var pin = [kx + c * 0.13, ky + sn * 0.13], eq = bp(-0.43, 0.06);
      L(s, pin[0], pin[1], zz, eq[0], eq[1], z * 0.11, 0.9);
    }
    // motor and belt guard behind the gearbox
    xcyl(s, -1.1, -1.0, G - 0.12, -0.17, 0.05, 10, 0.7, 2);
    box(s, -1.04, ky - 0.03, -0.11, kx + 0.02, G - 0.1, -0.08, 0.45);
    // separator: an upright vessel with dished heads, legs, a sight glass and a ladder
    var sx = 0.31, sz = 0.02;
    vcyl(s, sx, sz, 0.06, G - 0.42, G - 0.12, 12, 1, 3);
    dome(s, sx, G - 0.42, sz, 0.06, -1, 1); dome(s, sx, G - 0.12, sz, 0.06, 1, 0.7);
    for (i = 0; i < 4; i++) { var la = i * 1.5708 + 0.785; L(s, sx + Math.cos(la) * 0.05, G - 0.1, sz + Math.sin(la) * 0.05, sx + Math.cos(la) * 0.07, G, sz + Math.sin(la) * 0.07, 0.6); }
    L(s, sx + 0.075, G - 0.36, sz, sx + 0.075, G - 0.16, sz, 0.45);
    xcyl(s, sx, sx + 0.21, G - 0.52, sz, 0.01, 5, 0.6); L(s, 0.52, G - 0.52, sz, 0.52, G - 0.14, sz, 0.6);
    // knockout drum on saddles
    xcyl(s, 0.45, 0.62, G - 0.09, 0, 0.05, 12, 0.85, 2);
    box(s, 0.47, G - 0.05, -0.04, 0.49, G, 0.04, 0.5); box(s, 0.58, G - 0.05, -0.04, 0.6, G, 0.04, 0.5);
    xcyl(s, 0.62, 0.7, G - 0.09, 0, 0.01, 5, 0.6);
    // flare stack with tip, ladder, platform and three guy wires
    var fx = 0.7, fz = -0.05;
    vcyl(s, fx, fz, 0.022, -0.45, G, 8, 1, 6);
    vcyl(s, fx, fz, 0.035, -0.5, -0.45, 10, 1);
    for (z = -1; z <= 1; z += 2) L(s, fx + 0.04, G, fz + z * 0.015, fx + 0.04, -0.36, fz + z * 0.015, 0.45);
    for (i = 0; i < 17; i++) L(s, fx + 0.04, G - 0.03 - i * 0.055, fz - 0.015, fx + 0.04, G - 0.03 - i * 0.055, fz + 0.015, 0.3);
    ring(s, fx, -0.1, fz, 0.11, 'y', 16, 0.7); ring(s, fx, -0.17, fz, 0.11, 'y', 16, 0.45);
    for (i = 0; i < 6; i++) { var ra = i * 1.0472; L(s, fx + Math.cos(ra) * 0.11, -0.1, fz + Math.sin(ra) * 0.11, fx + Math.cos(ra) * 0.11, -0.17, fz + Math.sin(ra) * 0.11, 0.35); }
    for (i = 0; i < 3; i++) { var ga = 0.5 + i * 2.094; L(s, fx, -0.3, fz, fx + Math.cos(ga) * 0.42, G, fz + Math.sin(ga) * 0.42, 0.22); }
    // tank battery behind, with a catwalk and stairs
    for (i = 0; i < 2; i++) { var tx = 0.24 + i * 0.25; vcyl(s, tx, -0.42, 0.1, G - 0.46, G, 16, 0.6, 3); ring(s, tx, G - 0.49, -0.42, 0.04, 'y', 8, 0.4);
      for (var t = 0; t < 4; t++) { var ta = t * 1.5708 + 0.4; L(s, tx + Math.cos(ta) * 0.1, G - 0.46, -0.42 + Math.sin(ta) * 0.1, tx, G - 0.49, -0.42, 0.35); } }
    box(s, 0.2, G - 0.49, -0.44, 0.53, G - 0.47, -0.4, 0.45);
    L(s, 0.53, G - 0.48, -0.36, 0.7, G, -0.36, 0.45); L(s, 0.53, G - 0.48, -0.32, 0.7, G, -0.32, 0.45);
    for (i = 1; i < 8; i++) L(s, 0.53 + i * 0.021, G - 0.48 + i * 0.06, -0.36, 0.53 + i * 0.021, G - 0.48 + i * 0.06, -0.32, 0.3);
    box(s, 0.1, G - 0.06, -0.58, 0.66, G, -0.26, 0.3); // berm
    return s;
  }

  // 2. On-site power: a containerised gas generator with roof radiators and silencers, a gas train,
  // a pad-mounted transformer, a utility pole and a perimeter fence
  function powerSegs(T) {
    var s = [], i, x, z;
    for (i = 0; i <= 9; i++) L(s, -1.15, G, -0.45 + i * 0.1, 1.15, G, -0.45 + i * 0.1, i % 3 === 0 ? 0.28 : 0.1);
    // fence along the back and the left side
    for (x = -1.1; x <= 1.11; x += 0.2) L(s, x, G, -0.5, x, G - 0.28, -0.5, 0.55);
    L(s, -1.1, G - 0.28, -0.5, 1.1, G - 0.28, -0.5, 0.6); L(s, -1.1, G - 0.15, -0.5, 1.1, G - 0.15, -0.5, 0.25);
    for (x = -1.1; x < 1.1; x += 0.05) { L(s, x, G, -0.5, x + 0.05, G - 0.28, -0.5, 0.07); L(s, x + 0.05, G, -0.5, x, G - 0.28, -0.5, 0.07); }
    for (z = -0.5; z <= 0.41; z += 0.2) L(s, -1.12, G, z, -1.12, G - 0.28, z, 0.5);
    L(s, -1.12, G - 0.28, -0.5, -1.12, G - 0.28, 0.4, 0.5);
    // the container
    var x0 = -0.95, x1 = 0.35, y0 = 0.05, y1 = G - 0.02, zf = 0.22, zb = -0.22;
    box(s, x0, y0, zb, x1, y1, zf, 1);
    L(s, x0, y0 + 0.035, zf, x1, y0 + 0.035, zf, 0.45); L(s, x0, y1 - 0.04, zf, x1, y1 - 0.04, zf, 0.35);
    for (x = x0 + 0.03; x < x1 - 0.01; x += 0.035) if (!(x > -0.92 && x < -0.43) && !(x > -0.38 && x < -0.1) && !(x > -0.01 && x < 0.27)) L(s, x, y0 + 0.05, zf, x, y1 - 0.05, zf, 0.18);
    for (z = zb + 0.03; z < zf - 0.01; z += 0.035) L(s, x1, y0 + 0.05, z, x1, y1 - 0.05, z, 0.22);
    for (i = 0; i < 8; i++) { var cx = i & 1 ? x1 - 0.03 : x0, cyy = i & 2 ? y1 - 0.03 : y0, czz = i & 4 ? zf - 0.03 : zb; box(s, cx, cyy, czz, cx + 0.03, cyy + 0.03, czz + 0.03, 0.7); }
    // louvres, doors with hinges and handles, a control panel with a window
    box(s, -0.9, 0.14, zf, -0.45, 0.5, zf + 0.01, 0.75);
    for (i = 1; i < 12; i++) L(s, -0.9, 0.14 + i * 0.03, zf + 0.01, -0.45, 0.14 + i * 0.03 + 0.008, zf + 0.012, 0.45);
    for (i = 0; i < 2; i++) { var dx = i * 0.13; box(s, dx, 0.13, zf, dx + 0.13, y1 - 0.05, zf + 0.008, 0.75);
      for (var hh = 0; hh < 3; hh++) L(s, dx + (i ? 0.125 : 0.005), 0.17 + hh * 0.13, zf + 0.01, dx + (i ? 0.125 : 0.005), 0.2 + hh * 0.13, zf + 0.01, 0.6); }
    L(s, 0.11, 0.3, zf + 0.012, 0.11, 0.4, zf + 0.012, 0.95); L(s, 0.15, 0.3, zf + 0.012, 0.15, 0.4, zf + 0.012, 0.95);
    box(s, -0.36, 0.16, zf, -0.12, 0.3, zf + 0.01, 0.55); box(s, -0.33, 0.18, zf + 0.01, -0.22, 0.26, zf + 0.012, 0.45);
    for (i = 0; i < 4; i++) L(s, -0.19, 0.19 + i * 0.022, zf + 0.012, -0.15, 0.19 + i * 0.022, zf + 0.012, 0.5);
    // roof radiator with two fans that turn
    box(s, -0.26, -0.1, -0.18, 0.28, y0, 0.18, 0.8);
    for (x = -0.24; x < 0.27; x += 0.025) L(s, x, -0.09, 0.18, x, y0 - 0.005, 0.18, 0.28);
    for (i = 0; i < 2; i++) { var fx = -0.12 + i * 0.27; ring(s, fx, -0.1, 0, 0.11, 'y', 16, 0.85); ring(s, fx, -0.1, 0, 0.025, 'y', 6, 0.7);
      for (var bb = 0; bb < 5; bb++) { var an = T * 5 + bb * 1.2566 + i; L(s, fx, -0.1, 0, fx + Math.cos(an) * 0.1, -0.1, Math.sin(an) * 0.1, 0.65); } }
    // silencers and stacks with rain caps that flap
    var st = [[-0.72, -0.4, -0.06], [-0.48, -0.34, 0.07]];
    for (i = 0; i < 2; i++) {
      var sx = st[i][0], top = st[i][1], sz = st[i][2], fl = 0.35 + 0.2 * Math.sin(T * 9 + i * 2);
      vcyl(s, sx, sz, 0.06, -0.2, y0, 12, 0.75, 1); dome(s, sx, -0.2, sz, 0.06, -1, 0.6);
      vcyl(s, sx, sz, 0.02, top, -0.23, 8, 1);
      L(s, sx - 0.02, top, sz, sx - 0.02 + Math.cos(fl) * 0.05, top - Math.sin(fl) * 0.05, sz, 0.8);
      L(s, sx - 0.02, top, sz - 0.02, sx - 0.02 + Math.cos(fl) * 0.05, top - Math.sin(fl) * 0.05, sz - 0.02, 0.5);
    }
    // gas train coming in from the left: pipe, valves and a meter
    xcyl(s, -1.12, x0, G - 0.1, 0.12, 0.014, 6, 0.75);
    for (i = 0; i < 2; i++) { var vx = -1.06 + i * 0.07; L(s, vx, G - 0.1, 0.12, vx, G - 0.15, 0.12, 0.6); wheel(s, vx, G - 0.155, 0.12, 0.022, 'y', 0.85); }
    box(s, -1.09, G - 0.06, 0.06, -1.0, G, 0.18, 0.5);
    // transformer with cooling fins and bushings
    var t0 = 0.47, t1 = 0.7, tz = 0.12;
    box(s, t0, G - 0.27, -tz, t1, G, tz, 0.9);
    for (x = t0 + 0.02; x < t1 - 0.01; x += 0.025) L(s, x, G - 0.2, tz, x, G - 0.03, tz, 0.3);
    for (z = -tz + 0.02; z < tz; z += 0.03) { L(s, t1, G - 0.22, z, t1 + 0.04, G - 0.22, z, 0.4); L(s, t1 + 0.04, G - 0.22, z, t1 + 0.04, G - 0.04, z, 0.4); L(s, t1, G - 0.04, z, t1 + 0.04, G - 0.04, z, 0.4); }
    for (i = 0; i < 3; i++) { var bx2 = 0.52 + i * 0.065; vcyl(s, bx2, 0, 0.01, G - 0.34, G - 0.27, 6, 0.8);
      for (var sh = 0; sh < 3; sh++) ring(s, bx2, G - 0.32 + sh * 0.02, 0, 0.02, 'y', 6, 0.7); }
    box(s, t0 + 0.02, G - 0.24, tz, t0 + 0.08, G - 0.18, tz + 0.01, 0.6);
    // utility pole with two crossarms, insulators, braces and a riser
    var pl = 0.95, pz = -0.1;
    for (i = 0; i < 4; i++) { var pa = i * 1.5708 + 0.785; L(s, pl + Math.cos(pa) * 0.022, G, pz + Math.sin(pa) * 0.022, pl + Math.cos(pa) * 0.012, -0.62, pz + Math.sin(pa) * 0.012, 0.85); }
    for (i = 0; i < 6; i++) ring(s, pl, G - i * 0.24, pz, 0.02 - i * 0.0015, 'y', 6, 0.35);
    box(s, 0.76, -0.535, pz - 0.015, 1.14, -0.51, pz + 0.015, 0.9); box(s, 0.8, -0.415, pz - 0.015, 1.1, -0.39, pz + 0.015, 0.7);
    L(s, 0.85, -0.51, pz, pl, -0.44, pz, 0.4); L(s, 1.05, -0.51, pz, pl, -0.44, pz, 0.4);
    var ins = [0.79, 0.95, 1.1];
    for (i = 0; i < 3; i++) { vcyl(s, ins[i], pz, 0.008, -0.575, -0.535, 5, 0.9); ring(s, ins[i], -0.55, pz, 0.016, 'y', 6, 0.7); ring(s, ins[i], -0.565, pz, 0.016, 'y', 6, 0.7); }
    L(s, pl + 0.035, G, pz + 0.02, pl + 0.035, -0.38, pz + 0.02, 0.45);
    L(s, t1, G - 0.05, 0, pl + 0.035, G - 0.05, pz + 0.02, 0.35);
    return s;
  }

  // 3. A data hall seen straight down the cold aisle. Cabinets stand in rows with gaps between them;
  // every cabinet holds servers with handles, drive bays and two status lights, a patch panel on top
  // and cables dropping in from the ladder above. Old depth convention: z runs 2 (near) to 11 (far).
  function H(s, x1, y1, z1, x2, y2, z2, b) { s.push([x1, y1, -z1, x2, y2, -z2, b]); }
  var SRV = 11, SY0 = -0.66, SH = 0.145; // servers per cabinet, first server top, server height
  var HALL = (function () {
    var s = [], z, k, j, y, r, b;
    for (k = -1; k <= 1; k += 2) {
      var X = 0.9 * k, N2 = X + 0.6 * k;
      H(s, X, -0.85, 2, X, -0.85, 11, 1); H(s, X, 1, 2, X, 1, 11, 1); H(s, X, 0.95, 2, X, 0.95, 11, 0.5);
      for (r = 2; r < 11; r++) {
        var near = r < 5, mid = r < 7, z0 = r + 0.04, z1 = r + 0.96;
        // the cabinet: its own frame, a gap to the next one, a top cap and a vented door edge
        H(s, X, -0.85, z0, X, 1, z0, 0.9); H(s, X, -0.85, z1, X, 1, z1, 0.9);
        H(s, X, -0.85, z0, X + 0.08 * k, -0.85, z0, 0.6); H(s, X, -0.85, z1, X + 0.08 * k, -0.85, z1, 0.6);
        H(s, X, -0.85, z0, X, -0.85, z1, 1); H(s, X, -0.8, z0, X, -0.8, z1, 0.5);
        // patch panel with ports
        H(s, X, -0.77, z0 + 0.04, X, -0.77, z1 - 0.04, 0.6); H(s, X, -0.7, z0 + 0.04, X, -0.7, z1 - 0.04, 0.6);
        if (near) for (j = 0; j < 12; j++) { var pz = z0 + 0.08 + j * 0.065; H(s, X, -0.755, pz, X, -0.715, pz, 0.35); }
        // servers
        for (j = 0; j < SRV; j++) {
          y = SY0 + j * SH; b = near ? 1 : 0.7;
          if (!mid) { H(s, X, y, z0 + 0.03, X, y, z1 - 0.03, 0.4); continue; }
          H(s, X, y, z0 + 0.03, X, y, z1 - 0.03, 0.55 * b);
          H(s, X, y + SH - 0.012, z0 + 0.03, X, y + SH - 0.012, z1 - 0.03, 0.3 * b);
          H(s, X, y + 0.015, z0 + 0.05, X, y + SH - 0.027, z0 + 0.05, 0.7 * b); // handles
          H(s, X, y + 0.015, z1 - 0.05, X, y + SH - 0.027, z1 - 0.05, 0.7 * b);
          if (near) for (var d = 0; d < 8; d++) { var dz = z0 + 0.2 + d * 0.085; H(s, X, y + 0.03, dz, X, y + SH - 0.04, dz, 0.22); } // drive bays
        }
        // cables from the ladder into the cabinet top
        H(s, X - 0.08 * k, -1.12, r + 0.3, X - 0.02 * k, -0.85, r + 0.32, 0.4); H(s, X - 0.1 * k, -1.12, r + 0.6, X - 0.03 * k, -0.85, r + 0.62, 0.4);
      }
      // end panels of the rows, nearest the viewer, with a row label
      H(s, X, -0.85, 2, N2, -0.85, 2, 0.9); H(s, X, 1, 2, N2, 1, 2, 0.9); H(s, N2, -0.85, 2, N2, 1, 2, 0.7);
      for (j = 1; j < 6; j++) H(s, X + 0.1 * j * k, -0.8, 2, X + 0.1 * j * k, 0.95, 2, 0.2);
      H(s, X + 0.15 * k, -0.6, 2, X + 0.45 * k, -0.6, 2, 0.8); H(s, X + 0.15 * k, -0.45, 2, X + 0.45 * k, -0.45, 2, 0.8);
      H(s, X + 0.15 * k, -0.6, 2, X + 0.15 * k, -0.45, 2, 0.8); H(s, X + 0.45 * k, -0.6, 2, X + 0.45 * k, -0.45, 2, 0.8);
      // containment and cable ladder
      H(s, X, -0.85, 2, X, -1.3, 2, 0.5); H(s, X, -1.3, 2, X, -1.3, 11, 0.45);
      H(s, X - 0.12 * k, -1.12, 2, X - 0.12 * k, -1.12, 11, 0.5); H(s, X + 0.12 * k, -1.12, 2, X + 0.12 * k, -1.12, 11, 0.4);
      for (z = 2.1; z < 11; z += 0.25) H(s, X - 0.12 * k, -1.12, z, X + 0.12 * k, -1.12, z, 0.25);
    }
    for (z = 2; z <= 11; z++) {
      H(s, -0.9, 1, z, 0.9, 1, z, 0.28); H(s, -0.9, -1.3, z, 0.9, -1.3, z, 0.22);
      if (z < 11 && z % 2 === 0) for (j = -2; j < 2; j++) for (var dd = 0.08; dd < 0.3; dd += 0.075) H(s, j * 0.3 + dd, 1, z + 0.15, j * 0.3 + dd, 1, z + 0.85, 0.12);
    }
    for (j = -2; j <= 2; j++) H(s, j * 0.3, 1, 2, j * 0.3, 1, 11, 0.22);
    H(s, -0.45, -1.3, 2, -0.45, -1.3, 11, 0.2); H(s, 0.45, -1.3, 2, 0.45, -1.3, 11, 0.2);
    for (z = 2.3; z < 11; z += 1) {
      H(s, -0.06, -1.24, z, -0.06, -1.24, z + 0.45, 1); H(s, 0.06, -1.24, z, 0.06, -1.24, z + 0.45, 1);
      H(s, -0.06, -1.24, z, 0.06, -1.24, z, 0.6); H(s, -0.06, -1.24, z + 0.45, 0.06, -1.24, z + 0.45, 0.6);
    }
    H(s, -0.9, -1.3, 11.5, 0.9, -1.3, 11.5, 0.4); H(s, -0.9, 1, 11.5, 0.9, 1, 11.5, 0.4);
    H(s, -0.25, -0.5, 11.5, 0.25, -0.5, 11.5, 0.6); H(s, -0.25, -0.5, 11.5, -0.25, 1, 11.5, 0.6); H(s, 0.25, -0.5, 11.5, 0.25, 1, 11.5, 0.6);
    H(s, 0, -0.5, 11.5, 0, 1, 11.5, 0.35); H(s, -0.12, -0.68, 11.5, 0.12, -0.68, 11.5, 0.8);
    return s;
  })();

  function len3(l, i) { var g = l[i]; return Math.hypot(g[3] - g[0], g[4] - g[1], g[5] - g[2]) || 0.001; }
  function lenH(l, i) { var g = l[i], z1 = -g[2], z2 = -g[5]; return Math.hypot(g[3] / z2 - g[0] / z1, g[4] / z2 - g[1] / z1) * 1.5 + 0.001; } // on-screen length
  function picker(list, len) {
    var acc = [], tot = 0;
    for (var i = 0; i < list.length; i++) { tot += len(list, i); acc.push(tot); }
    return function () { var r = rnd() * tot, i = 0; while (acc[i] < r) i++; return i; };
  }
  var ES = energySegs(0), WS = powerSegs(0);
  var pickE = picker(ES, len3), pickW = picker(WS, len3), pickH = picker(HALL, lenH);
  function onSeg(list, i, u, c) {
    var g = list[i]; proj(c, g[0] + (g[3] - g[0]) * u, g[1] + (g[4] - g[1]) * u, g[2] + (g[5] - g[2]) * u);
    if (o.z) o.a = 0.45 + 0.55 * g[6];
  }
  function hallLed(p) { // two status lights on the left of each server; nearer cabinets get more
    var k = p.r1 < 0.5 ? -1 : 1, r = 2 + Math.floor(Math.pow(p.r2, 1.6) * 9), j = Math.floor(p.r3 * SRV);
    p.lx = 0.9 * k; p.ly = SY0 + j * SH + SH * 0.45; p.lz = -(r + 0.04 + 0.1 + (p.ph < 0.5 ? 0 : 0.035));
  }

  // 4. The Accretion black hole, as in the hero: three turning rings, a breathing core with a cross
  // flare, horizon lines bent by a point-mass lens, and a lensed disk turning around it
  var RINGS = [[0, -0.027, 0.55, 26, 1], [0.023, 0.015, 1, 34, -1], [-0.023, 0.015, 0.55, 30, 1]];
  function lensR(x, y, E) { var b = Math.hypot(x, y) || 0.001, k = (b + Math.sqrt(b * b + 4 * E * E)) / 2 / b; return [x * k, y * k]; }
  function hole(p) {
    var S = BHS, E = 0.44 * S, q = p.r3, pt, rr, ang;
    if (q < 0.32) { // three rings, thick and glowing like the hero's, with a sheen that turns
      var g = RINGS[q < 0.09 ? 0 : q < 0.21 ? 1 : 2], th = (p.r1 - 0.5) * (p.r2 < 0.6 ? 0.012 : 0.07);
      ang = p.ph * 6.2832 + g[4] * T * 6.2832 / g[3];
      o.x = (g[0] + Math.cos(ang) * (0.385 + th)) * S; o.y = (g[1] + Math.sin(ang) * (0.385 + th)) * S;
      o.a = g[2] * (p.r2 < 0.6 ? 1.3 : 0.4) * (0.6 + 0.4 * (0.5 + 0.5 * Math.cos(Math.atan2(o.y, o.x) + 2.36 - T * 0.449)));
    } else if (q < 0.37) {
      var br = 0.5 + 0.5 * Math.sin(T * 1.142);
      rr = Math.pow(p.r1, 2) * 0.07 * S * (1 + 0.5 * br); ang = p.ph * 6.2832;
      o.x = Math.cos(ang) * rr; o.y = Math.sin(ang) * rr; o.a = 0.75 + 0.25 * br;
    } else if (q < 0.41) {
      var u = p.r2 * 2 - 1;
      if (p.r1 < 0.65) { o.x = u * 0.27 * S; o.y = 0; o.a = Math.pow(1 - Math.abs(u), 1.5) * 0.95; }
      else { o.x = 0; o.y = u * 0.115 * S; o.a = Math.pow(1 - Math.abs(u), 1.5) * 0.85; }
    } else {
      // The disk, seen almost edge-on on the hero's three horizon lines. Each particle orbits, so the
      // near side sweeps one way and the far side the other; the lens bends the inner orbits around
      // the ring exactly as the hero's lines bend.
      var lane = p.r2 < 0.55 ? 0 : (p.r2 < 0.775 ? -0.1 : 0.1), Lr = BHL / S;
      rr = 0.62 + Math.pow(p.r1, 1.25) * (Lr - 0.62); ang = p.ph * 6.2832 - T * 0.5 / Math.pow(rr, 1.5);
      var dx = Math.cos(ang) * rr, ax = Math.abs(dx) / Lr;
      pt = lensR(dx * S, (Math.sin(ang) * rr * 0.012 + lane) * S, E);
      o.x = pt[0]; o.y = pt[1];
      o.a = (lane === 0 ? 1 : 0.5) * (ax < 0.4 ? 1 - ax / 0.4 * 0.6 : 0.4 * (1 - (ax - 0.4) / 0.6)) * (0.75 + 0.25 * Math.cos(ang));
    }
  }

  var SCN = [
    function (p) { // flame on the flare tip
      if (p.sub) {
        proj(CAM[0], 0.7, -0.5, -0.05); var bx = o.x, by = o.y, l = (T * 0.55 * (0.7 + p.r3 * 0.6) + p.ph) % 1;
        o.x = bx + (p.r1 - 0.5) * 0.08 * (1 - l * 0.6) + Math.sin(l * 7 + p.ph * 20 + T * 2.2) * 0.03 * l;
        o.y = by - l * 0.5 * (0.7 + p.r2 * 0.6); o.a = Math.pow(1 - l, 0.8); o.z = 1;
      } else onSeg(ES, p.i, p.u, CAM[0]);
    },
    function (p) { // exhaust rising from the stacks
      if (p.sub) {
        var k = p.r3 < 0.5, l = (T * 0.15 + p.ph) % 1;
        proj(CAM[1], k ? -0.72 : -0.48, k ? -0.4 : -0.34, k ? -0.06 : 0.07);
        o.x += Math.sin(l * 5 + p.ph * 10) * 0.04 * (0.3 + l) + l * 0.18; o.y -= l * 0.45; o.a = (1 - l) * 0.4; o.z = 1;
      } else onSeg(WS, p.i, p.u, CAM[1]);
    },
    function (p) { // the hall; status lights blink, activity lights flicker faster
      if (p.led) {
        proj(CAM[2], p.lx, p.ly, p.lz);
        if (o.z) o.a = Math.sin(T * (1 + p.d * 3) * (p.ph < 0.5 ? 1 : 4) + p.c * 30) > -0.2 ? 1.1 : 0.15;
      } else onSeg(HALL, p.i, p.u, CAM[2]);
    },
    hole
  ];

  // ---------- The stream: one route through every scene, in world units ----------
  var RT = [];
  function buildRoute() {
    var r = [], i, S = BHS, E = 0.44 * S;
    function add(x1, y1, x2, y2, vv) { r.push([x1, y1, x2, y2, vv]); }
    function W(k, p) { if (p.length === 3) { proj(CAM[k], p[0], p[1], p[2]); return [POS[k][0] + o.x, POS[k][1] + o.y]; } return [POS[k][0] + p[0], POS[k][1] + p[1]]; }
    function poly(k, pts, vv) { for (var j = 0; j < pts.length - 1; j++) { var a = W(k, pts[j]), b = W(k, pts[j + 1]); add(a[0], a[1], b[0], b[1], vv == null ? 1 : vv * (1 - j / pts.length)); } }
    function jump(k, a, b) { var p = W(k, a), q = W(k, b); add(p[0], p[1], q[0], q[1], 0); }
    function qb(a, m, b, t) { var n = 1 - t; return n * n * a + 2 * n * t * m + t * t * b; }
    function link(k, ex, en) {
      var a = W(k, ex), b = W(k + 1, en), j;
      if (Math.abs(POS[k + 1][1] - POS[k][1]) < 0.01) {
        var my = Math.max(a[1], b[1]) + (Math.abs(a[1] - b[1]) < 0.05 ? 0 : 0.2), mx = (a[0] + b[0]) / 2;
        for (j = 0; j < 14; j++) add(qb(a[0], mx, b[0], j / 14), qb(a[1], my, b[1], j / 14), qb(a[0], mx, b[0], (j + 1) / 14), qb(a[1], my, b[1], (j + 1) / 14), 1);
      } else {
        var gy = POS[k][1] + 0.8, sx = POS[k][0] + 1.3, tx = POS[k + 1][0] - 1.3;
        var pts = [a, [sx, a[1]], [sx, gy], [tx, gy], [tx, b[1]], b];
        for (j = 0; j < pts.length - 1; j++) add(pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1], 1);
      }
    }
    var cab = [[0.65, G - 0.34, 0], [0.985, G - 0.05, -0.08], [0.985, -0.38, -0.08], [1.1, -0.575, -0.1], [1.3, -0.6, -0.1]];
    poly(0, [[0.08, G - 0.17, 0], [0.25, G - 0.17, 0]]);
    jump(0, [0.25, G - 0.17, 0], [0.31, G - 0.04, 0.02]);
    poly(0, [[0.31, G - 0.04, 0.02], [0.31, G, 0.02], [1.15, G, 0.02]]);
    link(0, [1.15, G, 0.02], [-1.12, G - 0.1, 0.12]);
    poly(1, [[-1.12, G - 0.1, 0.12], [-0.95, G - 0.1, 0.12]]);
    jump(1, [-0.95, G - 0.1, 0.12], [0.35, 0.4, 0]);
    poly(1, [[0.35, 0.4, 0], [0.42, 0.4, 0], [0.42, G, 0], [0.47, G, 0]]);
    jump(1, [0.47, G, 0], cab[0]);
    poly(1, cab);
    link(1, cab[4], [-1.0, -1.12, -2]);
    poly(2, [[-1.0, -1.12, -2], [-0.9, -1.12, -2.3], [-0.9, -1.12, -10.8], [0.9, -1.12, -10.8], [0.9, -1.12, -2.3], [1.0, -1.12, -2]]);
    link(2, [1.0, -1.12, -2], [-BHL, 0]);
    poly(3, [[-BHL, 0], [-BHL * 0.75, 0]], 0.8); // the stream fades into the outer disk
    var tot = 0;
    r.forEach(function (g) { tot += Math.hypot(g[2] - g[0], g[3] - g[1]); g.push(tot); });
    r.total = tot; RT = r;
  }
  function routeAt(d) {
    d = ((d % RT.total) + RT.total) % RT.total;
    var lo = 0, hi = RT.length - 1;
    while (lo < hi) { var m = (lo + hi) >> 1; if (RT[m][5] < d) lo = m + 1; else hi = m; }
    var g = RT[lo], l = Math.hypot(g[2] - g[0], g[3] - g[1]) || 1, u = 1 - (g[5] - d) / l;
    o.x = g[0] + (g[2] - g[0]) * u; o.y = g[1] + (g[3] - g[1]) * u; o.a = g[4];
  }

  // ---------- Particles ----------
  function kOf(r) { return r < 0.24 ? 0 : r < 0.46 ? 1 : r < 0.86 ? 2 : r < 0.991 ? 3 : 4; }
  function build() {
    N = innerWidth < 720 ? 12000 : 26000;
    P = [];
    for (var i = 0; i < N; i++) {
      var k = kOf(rnd()), p = { k: k, r1: rnd(), r2: rnd(), r3: rnd(), ph: rnd(), d: rnd(), c: rnd() * 2 - 1, u: rnd(), sub: 0, i: 0,
        s: k === 4 ? 1.2 + rnd() * 0.5 : k === 3 ? 1.1 + rnd() * 1.2 : 0.7 + rnd() * 0.8, sx: rnd(), sy: rnd() };
      if (k === 0) { p.sub = rnd() < 0.2 ? 1 : 0; p.i = pickE(); }
      if (k === 1) { p.sub = rnd() < 0.08 ? 1 : 0; p.i = pickW(); }
      if (k === 2) { p.led = rnd() < 0.2; if (p.led) hallLed(p); else p.i = pickH(); }
      P.push(p);
    }
    for (var b = 0, nb = innerWidth < 720 ? 700 : 1600; b < nb; b++) P.push({ k: 5, r3: rnd(), ph: rnd(), sx: rnd(), sy: rnd(), s: 0.8 + rnd() * 1.2 });
    N = P.length;
  }

  function size() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bl.width = Math.max(1, Math.round(w / 3)); bl.height = Math.max(1, Math.round(h / 3));
    wide = w >= 900;
    if (MODE === 'pan') {
      POS = [[0, 0], [2.9, 0], [5.8, 0], [8.95, 0]]; BHS = 0.6; BHL = 1.5;
      if (wide) { cx = w * 0.7; cy = h * 0.55; R = Math.min(w * 0.19, h * 0.3); }
      else { cx = w * 0.5; cy = h * 0.66; R = Math.min(w * 0.4, h * 0.22); }
    } else if (w >= 720) {
      POS = [[0, 0], [2.6, 0], [5.2, 0], [8.0, 0]]; BHS = 0.5; BHL = 1.3;
      var span = 8.0 + 1.35 + 1.15;
      R = Math.min((w * 0.94) / span, h * 0.17);
      cx = w / 2 - ((8.0 + 1.35 - 1.15) / 2) * R; cy = h * 0.67;
    } else {
      POS = [[0, 0], [0, 1.95], [0, 3.95], [0, 5.35]]; BHS = 0.45; BHL = 1.15;
      var top = textEl.getBoundingClientRect().bottom + 16, avail = Math.max(h * 0.45, h - top - 16); top = Math.min(top, h * 0.55);
      R = Math.min(w * 0.38, avail / 7.4); cx = w / 2; cy = top + 1.1 * R;
    }
    buildRoute();
    var c = (getComputedStyle(sec).backgroundColor.split('(')[1] || '0,0,0)').split(')')[0].split(',');
    bg = 'rgba(' + (+c[0]) + ',' + (+c[1]) + ',' + (+c[2]) + ',';
    light = (+c[0] + +c[1] + +c[2]) / 3 > 128;
    ctx.fillStyle = bg + '1)'; ctx.fillRect(0, 0, w, h);
  }

  function scatter(p) {
    o.x = p.sx * w + Math.sin(T * 0.15 + p.ph * 6) * 16; o.y = p.sy * h + Math.cos(T * 0.12 + p.ph * 5) * 16;
    o.a = 0.2 + 0.5 * p.r3 * (0.6 + 0.4 * Math.sin(T * 1.3 + p.ph * 40));
  }

  function draw() {
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = bg + '1)'; ctx.fillRect(0, 0, w, h);
    var s = Math.min(3, Math.floor(vs)), f = vs - s, t = smooth((f - 0.2) / 0.6);
    if (vs >= 4) { s = 3; t = 1; }
    var gather = s === 0 ? t : 1, cam = Math.max(0, s - 1 + t);
    if (MODE === 'pan') {
      var c0 = Math.min(2, Math.floor(cam)), cf = cam - c0;
      ox = cx - (POS[c0][0] + (POS[c0 + 1][0] - POS[c0][0]) * cf) * R; oy = cy;
    } else { ox = cx; oy = cy; }
    var wk = [1, 1, 1, 1];
    if (MODE === 'all') {
      var mix = smooth((vs - 0.75) / 0.5);
      for (var q = 0; q < 4; q++) wk[q] = 1 - mix * 0.5 * (1 - smooth(1 - Math.abs(vs - (q + 1.1)) * 1.4));
    }
    var hx = ox + POS[3][0] * R, hy = oy + POS[3][1] * R, gs = MODE === 'pan' ? smooth((cam - 2.2) / 0.8) : 0.7 * wk[3] * gather;
    if (gs > 0.01) {
      var gr = ctx.createRadialGradient(hx, hy, 0, hx, hy, R * 1.2);
      gr.addColorStop(0, (light ? 'rgba(0,0,0,' : 'rgba(255,255,255,') + (0.05 * gs).toFixed(3) + ')'); gr.addColorStop(1, light ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0)');
      ctx.fillStyle = gr; ctx.fillRect(hx - R * 1.3, hy - R * 1.3, R * 2.6, R * 2.6);
    }
    ctx.globalCompositeOperation = light ? 'source-over' : 'lighter';
    ctx.fillStyle = light ? '#000' : '#fff';
    ES = energySegs(T); WS = powerSegs(T);
    var tr = wide && MODE === 'pan' ? textEl.getBoundingClientRect().right : -1e9, fw = R * 0.6, am = light ? 0.85 : 1;
    var sp = 0.5, flowing = gather >= 1;
    for (var i = 0; i < N; i++) {
      var p = P[i], k = p.k, x, y, a, edge = true, sz = p.s;
      if (k >= 4) {
        if (k === 4) {
          if (!flowing) continue;
          var d0 = T * sp + p.ph * RT.total;
          for (var j = 1; j >= 0; j--) {
            routeAt(d0 - j * 0.035);
            if (!o.a) continue;
            var tx = ox + o.x * R, ty = oy + o.y * R;
            if (tx < -4 || tx > w + 4 || ty < -4 || ty > h + 4) continue;
            var ta = (1 - j * 0.5) * 0.45;
            if (tx < tr + fw) ta *= Math.max(0, (tx - tr) / fw);
            if (ta < 0.02) continue;
            ctx.globalAlpha = ta * am; ctx.fillRect(tx, ty, p.s, p.s);
          }
          continue;
        }
        scatter(p); x = o.x; y = o.y; a = o.a * 0.8; edge = false; // background dust, always drifting
      } else {
        SCN[k](p); x = ox + (POS[k][0] + o.x) * R; y = oy + (POS[k][1] + o.y) * R; a = o.a * wk[k];
        if (k < 3) { if (!o.z) continue; sz *= Math.max(0.6, Math.min(1.4, o.z)); a *= Math.max(0.4, Math.min(1.15, Math.pow(o.z, 0.45))); }
        if (gather < 1 && (MODE === 'all' || k === 0)) {
          var gx = x, gy = y, ga = a, e = ease(Math.max(0, Math.min(1, (gather - p.d * 0.35) / 0.65)));
          scatter(p);
          var dx = gx - o.x, dy = gy - o.y, cu = Math.sin(Math.PI * e) * p.c * 0.3;
          x = o.x + dx * e - dy * cu; y = o.y + dy * e + dx * cu; a = o.a + (ga - o.a) * e;
          edge = e > 0.5;
        } else if (gather < 1) continue;
      }
      if (x < -4 || x > w + 4 || y < -4 || y > h + 4) continue;
      if (edge && x < tr + fw) a *= Math.max(0, (x - tr) / fw);
      if (a < 0.02) continue;
      ctx.globalAlpha = Math.min(1, a * 1.25) * am;
      ctx.fillRect(x, y, sz, sz);
    }
    ctx.globalAlpha = 1;
    // Bloom: a blurred, scaled-down copy laid over the frame so the particles glow
    if (!light) {
      bctx.globalCompositeOperation = 'copy'; bctx.drawImage(canvas, 0, 0, bl.width, bl.height);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.85; ctx.filter = 'blur(3px)';
      ctx.drawImage(bl, 0, 0, w, h); ctx.restore();
    }
  }

  function target() {
    var r = track.getBoundingClientRect(), room = r.height - innerHeight;
    v = Math.max(0, Math.min(1, -r.top / room)) * 4.15;
    var s = Math.min(3, Math.floor(v)), f = v - s, now = v >= 4 ? 4 : (f > 0.5 ? s + 1 : s);
    if (now !== shown) { shown = now; steps.forEach(function (el, i) { el.classList.toggle('now', i === now); }); }
  }
  function frame(t) {
    raf = 0;
    var dt = Math.min(0.05, (t - last) / 1000 || 0); last = t;
    if (!still) T += dt;
    vs += (v - vs) * (still ? 1 : 1 - Math.exp(-dt * 7));
    draw();
    if (visible) raf = requestAnimationFrame(frame);
  }
  function kick() { if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  build(); size(); target(); vs = v;
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { size(); kick(); });
  new IntersectionObserver(function (en) { visible = en[0].isIntersecting; kick(); }).observe(sec);
  addEventListener('scroll', function () { target(); if (still) kick(); }, { passive: true });
  addEventListener('resize', function () { size(); target(); kick(); });
  document.addEventListener('ac-theme', function () { requestAnimationFrame(function () { size(); kick(); }); });
})();

// Site check (partners page): five questions, one at a time, then a verdict with the reasons.
(function () {
  var form = document.querySelector(".fit-form"), out = document.querySelector(".fit-out");
  if (!form || !out) return;
  var qs = [].slice.call(form.querySelectorAll(".fit-q")), back = form.querySelector(".fit-back");
  var count = form.querySelector(".fit-count"), bar = form.querySelector(".fit-bar i");
  var at = 0, A = {};
  function live() { return qs.filter(function (q) { return !(q.dataset.skip && A.src === q.dataset.skip); }); }
  function show() {
    var L = live(), n = L.indexOf(qs[at]);
    qs.forEach(function (q, i) { q.classList.toggle("now", i === at); });
    count.textContent = (n + 1) + " of " + L.length;
    bar.style.width = ((n + 1) / L.length * 100) + "%";
    back.disabled = n === 0;
  }
  function step(d) {
    var L = live(), n = L.indexOf(qs[at]) + d;
    if (n >= L.length) return finish();
    at = qs.indexOf(L[Math.max(0, n)]); show();
  }
  form.addEventListener("change", function (e) {
    A[e.target.name] = e.target.value;
    setTimeout(function () { step(1); }, 260);
  });
  back.addEventListener("click", function () { step(-1); });

  // Reads the answers. A gap that would end a project wins; open questions come next; otherwise it fits.
  function judge() {
    var no = [], ask = [], good = [];
    if (A.src === "flare") no.push("Flare and stranded gas tend to fall off over time, and AI tenants need power for the full length of a lease. Sites like this are often a better match for Bitcoin mining, which our sister company <a href=\"https://protonminingco.com/\">Proton Mining</a> runs.");
    else if (A.src === "none") ask.push("There is no energy on the site yet. Land alone can still work if firm gas or an industrial supply is close by, and that is something we would look into together.");
    else good.push({ pipe: "Pipeline gas is the kind of firm supply we build on.", gather: "Gathering-system gas can work well, especially with a backup supply path.", landfill: "Landfill gas is steady methane that can be turned into power on site.", industrial: "Existing industrial sites often already have power, permits and infrastructure." }[A.src]);
    if (A.steady === "varies") no.push("A supply that varies or declines is hard to plan a multi-year AI lease around.");
    else if (A.steady === "unsure") ask.push("We would need to confirm how steady the supply is, usually from production or delivery records.");
    else if (A.steady === "steady") good.push("The supply is steady. A long-term agreement would be the next thing to put in place.");
    else if (A.steady === "firm") good.push("A steady supply that can be contracted for years is the most important thing we look for.");
    if (A.fiber === "near") good.push("Fiber close by means the site can be connected without years of construction.");
    else ask.push(A.fiber === "far" ? "Fiber further away can sometimes be reached. We would map the routes and what it takes to connect." : "We can map the nearest fiber routes for you.");
    if (A.land === "none") ask.push("The land would need an owner willing to lease or sell. We can help find out who that is.");
    else if (A.land === "tight") ask.push("A tight site can limit how far it grows. We would check whether there is room for a first phase.");
    else good.push(A.land === "room" ? "Room to grow means a second phase would not need a second site." : "Leased land works, as long as the term matches the length of a tenant's lease.");
    if (A.access === "season") ask.push("Seasonal roads make building and running a site harder. We would look at what it would take to reach it all year.");
    else if (A.access === "unsure") ask.push("We would check road access for construction, deliveries and staff.");
    else good.push("Year-round access keeps construction and operations on schedule.");
    var tag, verdict;
    if (no.length) { tag = "Probably not yet"; verdict = "Probably not a fit for AI capacity yet."; }
    else if (ask.length) { tag = "Worth a closer look"; verdict = "Worth a conversation. A few things to check first."; }
    else { tag = "Looks like a good fit"; verdict = "This looks like a good fit. Let's talk."; }
    return { tag: tag, verdict: verdict, why: no.concat(ask, good) };
  }
  function finish() {
    var r = judge();
    out.querySelector(".fit-tag").textContent = r.tag;
    out.querySelector(".fit-verdict").textContent = r.verdict;
    out.querySelector(".fit-why").innerHTML = r.why.map(function (t) { return "<li>" + t + "</li>"; }).join("");
    form.hidden = true; out.hidden = false;
    out.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  out.querySelector(".fit-again").addEventListener("click", function () {
    form.reset(); A = {}; at = 0; show(); out.hidden = true; form.hidden = false;
  });
  show();
})();
