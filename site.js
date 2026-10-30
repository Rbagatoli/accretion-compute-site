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
    // A click anywhere on the switch (either dot, the gap or the rim) flips to the other colour.
    [].slice.call(document.querySelectorAll('.mode')).forEach(function (m) {
      m.addEventListener('click', function () {
        var t = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
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

    // Remember, for this tab only, the first page of the visit and the site that linked here. The contact form
    // adds it to the email, where the visitor can see it before sending. Cleared when the tab closes.
    var visit = null;
    try {
      visit = JSON.parse(sessionStorage.getItem('ac-visit') || 'null');
      if (!visit) {
        var ref = '';
        try { var r = new URL(document.referrer); if (r.hostname !== location.hostname) ref = r.hostname.replace(/^www\./, ''); } catch (err) {}
        var q = new URLSearchParams(location.search);
        visit = { page: location.pathname, from: ref || (q.get('utm_source') || '') };
        sessionStorage.setItem('ac-visit', JSON.stringify(visit));
      }
    } catch (err) { visit = null; }

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
        if (visit) lines.push('', '--', 'How you found us: ' + (visit.from || 'direct') + ', first page ' + visit.page);
        var to = form.getAttribute('data-mail-to');
        var subject = 'Accretion Compute enquiry: ' + about;
        window.location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
        var note = form.querySelector('[data-mail-note]');
        if (note) note.hidden = false;
      });
    }
  });
})();

// Can canvas blur("filter") really blur here? Some browsers accept the property but ignore it, which turns the
// soft glow passes into hard white shapes. So blur one pixel and check that it spread; if not, skip those passes.
var acCanBlur = (function () {
  try {
    var c = document.createElement("canvas"); c.width = c.height = 9;
    var x = c.getContext("2d"); if (typeof x.filter !== "string") return false;
    x.filter = "blur(2px)"; x.fillRect(4, 4, 1, 1);
    return x.getImageData(2, 4, 1, 1).data[3] > 0;
  } catch (e) { return false; }
})();
// Safari (every iPhone browser is Safari underneath) can draw a soft canvas shadow as a solid white box,
// so the story's shadow glow is switched off there and the lines stay crisp.
var acNoShadow = (function () {
  var ua = navigator.userAgent || "";
  return /iP(hone|ad|od)/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ||
    (/Safari\//.test(ua) && !/Chrome|Chromium|Edg|OPR|Android/.test(ua));
})();

// The brand symbol (same geometry as the logo SVGs), with slowly turning rings. Used by the hero and "Three ways in".
var acSymbol = (function () {
  var uid = 0;
  return function symbol(tone) {
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
  };
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

    // An opposite-colour copy of the hero, laid on top and shown only under a soft curve (the curve is the
    // layer's CSS mask). It shares this canvas's drawing and the logo's pulse, so both copies move as one.
    var alt = null, altCanvas = null, actx = null, altLogo = null, altParts = null;
    if (hero.hasAttribute('data-hero-alt')) {
      alt = document.createElement('div'); alt.className = 'hero-alt'; alt.setAttribute('aria-hidden', 'true'); alt.inert = true;
      altCanvas = document.createElement('canvas'); altCanvas.className = 'hero-canvas'; alt.appendChild(altCanvas);
      var inner = hero.querySelector('.hero-in').cloneNode(true); alt.appendChild(inner);
      [].slice.call(alt.querySelectorAll('a, [id]')).forEach(function (n) { n.removeAttribute('id'); n.setAttribute('tabindex', '-1'); });
      hero.appendChild(alt); actx = altCanvas.getContext('2d'); altLogo = inner.querySelector('.alogo');
    }
    function opposite(t) { return t === 'dark' ? 'light' : 'dark'; }

    // The curve and the fade into the next section. w, d: the curve's size (% of the hero); s: its softness (%);
    // y: its centre (% of the hero, above the top); u: where the fade starts (px above the hero's edge);
    // t: how far it runs into the next section (px).
    var CURVE = { w: 123, d: 211, s: 23, y: -61, u: 190, t: 310 };
    var band = alt && hero.nextElementSibling, heroCue = hero.querySelector(':scope > .hero-cue');
    function ss(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
    function sss(x) { x = Math.max(0, Math.min(1, x)); return x * x * x * (x * (x * 6 - 15) + 10); }
    // Lightness L* (0-100) to a 0-1 screen value, so the fade looks even to the eye.
    function lstar(L) { var Y = L > 8 ? Math.pow((L + 16) / 116, 3) : L / 903.3; return Y <= 0.0031308 ? 12.92 * Y : 1.055 * Math.pow(Y, 1 / 2.4) - 0.055; }
    function bowl(inv, shape) {
      var a = 100 - CURVE.s, st = [];
      for (var i = 0; i <= 12; i++) { var e = ss(i / 12); st.push('rgba(0,0,0,' + (inv ? 1 - e : e).toFixed(4) + ') ' + (a + CURVE.s * i / 12).toFixed(2) + '%'); }
      return 'radial-gradient(' + shape + ', ' + st.join(', ') + ')';
    }
    function curve() {
      // On shorter screens the content sits nearer the edge, so the fade starts lower, just under the content.
      var gap = hero.getBoundingClientRect().bottom - hero.querySelector('.hero-in').getBoundingClientRect().bottom;
      var W = hero.offsetWidth, H = hero.offsetHeight, u = Math.round(Math.min(CURVE.u, Math.max(40, gap - 20))), t = CURVE.t, total = u + t, st = [];
      // The copy shows under the curve, and is solid below u px (the fade layer covers that part).
      hero.style.setProperty('--alt-mask', bowl(false, 'ellipse ' + CURVE.w + '% ' + CURVE.d + '% at 50% ' + CURVE.y + '%') + ', linear-gradient(to top, #000 ' + u + 'px, transparent ' + u + 'px)');
      hero.style.setProperty('--alt-dust', 'linear-gradient(to top, transparent ' + (u + 40) + 'px, #000 ' + (u + 220) + 'px)');
      if (!band) return;
      // The fade layer: one curve, eased in lightness, from the hero's colour at u px above the edge
      // to the next section's colour t px into it. Where the curve already shows the copy, it is cut away.
      for (var i = 0; i <= 60; i++) { var p = total * i / 60; st.push('rgba(0,0,0,' + (1 - lstar(100 * sss(p / total))).toFixed(4) + ') ' + p.toFixed(1) + 'px'); }
      var cy = CURVE.y / 100 * H - (H - u);
      band.style.setProperty('--veil', 'linear-gradient(' + st.join(', ') + '), ' + bowl(true, 'ellipse ' + (CURVE.w / 100 * W).toFixed(1) + 'px ' + (CURVE.d / 100 * H).toFixed(1) + 'px at 50% ' + cy.toFixed(1) + 'px'));
      band.style.setProperty('--veil-up', u + 'px'); band.style.setProperty('--veil-down', t + 'px');
      band.classList.add('hero-veil');
      // The scroll cue sits 30px under the hero content. It moves into the next section's layer so the fade can't cover it.
      if (heroCue) {
        if (heroCue.parentNode !== band) band.appendChild(heroCue);
        heroCue.style.top = -Math.max(gap - 30, heroCue.offsetHeight + 16) + 'px';
      }
    }

    var symbol = acSymbol;

    // Sizes are in symbol widths (S). Every point is pushed outward by a point-mass lens,
    // so the horizon and the dust bend around the logo instead of passing through it.
    var INK = { dark: [243, 244, 246], light: [11, 12, 14] };
    var LINES = [0, -0.1, 0.1], REACH = 2.6, GRAINS = innerWidth < 720 ? 110 : 240;
    // The accretion disk (horizon lines and the grains on them) is kept dim so it sits behind the logo.
    var DISK = 0.5;
    // The orbiting grains and the particles falling in are a little brighter than the lines.
    var SPARK = 2.1;
    var w, h, cx, cy, S, E, ink, on = false, last = 0, energy = 0, halo, core, glows;
    // The visitor's pointer acts as a small second mass; clicks make the core flare.
    var ptr = { x: 0, y: 0, tx: 0, ty: 0, inf: 0, want: 0 }, sym;

    function grain(fresh) {
      var life = 6 + Math.random() * 8;
      return { r: 0.5 + Math.random() * (fresh ? 1.1 : 0.35), a: Math.random() * 6.2832, v: 0.02 + Math.random() * 0.05,
        y: (Math.random() - 0.5) * 0.05, s: 0.3 + Math.random() * 0.4, o: 0.4 + Math.random() * 0.5, life: life, t: fresh ? Math.random() * life : 0 };
    }
    var dust = [];
    for (var i = 0; i < GRAINS; i++) dust.push(grain(true));
    // Background dust drifting across the whole hero, like the story section's, but sparser.
    var motes = [];
    for (i = 0; i < (innerWidth < 720 ? 80 : 175); i++) motes.push({ x: Math.random(), y: Math.random(), ph: Math.random(), o: Math.random(), s: 0.8 + Math.random() * 1.25 });
    var runners = [];
    for (i = 0; i < 8; i++) runners.push({ u: Math.random(), sp: 0.2 + Math.random() * 0.1, o: 0.4 + Math.random() * 0.2 });
    // A few fine particles fall in from around the hero, spiral down and join the orbit as dust.
    function faller(wait) {
      var far = Math.max(w || innerWidth, h || 600) * 0.6 / (S || 200);
      return { r: far * (0.7 + Math.random() * 0.3), rt: 0.5 + Math.random() * 0.35, a: Math.random() * 6.2832,
        s: 0.5 + Math.random() * 0.3, o: 0.7 + Math.random() * 0.3, t: -wait, trail: [] };
    }
    var fallers = [];

    function mount() {
      logo.innerHTML = symbol(theme) + '<div class="wm"></div>';
      var s = logo.querySelector('.sym');
      sym = s; halo = s.querySelector('.halo'); core = s.querySelector('.core'); glows = [].slice.call(s.querySelectorAll('.glow'));
      if (altLogo) {
        altLogo.innerHTML = symbol(opposite(theme)) + '<div class="wm"></div>';
        var a = altLogo.querySelector('.sym');
        altParts = { sym: a, halo: a.querySelector('.halo'), core: a.querySelector('.core'), glows: [].slice.call(a.querySelectorAll('.glow')) };
      }
    }
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2), hr = hero.getBoundingClientRect();
      var c = logo.querySelector('.sym .core').getBoundingClientRect(), sym = logo.querySelector('.sym').getBoundingClientRect();
      w = hr.width; h = hr.height; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (altCanvas) { altCanvas.width = canvas.width; altCanvas.height = canvas.height; curve(); }
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
        var a = (0.27 + 0.48 * m.o * (0.6 + 0.4 * Math.sin(t * 1.3 + m.ph * 40))) * (theme === 'dark' ? 1 : 0.78);
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
        var main = off === 0, base = (main ? 0.5 : 1) * glow * (theme === 'dark' ? 1 : 0.85);
        ctx.beginPath();
        for (var x = -L, n = 0; x <= L; x += 1.5, n++) { var p = pull(lens(x, off * S), 0.035); n ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
        if (acCanBlur) { ctx.save(); ctx.strokeStyle = grad(Math.min(1, base * 3.6) * DISK); ctx.lineWidth = main ? 1.3 : 1; ctx.filter = 'blur(0.8px)'; ctx.stroke(); ctx.restore(); }
        // The line is drawn soft, about two screen pixels wide and faint, so it never snaps from one pixel row to
        // the next (a hairline does, and shows as steps along the curve). Its strength matches the old hairline.
        var dp = Math.min(window.devicePixelRatio || 1, 2), hw = (main ? 0.32 : 0.23) * dp, a1 = Math.min(1, base * 2.8) * Math.min(1, hw);
        ctx.strokeStyle = grad((1 - Math.pow(1 - a1, 4)) / 1.3 * DISK); ctx.lineWidth = 1.8 / dp; ctx.stroke();
      });
      energy = Math.max(energy, 0.45 * breathe);

      // A few grains circle the logo on flat, lensed orbits, drift outward, fade and are reborn near the ring.
      var dim = (theme === 'dark' ? 1 : 0.8) * DISK;
      ctx.fillStyle = rgba(1);
      dust.forEach(function (p, k) {
        p.t += dt; if (p.t > p.life) { p = dust[k] = grain(false); }
        p.a -= dt * 0.8 / Math.pow(p.r, 1.5); p.r += dt * p.v;
        var q = pull(lens(Math.cos(p.a) * p.r * S, Math.sin(p.a) * p.r * S * 0.22 + p.y * S), 0.1);
        var edge = Math.max(0, 1 - Math.abs(q[0] - cx) / L);
        var a = Math.sin(Math.PI * p.t / p.life) * p.o * edge * clearAt(q[1]) * dim * SPARK * (0.8 + 0.2 * breathe);
        if (a < 0.01) return;
        ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(q[0], q[1], p.s, 0, 6.2832); ctx.fill();
      });
      if (!fallers.length) for (i = 0; i < (innerWidth < 720 ? 4 : 7); i++) fallers.push(faller(Math.random() * 4));
      fallers.forEach(function (p, k) {
        p.t += dt; if (p.t < 0) return;
        // Round paths far out (so they come from every side), flattening onto the disk as they arrive.
        p.r -= dt * (0.35 + 0.35 * (p.r - p.rt)); p.a -= dt * 0.8 / Math.pow(Math.max(p.r, 0.3), 1.5);
        var f = 0.22 + 0.78 * smooth((p.r - p.rt) / 1.6);
        var q = pull(lens(Math.cos(p.a) * p.r * S, Math.sin(p.a) * p.r * S * f), 0.1);
        p.trail.unshift(q); if (p.trail.length > 12) p.trail.pop();
        if (p.r - p.rt < 0.02) {
          // Arrived: it becomes one of the orbiting grains, replacing whichever grain is faintest right now.
          var j = 0, lo = 2;
          dust.forEach(function (g, n) { var v = Math.sin(Math.PI * g.t / g.life); if (v < lo) { lo = v; j = n; } });
          var g = grain(false); g.r = p.rt; g.a = p.a; g.s = p.s; g.o = p.o; g.t = g.life * 0.5; dust[j] = g;
          fallers[k] = faller(1 + Math.random() * 5); return;
        }
        var a0 = p.o * Math.min(1, p.t / 1.2) * dim * SPARK * (0.8 + 0.2 * breathe);
        for (var m = 0; m < p.trail.length; m += 2) {
          var c = p.trail[m], a = a0 * (1 - m / 12) * clearAt(c[1]);
          if (a < 0.01) continue;
          ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(c[0], c[1], m ? p.s * 0.6 : p.s, 0, 6.2832); ctx.fill();
        }
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
      halo.style.opacity = (0.22 + 0.45 * e).toFixed(3); halo.style.transform = 'scale(' + (1 + 0.6 * e).toFixed(3) + ')';
      core.style.transform = 'scale(' + (1 + 0.25 * e).toFixed(3) + ')';
      glows.forEach(function (g) { g.style.opacity = (0.05 + 0.12 * e).toFixed(3); });
      // The symbol tips gently toward the pointer.
      var nx = Math.max(-1, Math.min(1, (ptr.x - cx) / (w * 0.5))), ny = Math.max(-1, Math.min(1, (ptr.y - cy) / (h * 0.5)));
      sym.style.transform = ptr.inf < 0.002 ? '' : 'perspective(700px) rotateX(' + (-ny * 2 * ptr.inf * calm()).toFixed(2) + 'deg) rotateY(' + (nx * 2 * ptr.inf * calm()).toFixed(2) + 'deg)';
      if (actx && altParts) {
        altParts.halo.style.opacity = halo.style.opacity; altParts.halo.style.transform = halo.style.transform;
        altParts.core.style.transform = core.style.transform; altParts.sym.style.transform = sym.style.transform;
        altParts.glows.forEach(function (g, n) { if (glows[n]) g.style.opacity = glows[n].style.opacity; });
        var o = INK[opposite(theme)];
        actx.setTransform(1, 0, 0, 1, 0, 0); actx.globalCompositeOperation = 'source-over';
        actx.clearRect(0, 0, altCanvas.width, altCanvas.height); actx.drawImage(canvas, 0, 0);
        actx.globalCompositeOperation = 'source-in'; actx.fillStyle = 'rgb(' + o.join(',') + ')';
        actx.fillRect(0, 0, altCanvas.width, altCanvas.height); actx.globalCompositeOperation = 'source-over';
      }
    }
    function loop(t) { if (!on) return; var dt = Math.min(0.05, (t - last) / 1000 || 0); last = t; frame(dt, t / 1000); requestAnimationFrame(loop); }

    // Follow the site colour switch
    document.addEventListener('ac-theme', function (ev) { theme = ev.detail === 'dark' ? 'dark' : 'light'; mount(); size(); if (still) frame(0, 0); });

    // Click or tap: the core flares and the dust is pushed out. The mouse itself has no effect.
    // Phones that allow it without asking (most Android): tilting the phone moves the pull.
    if (!still) {
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
    // Re-measure when anything in the hero changes height (fonts, text, layout), so the disk stays on the logo.
    var refit = function () { size(); if (still) frame(0, 0); };
    if ('ResizeObserver' in window) new ResizeObserver(refit).observe(hero.querySelector('.hero-in') || hero);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
    if (still || !('IntersectionObserver' in window)) { frame(0, 0); return; }
    new IntersectionObserver(function (en) {
      var was = on; on = en[0].isIntersecting;
      if (on && !was) { last = performance.now(); requestAnimationFrame(loop); }
    }).observe(hero);
  });
})();

// Home "Three ways in": gas leaves the three cards and falls into a small, quiet copy of the brand symbol below
// the middle card. Real accretion: each parcel starts with some spin, settles into a tipped disk, loses its spin
// there and spirals in, dimming as it goes; the near side of the disk passes in front of the symbol.
// On every screen size (stacked cards get the hole on top). Follows the site's black/white toggle.
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var sec = document.querySelector('.fl');
    var cv = sec && sec.querySelector('.fl-cv'), fv = sec && sec.querySelector('.fl-front'), box = sec && sec.querySelector('.fl-sym');
    var grid = sec && sec.querySelector('.grid');
    if (!cv || !cv.getContext || !fv || !box || !grid) return;
    var cards = [].slice.call(grid.querySelectorAll('.card'));
    if (cards.length !== 3) return;
    var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var ctx = cv.getContext('2d'), ftx = fv.getContext('2d');
    // Strength of the whole effect: the symbol, its horizon lines and the gas all turn down together.
    var Q = +sec.getAttribute('data-q') || 1;
    var NP = +sec.getAttribute('data-n') || 200;
    function smooth(v) { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); }

    var INK, halo, core, glows;
    function tone() {
      // the section takes the page background, which flips with the theme
      var h = getComputedStyle(sec).getPropertyValue('--bg').trim().replace('#', '');
      if (h.length === 3) h = h.replace(/./g, '$&$&');
      var lum = (parseInt(h.slice(0, 2), 16) + parseInt(h.slice(2, 4), 16) + parseInt(h.slice(4, 6), 16)) / 3;
      var T = isNaN(lum) || lum > 128 ? 'light' : 'dark';
      INK = T === 'light' ? [11, 12, 14] : [243, 244, 246];
      box.innerHTML = acSymbol(T);
      box.style.opacity = Q >= 1 ? '' : Q >= 0.6 ? 0.55 + 0.45 * Q : 0.82 * Math.pow(Q / 0.6, 0.8);
      halo = box.querySelector('.halo'); core = box.querySelector('.core'); glows = [].slice.call(box.querySelectorAll('.glow'));
    }
    function rgba(al) { return 'rgba(' + INK[0] + ',' + INK[1] + ',' + INK[2] + ',' + Math.max(0, al).toFixed(3) + ')'; }

    var stacked = false, W, H, cx, cy, S, E, L, src = [], on = false, last = 0, energy = 0, seeded = false;
    function size() {
      if (getComputedStyle(cv).display === 'none') return false;
      var r = sec.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2); W = r.width; H = r.height;
      [cv, fv].forEach(function (c) { c.width = W * dpr; c.height = H * dpr; });
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ftx.setTransform(dpr, 0, 0, dpr, 0, 0); measure(); return true;
    }
    // Side by side: the symbol sits centred under the middle card, clear of it by about its own width; cards are
    // taken left to right as they appear on screen (the CSS reorders them), not in source order.
    // Stacked (narrow screens): the symbol sits centred above the first card, in the gap under the heading.
    function measure() {
      var r = sec.getBoundingClientRect();
      src = cards.map(function (c) { var k = c.getBoundingClientRect(); return { l: k.left - r.left, r: k.right - r.left, t: k.top - r.top, b: k.bottom - r.top }; });
      stacked = Math.abs(src[0].l - src[1].l) < 8;
      src.sort(stacked ? function (a, b) { return a.t - b.t; } : function (a, b) { return a.l - b.l; });
      var m = stacked ? src[0] : src[1];
      S = box.querySelector('.sym').getBoundingClientRect().width;
      cx = (m.l + m.r) / 2; cy = stacked ? m.t - Math.max(72, S * 1.2) : m.b + Math.max(100, S * 1.1);
      box.style.left = cx + 'px'; box.style.top = cy + 'px';
      E = 0.44 * S; L = Math.min(2.8 * S, W * 0.46);
    }
    // Point-mass lens: the far side of the disk is bent up and over the hole.
    function lens(x, y, w) { var b = Math.hypot(x, y) || 0.001, k = (b + Math.sqrt(b * b + 4 * E * E)) / 2 / b; k = 1 + (k - 1) * w; return [cx + x * k, cy + y * k]; }

    // Units are symbol widths. X right, Y up out of the disk, Z away from the viewer; the disk is tipped toward us a little.
    var GM = 12, TILT = 0.22, CT = Math.sqrt(1 - TILT * TILT), RIN = 0.36;
    function scr(X, Y, Z) { return [X * S, (-Y * CT - Z * TILT) * S]; }
    // Where gas leaves each card, as [edge, from, to] in fractions along that edge: the left card's lower-right
    // corner, the middle of the middle card's bottom, the right card's lower-left corner.
    var ZONES = [[['b', 0.56, 1], ['r', 0.55, 1]], [['b', 0.13, 0.88]], [['b', 0, 0.44], ['l', 0.55, 1]]];
    // stacked: the top card sheds gas from its top edge and the upper part of its sides; the two below, up both side lanes
    var ZSTACK = [[['t', 0, 1], ['l', 0, 0.7], ['r', 0, 0.7]], [['l', 0, 1], ['r', 0, 1]], [['l', 0, 1], ['r', 0, 1]]];
    function spawn(delay) {
      var ci = Math.floor(Math.random() * 3), k = src[ci], zones = (stacked ? ZSTACK : ZONES)[ci], sx, sy, nx = 0, ny = 0;
      var len = zones.map(function (z) { return (z[2] - z[1]) * (z[0] === 'b' || z[0] === 't' ? k.r - k.l : k.b - k.t); });
      var pick = Math.random() * len.reduce(function (a, b) { return a + b; }, 0), zi = 0;
      while (zi < len.length - 1 && pick >= len[zi]) { pick -= len[zi]; zi++; }
      var z = zones[zi], f = z[1] + Math.random() * (z[2] - z[1]);
      if (z[0] === 'b') { sx = k.l + f * (k.r - k.l); sy = k.b + 4; ny = 1; }
      else if (z[0] === 't') { sx = k.l + f * (k.r - k.l); sy = k.t - 4; ny = -1; }
      else { sx = z[0] === 'r' ? k.r + 4 : k.l - 4; sy = k.t + f * (k.b - k.t); nx = z[0] === 'r' ? 1 : -1; }
      var Z = (0.5 + Math.random() * 1.6) * (Math.random() < 0.5 ? -1 : 1), X = (sx - cx) / S, Y = ((cy - sy) / S - Z * TILT) / CT;
      // each parcel carries some spin, all the same way round; capped below orbital speed so none is flung away
      var rho = Math.hypot(X, Z), rc = 0.7 + Math.random() * 1.3, vt = Math.min(Math.sqrt(GM * rc) / rho, 0.8 * Math.sqrt(GM / Math.hypot(X, Y, Z)));
      var push = 0.25 + Math.random() * 0.3;
      // stacked, the lanes are narrow: little spin, and gas rises straight up them until it nears the hole
      if (stacked) { vt *= 0.3; nx = 0; if (z[0] === 'l' || z[0] === 'r') ny = -0.6; }
      return { X: X, Y: Y, Z: Z, vX: -Z / rho * vt + nx * push, vY: -ny * push / CT, vZ: X / rho * vt,
        r0: Math.hypot(X, Y, Z), delay: delay, t: 0, s: 0.9 + Math.random() * 0.8, o: 0.55 + Math.random() * 0.4, px: null, py: null, pc: null };
    }
    function step(p, dt) {
      var r2 = p.X * p.X + p.Y * p.Y + p.Z * p.Z + 0.02, r = Math.sqrt(r2), g = -GM / (r2 * r);
      var flat = smooth((6 - r) / 3);
      // the gas settles into the disk plane, and rubbing against itself there it slowly loses its spin
      p.vX += g * p.X * dt; p.vZ += g * p.Z * dt;
      p.vY += (g * p.Y - (0.4 + 5 * flat) * p.vY - 8 * flat * p.Y) * dt;
      var drag = Math.exp(-dt * 0.1 * flat * smooth(1 - Math.abs(p.Y) / 0.4));
      p.vX *= drag; p.vZ *= drag;
      p.X += p.vX * dt; p.Y += p.vY * dt; p.Z += p.vZ * dt; p.t += dt;
      return r;
    }
    var parts = [], runners = [];
    function seed() {
      parts = []; for (var n = 0; n < NP; n++) parts.push(spawn(Math.random() * 6));
      runners = []; for (var k = 0; k < 10; k++) runners.push({ u: Math.random(), sp: 0.12 + Math.random() * 0.06, o: 0.3 + Math.random() * 0.2 });
      for (var w = 0; w < 120; w++) advance(0.05);
      seeded = true;
    }
    function advance(dt) {
      // a smaller symbol runs its clock faster, so the gas crosses the screen at the same speed at any size
      var ts = Math.max(1, 128 / S);
      parts.forEach(function (p, k) {
        if (p.delay > 0) { p.delay -= dt; return; }
        var r;
        for (var j = 0; j < 6; j++) r = step(p, dt * ts / 6);
        if (r < RIN || r > (stacked ? 26 : 10) || p.t > (stacked ? 40 : 16)) { if (r < RIN) energy = Math.min(1, energy + 0.015); parts[k] = spawn(0); }
      });
    }
    function draw(p) {
      if (p.delay > 0) return;
      var r = Math.hypot(p.X, p.Y, p.Z), q0 = scr(p.X, p.Y, p.Z), q = lens(q0[0], q0[1], smooth((p.Z + 0.3) / 0.6));
      // bright as it leaves the card, dimmer the closer it gets; quiet once it is part of the disk
      var disk = smooth((2.4 - r) / 1.3) * smooth(1 - Math.abs(p.Y) / 0.6), vh = Math.hypot(p.vX, p.vZ) || 1;
      var dop = Math.max(0.4, 1 + 0.5 * disk * (-p.vZ / vh));
      var al = p.o * smooth(p.t / 0.25) * smooth((r - RIN) / 0.3) * (0.14 + 0.86 * smooth((r - RIN) / Math.max(0.5, p.r0 - RIN))) * dop * Q;
      var c = p.Z < 0 && r < 1.4 ? ftx : ctx, x = q[0], y = q[1], sz = p.s * (1 - 0.4 * disk);
      if (p.px !== null && p.pc === c && Math.hypot(x - p.px, y - p.py) < 40) {
        c.globalAlpha = Math.min(1, al * (0.6 - 0.3 * disk)); c.strokeStyle = rgba(1); c.lineWidth = sz; c.beginPath(); c.moveTo(p.px, p.py); c.lineTo(x, y); c.stroke();
      }
      c.globalAlpha = Math.min(1, al); c.fillStyle = rgba(1); c.beginPath(); c.arc(x, y, sz * 0.8, 0, 6.2832); c.fill();
      p.px = x; p.py = y; p.pc = c;
    }
    function frame(dt, t) {
      measure();
      ctx.clearRect(0, 0, W, H); ftx.clearRect(0, 0, W, H); ctx.lineCap = ftx.lineCap = 'round';
      var breathe = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI / 5.5);
      // the horizon and its two outer lines, bent around the hole like the hero's
      [0, -0.1, 0.1].forEach(function (off) {
        var main = off === 0, base = (main ? 0.8 : 0.35) * (0.75 + 0.25 * breathe) * Q;
        var gr = ctx.createLinearGradient(cx - L, 0, cx + L, 0);
        gr.addColorStop(0, rgba(0)); gr.addColorStop(0.3, rgba(base * 0.35)); gr.addColorStop(0.5, rgba(base)); gr.addColorStop(0.7, rgba(base * 0.35)); gr.addColorStop(1, rgba(0));
        ctx.beginPath();
        for (var x = -L, k = 0; x <= L; x += 3, k++) { var q = lens(x, off * S, 1); k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
        ctx.strokeStyle = gr; ctx.lineWidth = main ? 1.1 : 0.7; ctx.stroke();
      });
      // a few grains running round the outer lines, as on the hero
      ctx.fillStyle = rgba(1);
      runners.forEach(function (p) {
        p.u = (p.u + dt * p.sp) % 1;
        for (var j = 0; j < 4; j++) {
          var u = p.u - j * 0.006; if (u < 0) u += 1;
          var top = u < 0.5, f = top ? u * 2 : (u - 0.5) * 2, x = (top ? 1 - 2 * f : -1 + 2 * f) * L * 0.95;
          var q = lens(x, (top ? -0.1 : 0.1) * S, 1);
          var al = (1 - j / 4) * p.o * smooth((1 - Math.abs(x) / (L * 0.95)) / 0.2);
          if (al < 0.01) continue;
          ctx.globalAlpha = al * Q; ctx.beginPath(); ctx.arc(q[0], q[1], j ? 0.8 : 1.1, 0, 6.2832); ctx.fill();
        }
      });
      advance(dt);
      parts.forEach(draw);
      ctx.globalAlpha = 1; ftx.globalAlpha = 1;
      // the core flares a little whenever gas falls in
      energy *= Math.exp(-dt * 1.2);
      var e = Math.min(1, 0.3 + energy + 0.15 * breathe);
      halo.style.opacity = (0.3 + 0.55 * e).toFixed(3); halo.style.transform = 'scale(' + (1 + 0.6 * e).toFixed(3) + ')';
      core.style.transform = 'scale(' + (1 + 0.2 * e).toFixed(3) + ')';
      glows.forEach(function (gl) { gl.style.opacity = (0.08 + 0.18 * e).toFixed(3); });
    }
    function loop(tm) { if (!on) return; var dt = Math.min(0.05, (tm - last) / 1000 || 0); last = tm; frame(dt, tm / 1000); requestAnimationFrame(loop); }
    // Wide screens only: nothing is set up until the canvases are shown, and a resize up to desktop starts it then.
    function ready() { if (!size()) return false; if (!seeded) seed(); return true; }
    tone();
    function start() {
      if (!ready()) return;
      if (still || !('IntersectionObserver' in window)) { frame(0, 0); return; }
      new IntersectionObserver(function (en) {
        var was = on; on = en[0].isIntersecting;
        if (on && !was) { last = performance.now(); requestAnimationFrame(loop); }
      }).observe(sec);
    }
    var started = false;
    function boot() { if (!started && ready()) { started = true; start(); } }
    window.addEventListener('resize', function () { if (!started) boot(); else if (size() && still) frame(0, 0); });
    document.addEventListener('ac-theme', function () { tone(); if (started && still && size()) frame(0, 0); });
    if (document.readyState === 'complete') boot(); else window.addEventListener('load', boot);
  });
})();

// Energy-to-compute story (home): one scroll-driven camera from the map to the stack and the black hole.
/* "Map to stack" (preview): one continuous camera, driven by scroll.
   1. The contour map, with the chosen site glowing.
   2. The camera dives into the marker until the site plan fills the view from straight above.
   3. The camera tilts from straight down to the stack view while the plan lifts apart: the ground stays,
      the generator yard rises off it in the same place it had on the plan; the hall stays on the ground and fades
      to its dashed footprint (nothing rises and vanishes).
   4. Power grows into a full layer, then the full hall drops in from above while the stack turns at a constant rate.
   5. The home hero's black hole forms at the top, facing the viewer.
   The plan and the stack are the same 3D drawing (an orthographic camera whose pitch goes from 90 to 30
   degrees), so the handoff is one camera move, not a swap of pictures. Redraws on scroll, resize and the theme toggle;
   the ambient dust and the black hole animate gently while on screen (never with reduced motion). */
(function () {
  "use strict";
  var sec = document.querySelector(".ps-alt");
  if (!sec) return;
  var track = sec.querySelector(".mz-track"), art = sec.querySelector(".mz-art");
  var canvas = art && art.querySelector(".cb-scene");
  if (!track || !canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  // where canvas blur does not work (see acCanBlur) the soft glow passes are skipped, not drawn hard
  var BLUR = acCanBlur;
  var fx = art.querySelector(".cb-fx"), fctx = fx && fx.getContext && fx.getContext("2d");
  var holeBox = art.querySelector(".cb-hole");
  var slides = sec.querySelectorAll(".mz-slide");
  var ticks = sec.querySelectorAll(".mz-rail li");
  var reduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var dustC = sec.querySelector(".cb-dust"), dctx = dustC && dustC.getContext && dustC.getContext("2d");
  // Theme: the section follows the site's black/white toggle (data-theme on <html>, 'ac-theme' on document).
  var light, BG, BGC, INKC, GLK, LKA;
  function readTheme() {
    light = document.documentElement.getAttribute("data-theme") === "light";
    BG = light ? "#ffffff" : "#050506"; BGC = light ? "255,255,255" : "5,5,6";
    INKC = light ? "11,12,14" : "236,238,241";
    GLK = light ? 0.4 : 1; // glows become a soft dark halo on white
    LKA = light ? 1.3 : 1; // dark lines on white read lighter than light lines on black: lift the faint ones
  }
  readTheme();

  /* ---------- helpers ---------- */
  var seed = 11;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function c01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function sstep(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function smooth(t) { t = c01(t); return t * t * (3 - 2 * t); }
  function smoother(t) { t = c01(t); return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function P(x, y) { return { x: x, y: y }; }
  function catmull(pts, per) {
    var out = [];
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)];
      for (var j = 0; j < per; j++) {
        var t = j / per, t2 = t * t, t3 = t2 * t;
        out.push(P(
          0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
          0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
        ));
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  function spline(arr, per) { var pts = []; for (var i = 0; i < arr.length; i += 2) pts.push(P(arr[i], arr[i + 1])); return catmull(pts, per || 24); }
  function polyLen(poly) { var L = [0]; for (var i = 1; i < poly.length; i++) L.push(L[i - 1] + Math.hypot(poly[i].x - poly[i - 1].x, poly[i].y - poly[i - 1].y)); return L; }
  function pointAt(poly, L, t) {
    var d = clamp(t, 0, 1) * L[L.length - 1], i = 1;
    while (i < L.length - 1 && L[i] < d) i++;
    var seg = L[i] - L[i - 1] || 1, u = (d - L[i - 1]) / seg;
    return P(lerp(poly[i - 1].x, poly[i].x, u), lerp(poly[i - 1].y, poly[i].y, u));
  }
  function dirAt(poly, L, t) { var a = pointAt(poly, L, t - 0.003), b = pointAt(poly, L, t + 0.003), l = Math.hypot(b.x - a.x, b.y - a.y) || 1; return P((b.x - a.x) / l, (b.y - a.y) / l); }
  function feature(poly) { return { p: poly, L: polyLen(poly) }; }
  function mapPoly(poly, A, S) { return poly.map(function (p) { return P(500 + (p.x - A.x) * S, 500 + (p.y - A.y) * S); }); }
  function yAt(poly, x) {
    for (var i = 1; i < poly.length; i++) if ((poly[i].x - x) * (poly[i - 1].x - x) <= 0) {
      var u = (x - poly[i - 1].x) / ((poly[i].x - poly[i - 1].x) || 1);
      return lerp(poly[i - 1].y, poly[i].y, u);
    }
    return poly[poly.length - 1].y;
  }

  /* =====================================================================
     THE MAP (level 0, from the map preview). The site plan sits inside it at A1, 10x closer.
     ===================================================================== */
  var A1 = P(560, 480), S1 = 10;
  var hills = [];
  for (var h0 = 0; h0 < 18; h0++) hills.push({ x: -600 + rnd() * 2200, y: -600 + rnd() * 2200, s: 70 + rnd() * 260, a: (rnd() < 0.35 ? -0.6 : 1) * (0.25 + rnd() * 0.7) });
  function field(x, y) {
    var v = 0.2 * Math.sin(x * 0.0042 + 1.3) * Math.cos(y * 0.0036 - 0.7) + 0.08 * Math.sin((x + y) * 0.0072) + 0.05 * Math.sin(x * 0.013 - y * 0.009);
    for (var i = 0; i < hills.length; i++) { var g = hills[i], dx = x - g.x, dy = y - g.y; v += g.a * Math.exp(-(dx * dx + dy * dy) / (2 * g.s * g.s)); }
    return v;
  }
  // Marching squares over a grid of field values; calls out(a, b, level) for every segment.
  function march(vals, n, m, X, Y, th, out) {
    for (var cj = 0; cj < m; cj++) for (var ci = 0; ci < n; ci++) {
      var a = vals[cj * (n + 1) + ci], b = vals[cj * (n + 1) + ci + 1], c = vals[(cj + 1) * (n + 1) + ci + 1], d = vals[(cj + 1) * (n + 1) + ci];
      var code = (a > th ? 8 : 0) | (b > th ? 4 : 0) | (c > th ? 2 : 0) | (d > th ? 1 : 0);
      if (code === 0 || code === 15) continue;
      var x0 = X(ci), x1 = X(ci + 1), y0 = Y(cj), y1 = Y(cj + 1);
      var top = P(lerp(x0, x1, (th - a) / (b - a)), y0), right = P(x1, lerp(y0, y1, (th - b) / (c - b)));
      var bottom = P(lerp(x0, x1, (th - d) / (c - d)), y1), left = P(x0, lerp(y0, y1, (th - a) / (d - a)));
      var segs;
      switch (code) {
        case 1: case 14: segs = [left, bottom]; break;
        case 2: case 13: segs = [bottom, right]; break;
        case 3: case 12: segs = [left, right]; break;
        case 4: case 11: segs = [top, right]; break;
        case 5: segs = [left, top, bottom, right]; break;
        case 6: case 9: segs = [top, bottom]; break;
        case 7: case 8: segs = [left, top]; break;
        case 10: segs = [left, bottom, top, right]; break;
      }
      for (var s = 0; s < segs.length; s += 2) out(segs[s], segs[s + 1]);
    }
  }
  var contours = [], fLo = 1e9, fHi = -1e9;
  (function buildContours() {
    var x0 = -900, y0 = -900, step = 14, n = 208, vals = new Float32Array((n + 1) * (n + 1));
    for (var j = 0; j <= n; j++) for (var i = 0; i <= n; i++) {
      var v = field(x0 + i * step, y0 + j * step); vals[j * (n + 1) + i] = v; if (v < fLo) fLo = v; if (v > fHi) fHi = v;
    }
    for (var l = 1; l < 30; l++) {
      var p = new Path2D();
      march(vals, n, n, function (i) { return x0 + i * step; }, function (j) { return y0 + j * step; }, fLo + (fHi - fLo) * l / 30,
        function (a, b) { p.moveTo(a.x, a.y); p.lineTo(b.x, b.y); });
      contours.push({ path: p, major: l % 5 === 0 });
    }
  })();
  var grid = new Path2D(), gridTicks = new Path2D();
  for (var g0 = -1000; g0 <= 2000; g0 += 125) {
    grid.moveTo(g0, -1000); grid.lineTo(g0, 2000); grid.moveTo(-1000, g0); grid.lineTo(2000, g0);
    for (var tk = -1000; tk <= 2000; tk += 25) {
      var big = tk % 125 === 0 ? 7 : 3;
      gridTicks.moveTo(g0 - big, tk); gridTicks.lineTo(g0 + big, tk); gridTicks.moveTo(tk, g0 - big); gridTicks.lineTo(tk, g0 + big);
    }
  }
  var pipeMain = feature(spline([-800, 700, -300, 615, 140, 560, 360, 500, 560, 452, 790, 425, 1020, 330, 1320, 300, 1900, 170], 60));
  var pipeB = feature(spline([-800, 120, -250, 200, 150, 250, 420, 360, 540, 450], 50));
  var pipeC = feature(spline([600, 1900, 760, 1300, 860, 950, 930, 640, 1020, 330], 50));
  var pipes = [pipeMain, pipeB, pipeC];
  var river = feature(spline([-800, 920, -420, 830, -120, 900, 140, 770, 330, 800, 470, 690, 700, 730, 900, 640, 1100, 720, 1400, 610, 1900, 660], 30));
  var creeks = [
    feature(spline([330, 800, 290, 980, 380, 1180, 300, 1500], 24)), feature(spline([700, 730, 770, 900, 700, 1100, 760, 1400], 24)),
    feature(spline([-120, 900, -160, 660, -60, 470, -140, 260], 24)), feature(spline([1100, 720, 1180, 860, 1130, 1050], 24))
  ];
  var roads0 = [
    feature(spline([-800, 400, -250, 470, 200, 520, 520, 545, 820, 570, 1200, 520, 1900, 560], 30)),
    feature(spline([260, -800, 220, -100, 300, 250, 230, 520, 260, 900, 180, 1700], 30)),
    feature(spline([1500, -600, 1250, 0, 1150, 400, 1240, 800, 1200, 1700], 30))
  ];
  var track0 = feature(spline([880, -600, 870, 100, 980, 320, 1010, 520, 1100, 720], 20));
  var rail = feature(spline([-800, -40, -100, 40, 500, 110, 1000, 190, 1900, 260], 40));
  var railTies = new Path2D();
  for (var rt = 0; rt <= 1; rt += 7 / rail.L[rail.L.length - 1]) {
    var rp = pointAt(rail.p, rail.L, rt), rd = dirAt(rail.p, rail.L, rt);
    railTies.moveTo(rp.x - rd.y * 4, rp.y + rd.x * 4); railTies.lineTo(rp.x + rd.y * 4, rp.y - rd.x * 4);
  }
  var valves0 = [];
  pipes.forEach(function (f, fi) {
    [0.18, 0.37, 0.62, 0.83].forEach(function (t) {
      var p = pointAt(f.p, f.L, t + fi * 0.03);
      if (Math.hypot(p.x - A1.x, p.y - A1.y) > 90) valves0.push({ p: p, d: dirAt(f.p, f.L, t + fi * 0.03) });
    });
  });
  var wells = [];
  (function placeWells() {
    var tries = 0;
    while (wells.length < 38 && tries++ < 600) {
      var w = P(-350 + rnd() * 1700, -350 + rnd() * 1700);
      if (Math.hypot(w.x - A1.x, w.y - A1.y) < 80) continue;
      if (wells.some(function (o) { return Math.hypot(o.x - w.x, o.y - w.y) < 40; })) continue;
      var best = null, bd = 1e9;
      pipes.forEach(function (f) { f.p.forEach(function (q) { var d = Math.hypot(q.x - w.x, q.y - w.y); if (d < bd) { bd = d; best = q; } }); });
      w.kind = rnd() < 0.18 ? 2 : rnd() < 0.4 ? 1 : 0;
      if (bd < 140 && w.kind !== 2) { w.lx = best.x; w.ly = best.y; }
      wells.push(w);
    }
  })();

  /* ---------- map drawing (level units, line widths in screen px) ---------- */
  var K = 1, W = 0, H = 0, dpr = 1, phone = false, U = 1;
  function setT(t) { K = t.k; ctx.setTransform(t.k * dpr, 0, 0, t.k * dpr, t.ox * dpr, t.oy * dpr); }
  function lw(px) { ctx.lineWidth = px / K; }
  // Alphas are rounded to 3 places: a tiny value prints as "2e-7", which Safari rejects as a colour and then keeps
  // the last one (often opaque white), so the drawing turns into white blobs after scrolling back up.
  function ink(a) { var s = "rgba(" + INKC + "," + Math.min(1, Math.max(0, a * LKA)).toFixed(3) + ")"; ctx.strokeStyle = s; ctx.fillStyle = s; }
  function glow(b, a) { if (acNoShadow) return; ctx.shadowColor = "rgba(" + INKC + "," + Math.min(1, Math.max(0, (a == null ? 0.8 : a) * GLK)).toFixed(3) + ")"; ctx.shadowBlur = b * dpr; }
  function noGlow() { ctx.shadowBlur = 0; ctx.shadowColor = "transparent"; }
  function dash(on, off) { ctx.setLineDash(on ? [on / K, off / K] : []); }
  function circle(x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); fill ? ctx.fill() : ctx.stroke(); }
  function dot(x, y, px) { circle(x, y, px / K, true); }
  function line(pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); }
  function poly2(p, upto) {
    var n = upto == null ? p.length : Math.max(2, Math.floor(upto));
    ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y);
    for (var i = 1; i < n && i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
    ctx.stroke();
  }
  function bowtie(x, y, dx, dy, s) {
    var nx = -dy, ny = dx;
    ctx.beginPath();
    ctx.moveTo(x - dx * s + nx * s, y - dy * s + ny * s); ctx.lineTo(x + dx * s - nx * s, y + dy * s - ny * s);
    ctx.lineTo(x + dx * s + nx * s, y + dy * s + ny * s); ctx.lineTo(x - dx * s - nx * s, y - dy * s - ny * s); ctx.closePath();
    ctx.fillStyle = BG; ctx.fill(); ctx.stroke();
  }
  function road2(p, unitsWide, a) {
    ink(a); ctx.lineWidth = unitsWide; poly2(p);
    ctx.strokeStyle = BG; ctx.lineWidth = Math.max(unitsWide - 2.2 / K, unitsWide * 0.5); poly2(p);
  }
  function drawMap(al, p) {
    var draw = sstep(0.0, 0.035, p);
    ctx.globalAlpha = al * (0.4 + 0.6 * sstep(0, 0.04, p));
    ink(0.05); lw(0.8); ctx.stroke(grid);
    ink(0.13); lw(0.8); ctx.stroke(gridTicks);
    for (var i = 0; i < contours.length; i++) { ink(contours[i].major ? 0.26 : 0.1); lw(contours[i].major ? 1 : 0.7); ctx.stroke(contours[i].path); }
    ink(0.5); lw(1.6); poly2(river.p);
    ink(0.32); lw(0.9); creeks.forEach(function (c) { poly2(c.p); });
    roads0.forEach(function (r) { road2(r.p, 4.5 / K, 0.42); });
    ink(0.3); lw(0.9); dash(5, 4); poly2(track0.p); dash();
    ink(0.45); lw(1); poly2(rail.p); ink(0.35); lw(0.8); ctx.stroke(railTies);
    ctx.globalAlpha = al;
    ink(0.62); lw(1); dash(10, 3); poly2(pipeB.p, pipeB.p.length * draw); poly2(pipeC.p, pipeC.p.length * draw); dash();
    glow(10, 0.7); ink(0.92); lw(1.5); poly2(pipeMain.p, pipeMain.p.length * draw); noGlow();
    ink(0.8); lw(0.9);
    valves0.forEach(function (v) { bowtie(v.p.x, v.p.y, v.d.x, v.d.y, 4.5); });
    wells.forEach(function (w, i) {
      var a = sstep((i % 10) * 0.002, 0.02 + (i % 10) * 0.002, p);
      if (a <= 0) return;
      ctx.globalAlpha = al * a;
      if (w.lx != null) { ink(0.35); lw(0.7); dash(2, 3); line([w.lx, w.ly, w.x, w.y]); dash(); }
      ink(0.85); lw(1); circle(w.x, w.y, 4);
      if (w.kind === 0) dot(w.x, w.y, 1.3);
      else if (w.kind === 1) line([w.x - 7, w.y, w.x - 4, w.y, w.x + 4, w.y, w.x + 7, w.y, w.x, w.y - 7, w.x, w.y - 4, w.x, w.y + 4, w.x, w.y + 7]);
      else line([w.x - 3, w.y + 3, w.x + 3, w.y - 3]);
    });
    // the chosen site: its parcel (exactly the plan's fence) and a glowing marker
    var m = sstep(0.012, 0.035, p);
    ctx.globalAlpha = al * m;
    ink(0.45); lw(0.9); dash(3, 3); ctx.strokeRect(A1.x - 37, A1.y - 19, 74, 51); dash();
    glow(18, 1); ink(1); lw(1.5); circle(A1.x, A1.y, 7); dot(A1.x, A1.y, 2.6); noGlow();
    var ph = (p * 14) % 1;
    ink(0.55 * (1 - ph)); lw(1); circle(A1.x, A1.y, 7 + ph * 18);
    ctx.globalAlpha = 1;
  }

  /* =====================================================================
     THE SITE IN 3D. World units: x right, z down the plan (south), y up.
     Plan coordinates (the map preview's 0..1000 site plan) map to the ground as
     x = (u - 500) / 400, z = (v - 530) / 400. The ground plate is x in [-1, 1], z in [-0.8, 0.8].
     ===================================================================== */
  var ZP = 0.8, G = 0.72, HOLE_LIFT = 0.12, SYM = 0.62;
  function QX(u) { return (u - 500) / 400; }
  function QZ(v) { return (v - 530) / 400; }
  function Q(u, v, y) { return [QX(u), y || 0, QZ(v)]; }
  function D(n) { return n / 400; }

  var cam = { s: 1, ox: 0, oy: 0, sp: 1, cp: 0, sF: 0, cF: 1, mid: 0 };
  var LT = { k: 1, ax: 0, az: 0, px: 0, pz: 0, Y: 0 };
  function pj(x, y, z) {
    var X = LT.ax + LT.k * (x - LT.px), Z = LT.az + LT.k * (z - LT.pz), Hh = LT.Y + LT.k * y;
    var c = X * cam.cF - Z * cam.sF, d = X * cam.sF + Z * cam.cF;
    return [cam.ox + c * cam.s, cam.oy - (Hh - cam.mid) * cam.s * cam.cp + d * cam.s * cam.sp];
  }
  function pl(pts, close) {
    for (var i = 0; i < pts.length; i++) { var q = pj(pts[i][0], pts[i][1], pts[i][2]); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }
    if (close) ctx.closePath();
  }

  // ---------- geometry helpers ----------
  function ring(cx, cy, cz, r, n, plane) {
    var out = [];
    for (var i = 0; i <= n; i++) {
      var a = i / n * Math.PI * 2, c = r * Math.cos(a), s = r * Math.sin(a);
      out.push(plane === "xz" ? [cx + c, cy, cz + s] : plane === "zy" ? [cx, cy + s, cz + c] : [cx + c, cy + s, cz]);
    }
    return out;
  }
  function box(b, o) { o = o || {}; o.t = "box"; o.b = b; return o; }
  function lines(ls, o) { o = o || {}; o.t = "lines"; o.lines = ls; return o; }
  function cyl(x, z, r, y0, y1, o) { o = o || {}; o.t = "cyl"; o.c = [x, z]; o.r = r; o.y0 = y0; o.y1 = y1; return o; }
  function offset(pts, w) {
    var out = [];
    for (var i = 0; i < pts.length; i++) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      var dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz) || 1;
      out.push([pts[i][0] - dz / l * w, pts[i][1], pts[i][2] + dx / l * w]);
    }
    return out;
  }
  function ladder(p0, p1, y, w, post) {
    var ls = [], c = [[p0[0], y, p0[1]], [p1[0], y, p1[1]]];
    var r1 = offset(c, w), r2 = offset(c, -w);
    ls.push(r1, r2);
    var L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), n = Math.max(2, Math.round(L / (w * 3.4)));
    for (var i = 0; i <= n; i++) {
      var t = i / n, a = [lerp(r1[0][0], r1[1][0], t), y, lerp(r1[0][2], r1[1][2], t)], b = [lerp(r2[0][0], r2[1][0], t), y, lerp(r2[0][2], r2[1][2], t)];
      ls.push([a, b]);
      if (post && i % post === 0) { var m = [(a[0] + b[0]) / 2, 0, (a[2] + b[2]) / 2]; ls.push([[m[0], y, m[2]], m]); }
    }
    return ls;
  }
  function rectPts(u, v, w, h, y) { return [Q(u, v, y), Q(u + w, v, y), Q(u + w, v + h, y), Q(u, v + h, y)]; }
  function boxQ(u0, v0, u1, v1, y0, y1, o) { return box([QX(u0), QX(u1), y0, y1, QZ(v0), QZ(v1)], o); }
  // Apply a point map to a list of items (boxes are re-sorted per axis, radii scaled by kr).
  function mapItems(list, f, kr) {
    return list.map(function (o) {
      if (o.b) {
        var a = f([o.b[0], o.b[2], o.b[4]]), c = f([o.b[1], o.b[3], o.b[5]]);
        o.b = [Math.min(a[0], c[0]), Math.max(a[0], c[0]), Math.min(a[1], c[1]), Math.max(a[1], c[1]), Math.min(a[2], c[2]), Math.max(a[2], c[2])];
      }
      if (o.c) { var q0 = f([o.c[0], o.y0, o.c[1]]), q1 = f([o.c[0], o.y1, o.c[1]]); o.c = [q0[0], q0[2]]; o.y0 = q0[1]; o.y1 = q1[1]; o.r *= kr; }
      if (o.lines) o.lines = o.lines.map(function (l) { return l.map(f); });
      if (o.extra) o.extra = o.extra.map(function (l) { return l.map(f); });
      if (o.at) { var t = f([o.at[0], 0, o.at[1]]); o.at = [t[0], t[2]]; }
      return o;
    });
  }
  function fence(runs, hgt, gap) {
    var ls = [];
    runs.forEach(function (r) {
      var a = Q(r[0], r[1]), b = Q(r[2], r[3]), L = Math.hypot(b[0] - a[0], b[2] - a[2]), n = Math.max(1, Math.round(L / gap));
      ls.push([[a[0], hgt, a[2]], [b[0], hgt, b[2]]], [[a[0], hgt * 0.5, a[2]], [b[0], hgt * 0.5, b[2]]]);
      for (var i = 0; i <= n; i++) { var x = lerp(a[0], b[0], i / n), z = lerp(a[2], b[2], i / n); ls.push([[x, 0, z], [x, hgt, z]]); }
    });
    return ls;
  }
  function bow(u, v, dx, dy, s) { // a flat valve symbol
    var nx = -dy, ny = dx;
    return [[Q(u - dx * s + nx * s, v - dy * s + ny * s), Q(u + dx * s - nx * s, v + dy * s - ny * s), Q(u + dx * s + nx * s, v + dy * s + ny * s), Q(u - dx * s - nx * s, v - dy * s - ny * s), Q(u - dx * s + nx * s, v - dy * s + ny * s)]];
  }
  function clipRuns(pl1) { // keep the parts of a plan polyline that lie on the plate
    var runs = [], cur = [];
    pl1.forEach(function (p) {
      var x = QX(p.x), z = QZ(p.y);
      if (Math.abs(x) <= 1 && Math.abs(z) <= ZP) cur.push([x, 0, z]);
      else { if (cur.length > 1) runs.push(cur); cur = []; }
    });
    if (cur.length > 1) runs.push(cur);
    return runs;
  }

  /* ---------- GROUND: the site plan itself (plan positions, unscaled) ---------- */
  var pipe1 = mapPoly(pipeMain.p, A1, S1), pipeB1 = mapPoly(pipeB.p, A1, S1);
  var salesY = yAt(pipe1, 480);
  var gens = [340, 382, 424, 466, 508];
  var gasPlan = [P(222, 412), P(222, 380), P(420, 380), P(420, 406), P(445, 420), P(470, 420), P(545, 420), P(545, 357), P(560, 357)];
  var gasPath = feature(gasPlan), powerPath = feature([P(690, 357), P(690, 400), P(735, 400), P(755, 470), P(755, 620)]);

  // Local contours: the map's own terrain around the site, four times finer (every fourth line is a map line).
  var cMinor = [], cMid = [], cMajor = [];
  (function localContours() {
    var n = 160, m = 128, st = 2 / n, vals = new Float32Array((n + 1) * (m + 1)), lo = 1e9, hi = -1e9;
    for (var j = 0; j <= m; j++) for (var i = 0; i <= n; i++) {
      var v = field(A1.x + (-1 + i * st) * 40, A1.y + 3 + (-ZP + j * st) * 40); vals[j * (n + 1) + i] = v; if (v < lo) lo = v; if (v > hi) hi = v;
    }
    var stepL = (fHi - fLo) / 120;
    for (var l = Math.ceil((lo - fLo) / stepL); l <= Math.floor((hi - fLo) / stepL); l++) {
      var bucket = l % 20 === 0 ? cMajor : l % 4 === 0 ? cMid : cMinor;
      march(vals, n, m, function (i) { return -1 + i * st; }, function (j) { return -ZP + j * st; }, fLo + l * stepL, function (a, b) {
        var mx = (a.x + b.x) / 2, mz = (a.y + b.y) / 2, u = 500 + mx * 400, v = 530 + mz * 400;
        if (u > 118 && u < 882 && v > 278 && v < 812) return; // graded inside the fence
        if (Math.abs(u - 475) < 24 && v > 790) return; // access road
        bucket.push([[a.x, 0, a.y], [b.x, 0, b.y]]);
      });
    }
  })();

  function pumpjackOld() { // built along x in the stacked-layers units (wellhead at x 0.77), then mapped onto the plan
    var k = [], zp = 0, z1 = zp - 0.035, z2 = zp + 0.035;
    [z1, z2].forEach(function (z) { k.push([[0.42, 0.025, z], [0.5, 0.24, zp], [0.6, 0.025, z]]); });
    var hh = [], hh2 = [];
    for (var i = 0; i <= 10; i++) { var a = -0.9 + 1.8 * i / 10; hh.push([0.72 + 0.05 * Math.cos(a), 0.25 + 0.1 * Math.sin(a), zp - 0.014]); hh2.push([0.72 + 0.05 * Math.cos(a), 0.25 + 0.1 * Math.sin(a), zp + 0.014]); }
    k.push(hh, hh2, [[0.77, 0.16, zp], [0.77, 0.07, zp]]);
    k.push([[0.3, 0.12, z1 - 0.01], [0.3, 0.235, zp]], [[0.3, 0.12, z2 + 0.01], [0.3, 0.235, zp]]);
    k.push(ring(0.3, 0.085, z2 + 0.012, 0.05, 24), ring(0.3, 0.085, z1 - 0.012, 0.05, 24));
    return [
      box([0.2, 0.84, 0, 0.025, zp - 0.07, zp + 0.07], { sx: 6, glow: true }),
      box([0.24, 0.36, 0.025, 0.1, zp - 0.03, zp + 0.03], {}),
      box([0.28, 0.73, 0.235, 0.262, zp - 0.014, zp + 0.014], { glow: true }),
      lines(k, { at: [0.52, zp + 0.01], glow: true }),
      box([0.74, 0.8, 0.025, 0.07, zp - 0.03, zp + 0.03], {})
    ];
  }
  var PJ = 0.55;
  var pumpjack = mapItems(pumpjackOld(), function (p) { return [QX(222 + (0.77 - p[0]) * 400 * PJ), p[1] * PJ, QZ(420) + p[2] * PJ]; }, PJ);

  var FL = Q(345, 340), FH = 0.3;
  var gnd = [
    lines(cMinor, { flat: true, faint: true, a: 0.32 }),
    lines(cMid, { flat: true, faint: true, a: 0.6 }),
    lines(cMajor, { flat: true, faint: true }),
    lines(clipRuns(pipeB1), { flat: true, dash: true, a: 0.75 }),
    lines(clipRuns(pipe1), { flat: true, glow: true }),
    // access road and the inner road (both edges) with a faint centre line
    lines([offset([Q(475, 850), Q(475, 610), Q(300, 610), Q(300, 575)], D(13)), offset([Q(475, 850), Q(475, 610), Q(300, 610), Q(300, 575)], -D(13)),
      offset([Q(475, 690), Q(615, 690)], D(11)), offset([Q(475, 690), Q(615, 690)], -D(11))], { flat: true, a: 0.6 }),
    lines([[Q(475, 850), Q(475, 610), Q(300, 610), Q(300, 590)]], { flat: true, dash: true, faint: true, a: 0.6 }),
    // well pad, tank berm, transformer-yard fence, parking
    lines([rectPts(160, 320, 220, 250)], { flat: true, closed: true, glow: true, a: 0.7 }),
    lines([rectPts(172, 492, 108, 58)], { flat: true, closed: true, dash: true, faint: true }),
    lines([rectPts(710, 330, 130, 140)], { flat: true, closed: true, dash: true, faint: true, a: 0.8 }),
    lines([rectPts(520, 640, 92, 76)].concat([535, 550, 565, 580, 595].map(function (u) { return [Q(u, 640), Q(u, 664)]; }), [535, 550, 565, 580, 595].map(function (u) { return [Q(u, 692), Q(u, 716)]; })), { flat: true, closed: false, a: 0.55 }),
    lines([[Q(520, 640), Q(612, 640)], [Q(520, 716), Q(612, 716)]], { flat: true, a: 0.55 }),
    // flow lines on the ground: separator drain, flare line, flare radius, gas line, header, sales tie-in, power cable
    lines([[Q(405, 440), Q(405, 521), Q(272, 521)]], { flat: true, dash: true, faint: true }),
    lines([[Q(430, 400), Q(430, 340), Q(352, 340)]], { flat: true, faint: true, a: 0.9 }),
    lines([ring(FL[0], 0, FL[2], D(34), 48, "xz")], { flat: true, dash: true, faint: true }),
    lines([gasPlan.map(function (p) { return Q(p.x, p.y); }), [Q(545, 357), Q(545, 525)]], { flat: true, glow: true, a: 0.95 }),
    lines([[Q(480, 412), Q(480, salesY)]].concat(bow(480, 300, 0, 1, 5), bow(515, 420, 1, 0, 6)), { flat: true, a: 0.8 }),
    lines([[Q(755, 445), Q(755, 620)]], { flat: true, glow: true, a: 0.9 }),
    lines([[Q(900, 700), Q(767, 700)]], { flat: true, dash: true, a: 0.8 }),
    // what is left on the ground once the yard and the hall lift off (appears with the lift)
    lines([rectPts(556, 336, 128, 210), rectPts(633, 620, 134, 100)], { flat: true, closed: true, dash: true, faint: true, vis: "ghost" }),
    lines([[Q(545, 525), Q(545, 560), Q(876, 560), Q(876, 818)]], { flat: true, dash: true, glow: true, vis: "ghost" }),
    // fence with posts and a gate
    lines(fence([[462, 800, 130, 800], [130, 800, 130, 290], [130, 290, 870, 290], [870, 290, 870, 800], [870, 800, 488, 800]], 0.03, 0.09), { faint: true, at: [0, 0.82] }),
    lines([[Q(462, 800), Q(462, 800, 0.045)], [Q(488, 800), Q(488, 800, 0.045)]], { at: [QX(475), QZ(800)] }),
    // tanks, separator, meter, fibre handhole
    cyl(QX(200), QZ(521), D(20), 0, 0.075, { extra: [ring(QX(200), 0.075, QZ(521), D(13), 28, "xz")] }),
    cyl(QX(252), QZ(521), D(20), 0, 0.075, { extra: [ring(QX(252), 0.075, QZ(521), D(13), 28, "xz")] }),
    boxQ(395, 400, 445, 440, 0, 0.012, { sx: 4 }),
    cyl(QX(420), QZ(420), D(13), 0.012, 0.13, { glow: true, extra: [[Q(420, 420, 0.13), Q(420, 420, 0.16)]] }),
    boxQ(470, 412, 490, 428, 0, 0.03, { extra: [[Q(470, 428, 0.03), Q(490, 412, 0.03)]] }),
    boxQ(814, 694, 826, 706, 0, 0.008, {}),
    // the flare stack with guy wires
    cyl(FL[0], FL[2], D(3), 0, FH, { glow: true }),
    cyl(FL[0], FL[2], D(5.5), FH, FH + 0.016, { glow: true }),
    lines([[[FL[0], FH * 0.8, FL[2]], Q(345, 312)], [[FL[0], FH * 0.8, FL[2]], Q(321, 354)], [[FL[0], FH * 0.8, FL[2]], Q(369, 354)]], { faint: true, at: [FL[0], FL[2]] })
  ].concat(pumpjack);

  /* ---------- POWER: the generator yard, built at plan positions; it rises and grows 2.5x into a layer ---------- */
  var KP = 2.5, PV = [0.48, -0.235];
  var GH = 0.06; // generator height at plan scale
  var pow = [];
  gens.forEach(function (y, gi) {
    var ex = [];
    for (var gx = 664; gx <= 677; gx += 3) ex.push([Q(gx, y + 4, GH), Q(gx, y + 30, GH)]);
    ex.push(rectPts(604, y + 5, 22, 24, GH), rectPts(630, y + 5, 22, 24, GH));
    ex.push(ring(QX(615), GH, QZ(y + 17), D(7), 18, "xz"), ring(QX(641), GH, QZ(y + 17), D(7), 18, "xz"));
    pow.push(boxQ(560, y, 680, y + 34, 0, GH, { sx: 6, sh: 2, inset: 0.008, extra: ex, glow: true }));
    pow.push(cyl(QX(585), QZ(y + 17), D(6), GH, GH + 0.045, { extra: [ring(QX(585), GH + 0.045, QZ(y + 17), D(3.5), 14, "xz")] }));
    pow.push(lines([[Q(545, y + 17), Q(560, y + 17)], [Q(680, y + 17), Q(690, y + 17)]], { flat: true, glow: true }));
    pow.push(boxQ(556, y - 3, 684, y + 37, 0, 0.004, { vis: "lod", bias: -0.2 }));
  });
  [350, 405].forEach(function (ty) {
    pow.push(boxQ(725, ty, 759, ty + 28, 0, 0.05, { sx: 6, sh: 3, glow: true, extra: [rectPts(728, ty + 4, 28, 20, 0.05)] }));
    pow.push(boxQ(728, ty + 28, 756, ty + 35, 0, 0.038, { sx: 8 }));
    pow.push(cyl(QX(734), QZ(ty + 8), D(2.6), 0.05, 0.075, {}));
    pow.push(cyl(QX(750), QZ(ty + 8), D(2.6), 0.05, 0.075, {}));
    pow.push(box([QX(727), QX(757), 0.05, 0.062, QZ(ty + 18), QZ(ty + 24)], { vis: "lod" }));
  });
  pow.push(boxQ(780, 345, 824, 445, 0, 0.055, { sz: 8, sx: 2, sh: 3, inset: 0.006, glow: true, extra: [[Q(790, 350, 0.055), Q(790, 440, 0.055)], [Q(814, 350, 0.055), Q(814, 440, 0.055)]] }));
  pow.push(lines([[Q(690, 357), Q(690, 525)], [Q(690, 400), Q(722, 400)], [Q(759, 364), Q(780, 364)], [Q(759, 419), Q(780, 419)]], { flat: true, glow: true }));
  // power out: a short tray from the switchgear to the riser that feeds the hall
  pow.push(lines(ladder([QX(802), QZ(345)], [QX(802), QZ(311)], 0.04, D(4), 0).concat(ladder([QX(802), QZ(311)], [QX(815), QZ(311)], 0.04, D(4), 0), [[Q(815, 311, 0.04), Q(815, 311, 0)]]), { at: [QX(808), QZ(330)], glow: true }));
  // gas into the yard from its riser, the manifold along the generators, and a conditioning skid (closer detail)
  pow.push(lines([[Q(842.4, 551.2), Q(552, 551.2), Q(552, 352)]], { flat: true, glow: true, vis: "lod" }));
  pow.push(boxQ(712, 486, 830, 530, 0, 0.022, { sx: 7, vis: "lod" }));
  pow.push(cyl(QX(736), QZ(508), D(9), 0.022, 0.08, { vis: "lod" }));
  pow.push(cyl(QX(762), QZ(508), D(9), 0.022, 0.08, { vis: "lod" }));
  pow.push(lines([[Q(712, 508, 0.04), Q(700, 508, 0.04), Q(700, 551, 0.04), Q(700, 551, 0)], [Q(790, 498, 0.022), Q(790, 498, 0.05), Q(820, 498, 0.05), Q(820, 498, 0.022)]], { at: [QX(760), QZ(520)], vis: "lod" }));
  pow.push(lines([[Q(842.4, 551.2), Q(842.4, 551.2, 0.03)]], { at: [QX(842), QZ(551)], vis: "lod" }));

  /* ---------- HALL: the map preview's server hall (its 0..1000 hall plan), built at full size.
     On the site plan it sits shrunk to the hall building's footprint, roof on; it grows into the full layer. ---------- */
  var KH = 0.93 / 400, HPLAN = [0.5, 0.35], HK0 = (1 / 6) / 400 / KH; // 0.179
  function HX(x) { return (x - 500) * KH; }
  function HZ(y) { return (y - 500) * KH; }
  function Hp(x, y, h) { return [HX(x), h || 0, HZ(y)]; }
  function hrect(x, y, w, hh, h) { return [Hp(x, y, h), Hp(x + w, y, h), Hp(x + w, y + hh, h), Hp(x, y + hh, h)]; }
  function hbox(x0, y0, x1, y1, h0, h1, o) { return box([HX(x0), HX(x1), h0, h1, HZ(y0), HZ(y1)], o); }
  var WX0 = HX(100), WX1 = HX(900), WZ0 = HZ(200), WZ1 = HZ(800), WH = 0.27, WT = 0.02, RH = 0.16;
  var pods = [280, 432, 584], RACKS = 22;
  var hall = [];
  (function () {
    var tiles = [];
    for (var gx = 156; gx < 900; gx += 48) tiles.push([Hp(gx, 208), Hp(gx, 792)]);
    for (var gy = 256; gy < 800; gy += 48) tiles.push([Hp(108, gy), Hp(892, gy)]);
    hall.push(lines(tiles, { flat: true, faint: true, a: 0.45, vis: "inner" }));
    hall.push(lines([hrect(108, 208, 784, 584)], { flat: true, closed: true, faint: true }));
    hall.push(lines([[Hp(830, 164), Hp(830, 200)]], { flat: true, glow: true }));
    hall.push(lines([[Hp(930, 680), Hp(900, 680)]], { flat: true, dash: true, a: 0.8 }));
    hall.push({ t: "wall", side: "x0" }, { t: "wall", side: "x1" }, { t: "wall", side: "z0" }, { t: "wall", side: "z1" });
    // cooling units along both long walls
    for (var c = 0; c < 5; c++) {
      var cy = 248 + c * 98;
      [[112, 142]].concat(c < 4 ? [[858, 888]] : []).forEach(function (xx) {
        var fxc = (xx[0] + xx[1]) / 2;
        hall.push(hbox(xx[0], cy, xx[1], cy + 66, 0, 0.15, { sz: 3, vis: "inner", extra: [ring(HX(fxc), 0.15, HZ(cy + 18), 9 * KH, 18, "xz"), ring(HX(fxc), 0.15, HZ(cy + 48), 9 * KH, 18, "xz")] }));
      });
    }
    // pods: two rows of racks, a contained hot aisle between them, PDUs at the head of each row
    pods.forEach(function (y0, pi) {
      hall.push(lines([hrect(200, y0 - 4, 596, 94)], { flat: true, closed: true, faint: true, vis: "inner" }));
      [y0, y0 + 56].forEach(function (ry) {
        hall.push(hbox(236, ry, 764, ry + 30, 0, RH, { sx: RACKS, sh: 7, inset: 0.012, glow: pi === 1, vis: "inner" }));
        hall.push(hbox(206, ry, 232, ry + 30, 0, RH, { sh: 3, vis: "inner" }));
      });
      hall.push(hbox(236, y0 + 30, 764, y0 + 56, RH, RH + 0.012, { tx: 11, bias: 0.12, vis: "inner" }));
      hall.push(hbox(232, y0 + 30, 236, y0 + 56, 0, RH, { sz: 2, bias: 0.12, vis: "inner" }));
      hall.push(hbox(764, y0 + 30, 768, y0 + 56, 0, RH, { sz: 2, bias: 0.12, vis: "inner" }));
    });
    // overhead: busway from the power entry round to the PDUs, cable ladders, fibre to the meet-me rack
    var bus = [[Hp(830, 164, 0.22), Hp(830, 236, 0.22), Hp(172, 236, 0.22), Hp(172, 700, 0.22)], [Hp(830, 164, 0), Hp(830, 164, 0.22)]];
    pods.forEach(function (y) { bus.push([Hp(172, y + 15, 0.22), Hp(219, y + 15, 0.22), Hp(219, y + 15, RH)], [Hp(172, y + 71, 0.22), Hp(219, y + 71, 0.22), Hp(219, y + 71, RH)]); });
    hall.push(lines(bus, { front: 39, glow: true, vis: "inner" }));
    var lad = [];
    [330, 500, 670].forEach(function (lx) { lad = lad.concat(ladder([HX(lx), HZ(224)], [HX(lx), HZ(700)], 0.23, 4 * KH, 0)); });
    hall.push(lines(lad, { front: 40, faint: true, vis: "inner" }));
    hall.push(lines(ladder([HX(220), HZ(700)], [HX(840), HZ(700)], 0.23, 4 * KH, 0), { front: 41, faint: true, vis: "inner" }));
    hall.push(lines([[Hp(900, 680, 0.1), Hp(854, 680, 0.1), Hp(854, 680, 0.16)]], { front: 38, dash: true, vis: "inner" }));
    hall.push(hbox(838, 666, 854, 694, 0, RH, { sh: 4, vis: "inner" }));
    // loading bay outside the south wall
    hall.push(hbox(560, 806, 680, 832, 0, 0.02, { sx: 4 }));
    // the roof, as the site plan shows it: inner line, ridge, two rows of roof units (fades away as the hall opens)
    var roofEx = [hrect(118, 218, 764, 564, WH + 0.008), [Hp(118, 500, WH + 0.008), Hp(882, 500, WH + 0.008)]];
    hall.push(box([WX0, WX1, WH, WH + 0.008, WZ0, WZ1], { vis: "roof", key: 900, extra: roofEx }));
    for (var ru = 0; ru < 5; ru++) {
      [272, 644].forEach(function (ry) {
        var x0 = 176 + ru * 132;
        hall.push(hbox(x0, ry, x0 + 96, ry + 72, WH + 0.008, WH + 0.04, { vis: "roof", key: 901 + ru * 0.01 + ry * 1e-5, extra: [ring(HX(x0 + 48), WH + 0.04, HZ(ry + 36), 21.6 * KH, 20, "xz")] }));
      });
    }
  })();
  function wallItem(side) {
    var back = side === "x0" ? cam.sF > 0 : side === "x1" ? cam.sF < 0 : side === "z0" ? cam.cF > 0 : cam.cF < 0;
    var h = back ? WH : 0.05, b;
    if (side === "x0") b = [WX0, WX0 + WT, 0, h, WZ0, WZ1];
    else if (side === "x1") b = [WX1 - WT, WX1, 0, h, WZ0, WZ1];
    else if (side === "z0") b = [WX0, WX1, 0, h, WZ0, WZ0 + WT];
    else b = [WX0, WX1, 0, h, WZ1 - WT, WZ1];
    return { o: box(b, { faint: back }), key: back ? -50 : 60 };
  }

  var LAY = [
    { items: gnd, plate: [-1, 1, -0.03, 0, -ZP, ZP] },
    { items: pow, plate: [PV[0] - 1 / KP, PV[0] + 1 / KP, -0.03 / KP, 0, PV[1] - ZP / KP, PV[1] + ZP / KP] },
    { items: hall, plate: [-1, 1, -0.03, 0, -ZP, ZP] },
    { items: [], plate: null }
  ];
  // Per-layer transforms: x_world = ax + k * (x - px), same for z; y_world = Y + k * y.
  function setLayer(i, w, Y) {
    LT.Y = Y;
    if (i === 1) { LT.k = lerp(1, KP, w); LT.px = PV[0]; LT.pz = PV[1]; LT.ax = lerp(PV[0], 0, w); LT.az = lerp(PV[1], 0, w); }
    else if (i === 2) { LT.k = lerp(HK0, 1, w); LT.px = 0; LT.pz = 0; LT.ax = lerp(HPLAN[0], 0, w); LT.az = lerp(HPLAN[1], 0, w); }
    else { LT.k = 1; LT.px = 0; LT.pz = 0; LT.ax = 0; LT.az = 0; }
  }
  function world(x, y, z) { return [LT.ax + LT.k * (x - LT.px), LT.Y + LT.k * y, LT.az + LT.k * (z - LT.pz)]; }

  // ---------- item drawing on the canvas ----------
  function boxFaces(b) {
    var x0 = b[0], x1 = b[1], y0 = b[2], y1 = b[3], z0 = b[4], z1 = b[5], xf = cam.sF > 0 ? x1 : x0, zf = cam.cF > 0 ? z1 : z0;
    pl([[xf, y0, z0], [xf, y0, z1], [xf, y1, z1], [xf, y1, z0]], true);
    pl([[x0, y0, zf], [x1, y0, zf], [x1, y1, zf], [x0, y1, zf]], true);
    pl([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], true);
  }
  function boxExtras(o) {
    var b = o.b, x0 = b[0], x1 = b[1], y0 = b[2], y1 = b[3], z0 = b[4], z1 = b[5], xf = cam.sF > 0 ? x1 : x0, zf = cam.cF > 0 ? z1 : z0, i, t, ins = o.inset || 0;
    for (i = 1; i < (o.sx || 0); i++) { t = lerp(x0, x1, i / o.sx); pl([[t, y0 + ins, zf], [t, y1 - ins, zf]]); }
    for (i = 1; i < (o.sz || 0); i++) { t = lerp(z0, z1, i / o.sz); pl([[xf, y0 + ins, t], [xf, y1 - ins, t]]); }
    for (i = 1; i < (o.sh || 0); i++) { t = lerp(y0, y1, i / o.sh); pl([[x0 + ins, t, zf], [x1 - ins, t, zf]]); pl([[xf, t, z0 + ins], [xf, t, z1 - ins]]); }
    for (i = 1; i < (o.tx || 0); i++) { t = lerp(x0, x1, i / o.tx); pl([[t, y1, z0], [t, y1, z1]]); }
    if (o.extra) for (i = 0; i < o.extra.length; i++) pl(o.extra[i]);
  }
  function cylFaces(o) {
    var x = o.c[0], z = o.c[1], r = o.r, n = 22, i, a, pts = [];
    var a0 = Math.atan2(-cam.sF, cam.cF);
    for (i = 0; i <= n; i++) { a = a0 + Math.PI + Math.PI * i / n; pts.push([x + r * Math.cos(a), o.y1, z + r * Math.sin(a)]); }
    for (i = 0; i <= n; i++) { a = a0 + Math.PI * i / n; pts.push([x + r * Math.cos(a), o.y0, z + r * Math.sin(a)]); }
    pl(pts, true);
  }
  function cylExtras(o) {
    var x = o.c[0], z = o.c[1], r = o.r, n = 22, i, a, pts = [], a0 = Math.atan2(-cam.sF, cam.cF);
    for (i = 0; i <= n; i++) { a = a0 + Math.PI * i / n; pts.push([x + r * Math.cos(a), o.y1, z + r * Math.sin(a)]); }
    pl(pts);
    if (o.extra) for (i = 0; i < o.extra.length; i++) pl(o.extra[i]);
  }
  function linesPath(o) { for (var i = 0; i < o.lines.length; i++) pl(o.lines[i], o.closed); }
  function outline(o) { // the whole drawing of an item, for the glow pass
    if (o.t === "box") { boxFaces(o.b); boxExtras(o); }
    else if (o.t === "cyl") { cylFaces(o); cylExtras(o); }
    else linesPath(o);
  }
  function stroke(a, faint, dashed) {
    ctx.strokeStyle = "rgba(" + INKC + "," + Math.min(1, Math.max(0, a * (faint ? 0.55 : 1) * LKA)).toFixed(3) + ")";
    ctx.setLineDash(dashed ? [4, 5] : []);
    ctx.stroke();
  }
  function drawItem(o, a) {
    if (o.t === "lines") { ctx.beginPath(); linesPath(o); stroke(a, o.faint, o.dash); return; }
    ctx.beginPath();
    if (o.t === "box") boxFaces(o.b); else cylFaces(o);
    ctx.fillStyle = BG; ctx.fill(); stroke(a, o.faint, o.dash);
    ctx.beginPath();
    if (o.t === "box") boxExtras(o); else cylExtras(o);
    stroke(a * 0.85, o.faint, false);
  }
  function itemCenter(o) {
    if (o.t === "box") return [(o.b[0] + o.b[1]) / 2, (o.b[4] + o.b[5]) / 2, o.b[2]];
    if (o.t === "cyl") return [o.c[0], o.c[1], o.y0];
    if (o.at) return [o.at[0], o.at[1], 0];
    var sx = 0, sz = 0, n = 0;
    o.lines.forEach(function (l) { l.forEach(function (p) { sx += p[0]; sz += p[2]; n++; }); });
    return [sx / n, sz / n, 0];
  }
  // Sort keys only change with the camera's yaw quadrant for flat/front items; compute per frame (cheap).
  function sortedItems(items) {
    var list = [];
    for (var j = 0; j < items.length; j++) {
      var o = items[j], key, d = o;
      if (o.t === "wall") { var w = wallItem(o.side); d = w.o; key = w.key; }
      else if (o.flat) key = -100 + j * 0.01;
      else if (o.key != null) key = o.key;
      else if (o.front) key = o.front;
      else { if (!o._c) o._c = itemCenter(o); key = o._c[0] * cam.sF + o._c[1] * cam.cF + (o.bias || 0) + o._c[2] * 0.3 + j * 1e-4; }
      list.push({ k: key, o: d, src: o });
    }
    list.sort(function (x, y) { return x.k - y.k; });
    return list;
  }
  function visOf(o, st) {
    if (!o.vis) return 1;
    if (o.vis === "ghost") return st.lift;
    if (o.vis === "lod") return smooth((st.e - 0.2) / 0.5);
    if (o.vis === "inner") return smooth((st.e - 0.08) / 0.4);
    if (o.vis === "roof") return 1 - smooth((st.e - 0.1) / 0.4);
    return 1;
  }

  function drawLayer(i, st, sceneA) {
    var Ly = LAY[i];
    // plate
    if (Ly.plate && st.plateA > 0.003) {
      var b = Ly.plate;
      ctx.globalAlpha = sceneA;
      ctx.beginPath(); boxFaces(b);
      ctx.fillStyle = "rgba(" + BGC + "," + (0.74 * st.fill).toFixed(3) + ")"; ctx.fill();
      stroke(st.b * 0.9 * st.plateA, false, false);
    } else if (!Ly.plate && st.plateA > 0.003) {
      ctx.globalAlpha = sceneA;
      ctx.beginPath(); pl([[-1, 0, -ZP], [1, 0, -ZP], [1, 0, ZP], [-1, 0, ZP]], true);
      stroke(st.b * 0.55 * st.plateA, false, true);
    }
    if (!Ly.items.length) return;
    var list = sortedItems(Ly.items);
    // glow pass under the lines
    if (st.glow > 0.01) {
      ctx.beginPath();
      for (var g = 0; g < list.length; g++) { var go = list[g].src; if (go.glow && visOf(go, st) > 0.5) outline(list[g].o); }
      if (BLUR) { ctx.save(); ctx.globalAlpha = sceneA * st.glow * GLK; ctx.setLineDash([]); ctx.strokeStyle = "rgb(" + INKC + ")"; ctx.lineWidth = 5; ctx.filter = "blur(4px)"; ctx.stroke(); ctx.restore(); }
    }
    ctx.lineWidth = 1;
    for (var j = 0; j < list.length; j++) {
      var src = list[j].src, v = visOf(src, st);
      if (v < 0.01) continue;
      ctx.globalAlpha = sceneA * v;
      drawItem(list[j].o, st.b * (src.a || 0.9));
    }
    ctx.globalAlpha = 1; ctx.setLineDash([]);
  }

  /* ---------- labels (screen space): the map's, then the plan's (they fade as the camera tilts) ---------- */
  var labels = [
    { lv: 0, x: 880, y: 372, t: "Gas pipeline", m: 1 }, { lv: 0, x: 600, y: 760, t: "River", m: 1 },
    { lv: 0, x: 120, y: 30, t: "Rail" }, { lv: 0, x: -60, y: 430, t: "Road" }, { lv: 0, x: A1.x + 16, y: A1.y + 24, t: "Site", m: 1 },
    { lv: 1, x: 120, y: 0, t: "Gas pipeline", m: 1, pipe: 1 },
    { lv: 1, x: 196, y: 448, t: "Pumpjack", m: 1 }, { lv: 1, x: 176, y: 566, t: "Tanks" },
    { lv: 1, x: 395, y: 458, t: "Separator", m: 1 }, { lv: 1, x: 300, y: 312, t: "Flare", m: 1 },
    { lv: 1, x: 462, y: 398, t: "Meter" }, { lv: 1, x: 560, y: 562, t: "Generators", m: 1 },
    { lv: 1, x: 712, y: 488, t: "Transformers", m: 1 }, { lv: 1, x: 640, y: 738, t: "Server hall", m: 1 },
    { lv: 1, x: 514, y: 732, t: "Parking" }, { lv: 1, x: 800, y: 688, t: "Fiber", m: 1 }, { lv: 1, x: 486, y: 830, t: "Access road" }
  ];
  labels[5].y = yAt(pipe1, 120) - 42;
  function drawLabels(t0, a0, a1) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var fs = phone ? 10 : 11;
    ctx.font = "500 " + fs + "px Jost, Futura, Arial, sans-serif";
    if ("letterSpacing" in ctx) ctx.letterSpacing = phone ? "1.6px" : "2px";
    ctx.textBaseline = "middle";
    var minX = W * (phone ? 0.03 : 0.1);
    setLayer(0, 0, 0);
    labels.forEach(function (lb) {
      if (phone && !lb.m) return;
      var x, y, la;
      if (lb.lv === 0) {
        var zoom = t0.k / U;
        la = a0 * sstep(0.5, 0.9, zoom) * (1 - sstep(1.5, 2.4, zoom));
        x = lb.x * t0.k + t0.ox; y = lb.y * t0.k + t0.oy;
      } else {
        la = a1;
        var q = pj(QX(lb.x), 0, QZ(lb.y)); x = q[0]; y = q[1];
      }
      if (la <= 0.01) return;
      var txt = lb.t.toUpperCase(), tw = ctx.measureText(txt).width;
      x = clamp(x, minX, W - tw - 6); y = clamp(y, 12, H - 12);
      ctx.fillStyle = "rgba(" + INKC + "," + (0.8 * la).toFixed(3) + ")";
      ctx.fillText(txt, x, y);
    });
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  }

  /* ---------- the scroll timeline ---------- */
  var T = {
    dive0: 0.07, dive1: 0.25,      // map -> plan (straight down)
    tilt0: 0.29, tilt1: 0.5,       // straight down -> stack view
    lift0: 0.32, lift1: 0.48,      // the plan separates into tiles
    pow0: 0.46, pow1: 0.62,        // 02: power rises into a full layer
    hall0: 0.62, hall1: 0.79,      // 03: the hall rises and opens
    hole0: 0.79, hole1: 0.91,      // 04: the black hole forms
    yaw0: 0.3, yaw1: 0.42, RATE: 200 // degrees per unit of progress once turning (100 degrees over the stack portion)
  };
  // The track is 300vh (it was 500vh). Scroll progress is mapped onto the timeline above with a short
  // hold on the map and at the end, so every phase keeps about the same share of the (shorter) scroll.
  // The first 15% of the scroll holds the map still under the opening text, so it can be read before step 01.
  var WARP = [[0, 0], [0.15, 0.065], [0.94, 0.93], [1, 1]];
  function warp(q) {
    for (var i = 1; i < WARP.length; i++) if (q <= WARP[i][0]) { var a = WARP[i - 1], b = WARP[i]; return a[1] + (b[1] - a[1]) * (q - a[0]) / (b[0] - a[0]); }
    return 1;
  }
  function slideFor(p) { return p < 0.07 ? 0 : p < 0.45 ? 1 : p < 0.62 ? 2 : p < 0.8 ? 3 : 4; }
  function yawAt(p) { // eases in, then constant: C1-continuous
    var p0 = T.yaw0, p1 = T.yaw1;
    if (p <= p0) return 0;
    if (p < p1) return T.RATE * (p - p0) * (p - p0) / (2 * (p1 - p0));
    return T.RATE * (p - (p0 + p1) / 2);
  }

  var lastIdx = null, hole = { x: 0, y: 0, a: 0, vis: false }, spx = 0;
  function render(force) {
    var still = reduce.matches;
    var p = still ? 1 : warp(shownP());
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round"; ctx.lineJoin = "round";

    // the dive (the map preview's nesting math, depth 0 -> 1 only)
    var f = smoother((p - T.dive0) / (T.dive1 - T.dive0));
    U = (phone ? Math.min(W * 1.15, H) : Math.min(W, H)) / 1000;
    var cx = W / 2, cy = H * (phone ? 0.47 : 0.5);
    var s = Math.pow(S1, f), gq = (1 - 1 / s) / (1 - 1 / S1);
    var cc = P(lerp(500, A1.x, gq), lerp(500, A1.y, gq));
    var t0 = { k: s * U }; t0.ox = cx - cc.x * t0.k; t0.oy = cy - cc.y * t0.k;
    var t1 = { k: t0.k / S1 }; t1.ox = t0.ox + (A1.x - 500 / S1) * t0.k; t1.oy = t0.oy + (A1.y - 500 / S1) * t0.k;
    var a0 = 1 - sstep(0.4, 0.8, f), a1 = sstep(0.2, 0.65, f);
    if (a0 > 0.002) { setT(t0); drawMap(a0, p); noGlow(); ctx.setLineDash([]); ctx.globalAlpha = 1; }

    // phases
    var tilt = smoother((p - T.tilt0) / (T.tilt1 - T.tilt0));
    var lift = smooth((p - T.lift0) / (T.lift1 - T.lift0));
    var e2 = smoother((p - T.pow0) / (T.pow1 - T.pow0)), e3 = smoother((p - T.hall0) / (T.hall1 - T.hall0));
    var a4 = smoother((p - T.hole0) / (T.hole1 - T.hole0));
    var Y1 = G * (0.3 * lift + 0.7 * e2), Y2 = Y1 + G * (0.3 * lift + 0.7 * e3);
    // 03: the full hall drops in from above the stage and settles one gap above the power layer.
    // Its lowest point is always at or above Y1 + G, so it never passes through the generator yard.
    var arr = 1 - Math.pow(1 - c01((p - T.hall0) / (T.hall1 - 0.01 - T.hall0)), 3);
    var Yh = Y1 + G + (1 - arr) * 1.15, Y3 = Yh + G;
    // the hall building on the plan never moves: it stays on the ground, roof on, until the full hall drops in
    // from above, and stays there for the rest of the story (the owner wants the ground hall always in view)
    var tileA = 1;

    // camera: from the plan transform (straight down) to the stack view
    var planS = 400 * t1.k, planOX = t1.ox + 500 * t1.k, planOY = t1.oy + 530 * t1.k;
    // the camera makes room for the black hole while the hall rises, so step 04 never has to jump back
    var topCam = Y2 + 0.27 * (1 - a4) + (G + HOLE_LIFT + 0.2) * smoother((p - 0.68) / 0.2);
    var stS = Math.min(W * 0.36, H * 0.84 / (topCam * 0.866 + 1.34));
    var pitch = (90 - 60 * tilt) * Math.PI / 180, yaw = yawAt(p) * Math.PI / 180;
    cam.sp = Math.sin(pitch); cam.cp = Math.cos(pitch); cam.sF = Math.sin(yaw); cam.cF = Math.cos(yaw);
    cam.s = lerp(planS, stS, tilt); cam.ox = lerp(planOX, W / 2, tilt); cam.oy = lerp(planOY, H * (phone ? 0.52 : 0.53), tilt);
    cam.mid = topCam / 2;

    // brightness: the whole site is lit on the plan, then each layer in its own step
    var gl = [], i;
    var on1 = smooth((p - 0.44) / 0.06), on2 = smooth((p - 0.6) / 0.06), on3 = smooth((p - 0.78) / 0.06);
    gl[0] = 1 - on1; gl[1] = Math.max(on1 * (1 - on2), gl[0]); gl[2] = Math.max(on2 * (1 - on3), gl[0]); gl[3] = on3;
    var fin = smooth((p - 0.86) / 0.14);
    var es = [0, e2, 1, 0], Ys = [0, Y1, Yh, Y3], gate = [0, e2, arr];
    var land = smooth((arr - 0.55) / 0.45);
    gl[2] = land * (1 - on3);
    var stOf = function (k) {
      var b = 0.4 + 0.6 * gl[k]; b = b + (0.8 - b) * fin;
      return {
        b: b, e: es[k], lift: lift, glow: Math.max(gl[k] * 0.5, fin * 0.18) * (k === 0 ? 1 : lift),
        plateA: k === 0 ? 0.45 + 0.55 * tilt : k === 3 ? a4 : lift, fill: k === 0 ? tilt : lift
      };
    };

    // the scene, bottom layer first, each gap drawn just before the layer above it
    for (i = 0; i < 4; i++) {
      var st = stOf(i);
      if (i > 0) drawGap(i - 1, es, Ys, a1, gate);
      if (i === 3 && a4 < 0.003) break;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (i === 0) {
        setLayer(0, 0, 0); drawLayer(0, st, a1);
        if (tileA > 0.003) { // the hall building as the plan shows it, part of the ground: shrunk, roof on
          var stT = stOf(2); stT.e = 0; stT.b = st.b; stT.glow = st.glow; stT.plateA = 0;
          setLayer(2, 0, 0); drawLayer(2, stT, a1 * tileA);
        }
        continue;
      }
      if (i === 2) {
        if (arr > 0.003) { // the full hall, arriving from above, lighting up as it lands
          st.plateA = 1; st.fill = 1; st.glow = Math.max(gl[2] * 0.5, fin * 0.18);
          setLayer(2, 1, Yh); drawLayer(2, st, a1 * smooth(arr * 1.6));
        }
        continue;
      }
      setLayer(i, es[i], Ys[i]);
      drawLayer(i, st, a1 * (i === 3 ? a4 : 1));
    }
    // gas and power pulses on the plan (until it lifts apart)
    var pa = a1 * (1 - lift);
    if (pa > 0.01) {
      setLayer(0, 0, 0);
      var gp = pointAt(gasPath.p, gasPath.L, (p * 9) % 1), ep = pointAt(powerPath.p, powerPath.L, (p * 9 + 0.5) % 1);
      [gp, ep].forEach(function (q) { var s2 = pj(QX(q.x), 0, QZ(q.y)); pulse(s2[0], s2[1], pa); });
    }
    drawSpinePulses(es, Ys, a1, p, gate);
    drawLabels(t0, a0, a1 * (1 - smooth(tilt * 4)));

    // the black hole sits above the top plane
    setLayer(3, 0, Y3);
    var hc = pj(0, HOLE_LIFT, 0);
    hole.x = hc[0]; hole.y = hc[1]; hole.a = a4 * a1; spx = SYM * cam.s;
    placeHole();

    var idx = still ? -1 : slideFor(p);
    if (idx !== lastIdx || force) {
      lastIdx = idx;
      for (var k = 0; k < slides.length; k++) slides[k].classList.toggle("on", idx === -1 || k === idx);
      for (var m = 0; m < ticks.length; m++) ticks[m].classList.toggle("on", idx === -1 || m < idx);
    }
  }
  function pulse(x, y, a) {
    if (BLUR) { ctx.save(); ctx.globalAlpha = a * 0.6 * GLK; ctx.fillStyle = "rgb(" + INKC + ")"; ctx.filter = "blur(5px)"; ctx.beginPath(); ctx.arc(x, y, 6, 0, 6.2832); ctx.fill(); ctx.restore(); }
    ctx.globalAlpha = a; ctx.fillStyle = light ? "rgb(" + INKC + ")" : "#fff"; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1;
  }
  // Risers: gas up from the ground to the generator yard, power up from the yard to the hall.
  var RISERS = [
    { lo: [0, [QX(876), QZ(818)]], hi: [1, [QX(842.4), QZ(551.2)]] },
    { lo: [1, [QX(815), QZ(311)]], hi: [2, [HX(830), HZ(164)]] }
  ];
  function riserEnds(g, es, Ys) {
    var r = RISERS[g];
    setLayer(r.lo[0], es[r.lo[0]], Ys[r.lo[0]]); var a = world(r.lo[1][0], 0, r.lo[1][1]);
    setLayer(r.hi[0], es[r.hi[0]], Ys[r.hi[0]]); var b = world(r.hi[1][0], 0, r.hi[1][1]);
    return [a, b];
  }
  function drawGap(g, es, Ys, sceneA, gate) {
    if (g > 1) return; // nothing rises from the hall but the black hole
    var up = smooth((gate[g + 1] - 0.8) / 0.2);
    if (up < 0.02) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    setLayer(0, 0, 0);
    var e = riserEnds(g, es, Ys);
    setLayer(0, 0, 0);
    // faint corner columns
    ctx.globalAlpha = sceneA * up;
    ctx.beginPath();
    [[-1, -ZP], [1, -ZP], [-1, ZP], [1, ZP]].forEach(function (q) { pl([[q[0], Ys[g], q[1]], [q[0], Ys[g + 1] - 0.03, q[1]]]); });
    ctx.lineWidth = 1; ctx.strokeStyle = "rgba(" + INKC + ",.22)"; ctx.setLineDash([2, 6]); ctx.stroke(); ctx.setLineDash([]);
    // the riser itself, with a glow
    ctx.beginPath(); pl([e[0], e[1]]);
    if (BLUR) { ctx.save(); ctx.globalAlpha = sceneA * up * 0.5 * GLK; ctx.strokeStyle = "rgb(" + INKC + ")"; ctx.lineWidth = 6; ctx.filter = "blur(4px)"; ctx.stroke(); ctx.restore(); }
    ctx.globalAlpha = sceneA * up; ctx.strokeStyle = "rgb(" + INKC + ")"; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }
  function drawSpinePulses(es, Ys, sceneA, p, gate) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (var g = 0; g < 2; g++) {
      var up = smooth((gate[g + 1] - 0.85) / 0.15);
      if (up < 0.02) continue;
      var e = riserEnds(g, es, Ys);
      setLayer(0, 0, 0);
      for (var k = 0; k < 2; k++) {
        var tt = (p * 7 + k / 2 + g * 0.25) % 1, q = pj(lerp(e[0][0], e[1][0], tt), lerp(e[0][1], e[1][1], tt), lerp(e[0][2], e[1][2], tt));
        pulse(q[0], q[1], sceneA * up * Math.sin(Math.PI * tt));
      }
    }
  }

  /* =====================================================================
     THE BLACK HOLE: the home hero's symbol and its lensed horizon (ported from site.js via the layers preview)
     ===================================================================== */
  var symEl, halo, core, glows, symN = 0;
  function symbol() {
    // the hero's own two tones (site.js symbol(tone))
    var id = "CB" + (symN++), c = light ? "#0B0C0E" : "#F3F4F6", coreC = light ? "#050506" : "#FFFFFF", glowC = light ? "#3A3D42" : "#D9DCE1";
    var stops = light ? ["#050506", "#5A5E66", "#0B0C0E", "#3A3D42", "#1A1B1E", "#5A5E66"] : ["#FFFFFF", "#B9BDC4", "#F3F4F6", "#8E939B", "#E6E8EB", "#A9ADB4"];
    var fade = function (d) {
      return '<linearGradient id="' + id + d + '" x1="0" y1="0" x2="' + (d === "h" ? 1 : 0) + '" y2="' + (d === "h" ? 0 : 1) + '"><stop offset="0" stop-color="' + c + '" stop-opacity="0"/><stop offset=".5" stop-color="' + c + '"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></linearGradient>';
    };
    var rg = function (cls, cx, cy, op, dur, rev) {
      return '<g class="' + cls + '"><animateTransform attributeName="transform" type="rotate" from="' + (rev ? 360 : 0) + ' 0 0" to="' + (rev ? 0 : 360) + ' 0 0" dur="' + dur + 's" repeatCount="indefinite"/>' +
        '<circle class="glow" cx="' + cx + '" cy="' + cy + '" r="100" stroke="' + glowC + '" stroke-width="32" filter="url(#' + id + 'b)"/>' +
        '<circle class="ring" cx="' + cx + '" cy="' + cy + '" r="100" stroke="url(#' + id + 'p)" stroke-width="2.4" opacity="' + op + '"/></g>';
    };
    return '<svg class="sym" viewBox="-130 -130 260 260" aria-hidden="true"><defs>' + fade("h") + fade("v") +
      '<filter id="' + id + 'b" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="12"/></filter>' +
      '<filter id="' + id + 's" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5"/></filter>' +
      '<linearGradient id="' + id + 'p" gradientUnits="userSpaceOnUse" x1="-110" y1="-110" x2="110" y2="110">' +
      stops.map(function (s, i) { return '<stop offset="' + (i / 5) + '" stop-color="' + s + '"/>'; }).join("") +
      '<animateTransform attributeName="gradientTransform" type="rotate" from="0 0 0" to="360 0 0" dur="14s" repeatCount="indefinite"/></linearGradient></defs>' +
      '<g fill="none">' + rg("r1", 0, -7, .55, 26) + rg("r2", 6, 4, 1, 34, true) + rg("r3", -6, 4, .55, 30) + "</g>" +
      '<circle r="2.2" fill="' + coreC + '" opacity=".9"><animateMotion dur="9s" repeatCount="indefinite" path="M106 4a100 100 0 1 0-200 0a100 100 0 1 0 200 0"/></circle>' +
      '<circle r="1.6" fill="' + coreC + '" opacity=".5"><animateMotion dur="14s" repeatCount="indefinite" path="M-106 4a100 100 0 1 1 200 0a100 100 0 1 1-200 0"/></circle>' +
      '<rect class="fh" x="-70" y="-.8" width="140" height="1.6" fill="url(#' + id + 'h)"/>' +
      '<rect class="fv" x="-.8" y="-30" width="1.6" height="60" fill="url(#' + id + 'v)"/>' +
      '<circle class="halo" r="10" fill="' + coreC + '" filter="url(#' + id + 's)"/><circle class="core" r="3.5" fill="' + coreC + '"/></svg>';
  }
  function mountSymbol() {
    if (!holeBox) return;
    holeBox.innerHTML = symbol();
    symEl = holeBox.querySelector(".sym"); halo = symEl.querySelector(".halo"); core = symEl.querySelector(".core");
    glows = [].slice.call(symEl.querySelectorAll(".glow"));
    if (reduce.matches && symEl.pauseAnimations) { symEl.pauseAnimations(); symEl.setCurrentTime(0); }
  }
  var wasHidden = true;
  function placeHole() {
    if (!holeBox) return;
    holeBox.style.width = spx.toFixed(1) + "px";
    holeBox.style.transform = "translate(" + (hole.x - spx / 2).toFixed(1) + "px," + (hole.y - spx / 2).toFixed(1) + "px)";
    holeBox.style.opacity = hole.a.toFixed(3);
    var vis = hole.a > 0.003;
    holeBox.style.visibility = vis ? "visible" : "hidden";
    if (vis && wasHidden && !reduce.matches) mountSymbol(); // replay the rings drawing in, as on the hero
    wasHidden = !vis;
    hole.vis = vis;
    loopCheck();
    if (!running) drawHole(0, 0);
  }
  var INKS = { dark: [243, 244, 246], light: [11, 12, 14] }, INK = INKS.dark, LINES = [0, -0.1, 0.1], REACH = 2.6, energy = 0;
  function rgba(al) { return "rgba(" + INK[0] + "," + INK[1] + "," + INK[2] + "," + Math.max(0, al).toFixed(3) + ")"; }
  function grain(fresh) {
    var life = 6 + Math.random() * 8;
    return { r: 0.5 + Math.random() * (fresh ? 1.1 : 0.35), a: Math.random() * 6.2832, v: 0.02 + Math.random() * 0.05,
      y: (Math.random() - 0.5) * 0.05, s: 0.7 + Math.random() * 0.8, o: 0.3 + Math.random() * 0.4, life: life, t: fresh ? Math.random() * life : 0 };
  }
  var dust = [], motes = [], runners = [], i0;
  for (i0 = 0; i0 < 5; i0++) dust.push(grain(true));
  for (i0 = 0; i0 < (innerWidth < 720 ? 50 : 110); i0++) motes.push({ x: Math.random(), y: Math.random(), ph: Math.random(), o: Math.random(), s: 0.6 + Math.random() * 1.1 });
  for (i0 = 0; i0 < 4; i0++) runners.push({ u: Math.random(), sp: 0.12 + Math.random() * 0.06, o: 0.25 + Math.random() * 0.15 });

  function drawHole(dt, t) {
    if (!fctx) return;
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fctx.clearRect(0, 0, W, H);
    var A = hole.a;
    if (A < 0.003) return;
    INK = light ? INKS.light : INKS.dark;
    var cx = hole.x, cy = hole.y, Ss = spx, E = 0.44 * Ss;
    function lens(x, y) { var b = Math.hypot(x, y) || 0.001, kk = (b + Math.sqrt(b * b + 4 * E * E)) / 2 / b; return [cx + x * kk, cy + y * kk]; }
    var bg = fctx.createRadialGradient(cx, cy, 0, cx, cy, Ss * 1.05);
    bg.addColorStop(0, "rgba(" + BGC + "," + A.toFixed(3) + ")"); bg.addColorStop(0.62, "rgba(" + BGC + "," + A.toFixed(3) + ")"); bg.addColorStop(1, "rgba(" + BGC + ",0)");
    fctx.fillStyle = bg; fctx.fillRect(cx - Ss * 1.1, cy - Ss * 1.1, Ss * 2.2, Ss * 2.2);
    fctx.fillStyle = rgba(1);
    fctx.globalAlpha = A; // (the section-wide dust replaces the hole's own motes)
    var breathe = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI / 5.5);
    var Lr = Math.min(REACH * Ss, W * 0.48), gw = 0.75 + 0.25 * breathe;
    var grad = function (al) {
      var g = fctx.createLinearGradient(cx - Lr, 0, cx + Lr, 0);
      g.addColorStop(0, rgba(0)); g.addColorStop(0.3, rgba(al * 0.35)); g.addColorStop(0.5, rgba(al)); g.addColorStop(0.7, rgba(al * 0.35)); g.addColorStop(1, rgba(0));
      return g;
    };
    LINES.forEach(function (off) {
      var main = off === 0, base = (main ? 0.9 : 0.4) * gw;
      fctx.beginPath();
      for (var x = -Lr, n = 0; x <= Lr; x += 3, n++) { var q = lens(x, off * Ss); n ? fctx.lineTo(q[0], q[1]) : fctx.moveTo(q[0], q[1]); }
      if (BLUR) { fctx.save(); fctx.strokeStyle = grad(base * 0.35); fctx.lineWidth = main ? 7 : 4; fctx.filter = "blur(4px)"; fctx.stroke(); fctx.restore(); }
      fctx.strokeStyle = grad(base); fctx.lineWidth = main ? 1.2 : 0.8; fctx.stroke();
    });
    energy = Math.max(energy, 0.45 * breathe);
    fctx.fillStyle = rgba(1);
    dust.forEach(function (g, k) {
      g.t += dt; if (g.t > g.life) { g = dust[k] = grain(false); }
      g.a -= dt * 0.42 / Math.pow(g.r, 1.5); g.r += dt * g.v;
      var q = lens(Math.cos(g.a) * g.r * Ss, Math.sin(g.a) * g.r * Ss * 0.22 + g.y * Ss);
      var edge = Math.max(0, 1 - Math.abs(q[0] - cx) / Lr);
      var al = Math.sin(Math.PI * g.t / g.life) * g.o * edge * (0.8 + 0.2 * breathe) * A;
      if (al < 0.01) return;
      fctx.globalAlpha = al; fctx.beginPath(); fctx.arc(q[0], q[1], g.s, 0, 6.2832); fctx.fill();
    });
    runners.forEach(function (g) {
      g.u = (g.u + dt * g.sp) % 1;
      for (var j = 0; j < 4; j++) {
        var u = g.u - j * 0.006; if (u < 0) u += 1;
        var tp = u < 0.5, fr = tp ? u * 2 : (u - 0.5) * 2, x = (tp ? 1 - 2 * fr : -1 + 2 * fr) * Lr * 0.95;
        var q = lens(x, (tp ? -0.1 : 0.1) * Ss);
        var al = (1 - j / 4) * g.o * smooth((1 - Math.abs(x) / (Lr * 0.95)) / 0.2) * A;
        if (al < 0.01) continue;
        fctx.globalAlpha = al; fctx.beginPath(); fctx.arc(q[0], q[1], j ? 0.8 : 1.1, 0, 6.2832); fctx.fill();
      }
    });
    fctx.globalAlpha = 1;
    energy *= Math.exp(-dt * 1.4);
    var e = Math.min(1, energy + 0.12 * breathe);
    if (halo) {
      halo.style.opacity = (0.3 + 0.55 * e).toFixed(3); halo.style.transform = "scale(" + (1 + 0.7 * e).toFixed(3) + ")";
      core.style.transform = "scale(" + (1 + 0.25 * e).toFixed(3) + ")";
      glows.forEach(function (gl) { gl.style.opacity = (0.08 + 0.18 * e).toFixed(3); });
    }
  }
  /* ---------- ambient dust over the whole section (the original particle story's background grains) ---------- */
  var grains = [], DW = 1, DH = 1, ddpr = 1;
  (function () {
    for (var b = 0, nb = innerWidth < 720 ? 700 : 1600; b < nb; b++)
      grains.push({ r3: Math.random(), ph: Math.random(), sx: Math.random(), sy: Math.random(), s: 0.6 + Math.random() * 1.1 });
  })();
  function sizeDust() {
    if (!dustC) return;
    var r = dustC.getBoundingClientRect();
    ddpr = Math.min(window.devicePixelRatio || 1, 2); DW = Math.max(1, r.width); DH = Math.max(1, r.height);
    dustC.width = Math.round(DW * ddpr); dustC.height = Math.round(DH * ddpr);
  }
  function drawDust(t) {
    if (!dctx) return;
    dctx.setTransform(ddpr, 0, 0, ddpr, 0, 0);
    dctx.clearRect(0, 0, DW, DH);
    // black: light specks as on the site; white: dark grey specks, a little stronger so they still show
    dctx.fillStyle = light ? "rgb(58,61,66)" : "rgb(236,238,241)";
    var k = light ? 1 : 0.8;
    for (var i = 0; i < grains.length; i++) {
      var g = grains[i];
      dctx.globalAlpha = (0.2 + 0.5 * g.r3 * (0.6 + 0.4 * Math.sin(t * 1.3 + g.ph * 40))) * k;
      dctx.fillRect(g.sx * DW + Math.sin(t * 0.15 + g.ph * 6) * 16, g.sy * DH + Math.cos(t * 0.12 + g.ph * 5) * 16, g.s, g.s);
    }
    dctx.globalAlpha = 1;
  }

  var inView = false, running = false, last = 0, lastT = 0;
  function loop(tm) {
    if (!running) return;
    var dt = Math.min(0.05, (tm - last) / 1000 || 0); last = tm; lastT = tm / 1000;
    glide(dt);
    drawDust(lastT);
    drawHole(dt, lastT);
    requestAnimationFrame(loop);
  }
  function loopCheck() {
    var want = inView && !reduce.matches;
    if (want && !running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
    else if (!want) running = false;
  }

  /* ---------- sizing and scroll wiring ---------- */
  function resize() {
    var r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, r.width); H = Math.max(1, r.height); phone = W < 600;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    if (fx) { fx.style.width = W + "px"; fx.style.height = H + "px"; fx.width = canvas.width; fx.height = canvas.height; }
    sizeDust(); drawDust(lastT);
    render(true);
  }
  // the site's black/white toggle: redraw everything in the new tone at once, on screen or not
  function onTheme() {
    readTheme();
    var shown = holeBox && holeBox.style.visibility === "visible";
    mountSymbol();
    if (!shown) wasHidden = true;
    drawDust(lastT);
    render(true);
    drawHole(0, lastT);
  }
  document.addEventListener("ac-theme", onTheme);
  if (window.MutationObserver) new MutationObserver(function () { if ((document.documentElement.getAttribute("data-theme") === "light") !== light) onTheme(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  function progress() {
    var r = track.getBoundingClientRect(), span = r.height - window.innerHeight;
    return span > 0 ? clamp(-r.top / span, 0, 1) : 0;
  }
  // The drawing glides toward the scroll position (about a fifth of a second to catch up), so a wheel
  // notch becomes a smooth move instead of a jump. Off screen it simply snaps to where the page is.
  var shown = null;
  function shownP() { if (shown === null) shown = progress(); return shown; }
  function glide(dt) {
    var target = progress(), d = target - shownP();
    if (Math.abs(d) < 0.00005) { if (d !== 0) { shown = target; render(false); } return; }
    shown += d * (1 - Math.exp(-dt * 11));
    render(false);
  }
  var queued = false;
  function onScroll() {
    if (running) return; // the running loop eases toward the new position
    shown = null;
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; render(false); });
  }
  sec.classList.add("mz-live");
  mountSymbol();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", resize);
  if (window.ResizeObserver) { var ro = new ResizeObserver(resize); ro.observe(canvas); if (dustC) ro.observe(dustC); }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) { inView = en[0].isIntersecting; if (inView && !running) shown = null; loopCheck(); if (inView) render(false); }).observe(track);
  } else inView = true;
  if (reduce.addEventListener) reduce.addEventListener("change", function () { mountSymbol(); resize(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { render(true); });
  resize();
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

// What we do (Circuit): the four things we bring are wired into the tenant's hardware. A dot of energy runs
// down each wire in turn, each card lights as its dot runs, and the hardware lights when all four arrive.
// Hovering a card speeds its icon up. Wires are measured from the layout, so they redraw on resize.
(function () {
  if (!document.querySelector('[data-circ]')) return;
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function speed(el, r) { el.querySelectorAll('.picon').forEach(function (s) { if (s.getAnimations) s.getAnimations({ subtree: true }).forEach(function (a) { a.playbackRate = r; }); }); }
  function hit(el) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); speed(el, 2.6); setTimeout(function () { speed(el, 1); }, 1600); }
  // ---- B. Circuit: wires from each card into the hardware; a dot of energy runs down each in turn ----
  var circ = document.querySelector('[data-circ]');
  if (circ) {
    var svg = circ.querySelector('.circ-wires'), cards = [].slice.call(circ.querySelectorAll('.circ-card')), hwB = circ.querySelector('.circ-hw');
    var NS = 'http://www.w3.org/2000/svg', paths = [], dots = [];
    function layout() {
      svg.innerHTML = ''; paths = []; dots = [];
      var c = circ.getBoundingClientRect(), chip = hwB.querySelector('.picon').getBoundingClientRect();
      svg.setAttribute('viewBox', '0 0 ' + c.width + ' ' + c.height);
      var narrow = innerWidth < 1000, hr = hwB.getBoundingClientRect();
      cards.forEach(function (card, k) {
        var r = card.getBoundingClientRect(), ic = card.querySelector('.picon').getBoundingClientRect();
        if (narrow) {
          // Phone: two cards above the hardware, two below; a short wire drops from each card straight into it.
          var wx = r.left + r.width / 2 - c.left, top = k < 2;
          var q = document.createElementNS(NS, 'path');
          q.setAttribute('d', 'M' + wx + ' ' + ((top ? r.bottom : r.top) - c.top) + 'V' + ((top ? hr.top : hr.bottom) - c.top));
          svg.appendChild(q); paths.push(q); return;
        }
        var left = k === 0 || k === 2, y0 = ic.top + ic.height / 2 - c.top;
        var x0 = (left ? r.right + 6 : r.left - 6) - c.left;
        var x1 = (left ? chip.left - 6 : chip.right + 6) - c.left, y1 = chip.top + chip.height / 2 - c.top + (k < 2 ? -14 : 14);
        var mx = (x0 + x1) / 2;
        var p = document.createElementNS(NS, 'path');
        p.setAttribute('d', 'M' + x0 + ' ' + y0 + 'H' + mx + 'V' + y1 + 'H' + x1);
        svg.appendChild(p); paths.push(p);
      });
      paths.forEach(function () {
        var g = document.createElementNS(NS, 'g'), h = document.createElementNS(NS, 'circle'), d = document.createElementNS(NS, 'circle');
        h.setAttribute('r', 9); h.setAttribute('class', 'halo'); d.setAttribute('r', 2.6); d.setAttribute('class', 'dot');
        g.appendChild(h); g.appendChild(d); g.style.opacity = 0; svg.appendChild(g); dots.push(g);
      });
    }
    var TB = 7, lastB = -1, hitB = false;
    function tickB(now) {
      var s = now / 1000, cyc = Math.floor(s / TB), t = s - cyc * TB, wide = innerWidth >= 1000;
      if (cyc !== lastB) { lastB = cyc; hitB = false; cards.forEach(function (c) { c.classList.remove('lit', 'kept'); }); paths.forEach(function (p) { p.classList.remove('on'); }); }
      cards.forEach(function (card, k) {
        var a = k * 0.9, f = (t - a) / 1.2, on = f >= 0 && f < 1;
        if (on !== card.classList.contains('lit')) { card.classList.toggle('lit', on); speed(card, on ? 2.6 : 1); if (on) card.classList.add('kept'); }
        if (paths[k]) {
          var g = dots[k];
          if (on) { var L = paths[k].getTotalLength(), pt = paths[k].getPointAtLength(L * (f * f * (3 - 2 * f))); g.setAttribute('transform', 'translate(' + pt.x + ' ' + pt.y + ')'); g.style.opacity = Math.min(1, f * 8, (1 - f) * 8); }
          else g.style.opacity = 0;
          if (f >= 1) paths[k].classList.add('on');
        }
      });
      if (!hitB && t > 3 * 0.9 + 1.2) { hitB = true; hit(hwB); }
      requestAnimationFrame(tickB);
    }
    layout(); addEventListener('resize', layout); addEventListener('load', layout); setTimeout(layout, 600);
    cards.concat(hwB).forEach(function (el) {
      el.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') speed(el, 3); });
      el.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') speed(el, 1); });
    });
    if (!still) requestAnimationFrame(tickB);
  }

})();

// Submit a site. Posts to the private intake endpoint in its site_submission format when
// data-intake-url is set; until then (or for Canada, which the endpoint does not take yet)
// it opens the visitor's email app with the same details.
(function () {
  var form = document.querySelector('[data-site-form]');
  if (!form) return;
  var note = form.querySelector('[data-site-note]');
  var SOURCE = { pipeline: 'natural_gas', gathering: 'natural_gas', landfill: 'landfill_gas', flare: 'flare_gas', plant: 'unknown', industrial: 'industrial_surplus', other: 'other' };
  var LABEL = { pipeline: 'Pipeline gas', gathering: 'Gathering-system gas', landfill: 'Landfill gas', flare: 'Flare or stranded gas', plant: 'An existing power plant', industrial: 'An industrial site', other: 'Something else' };
  var CONTRACT = { none: 'not sold today', short: 'sold, ending within 3 years', long: 'sold, for longer than 3 years', unsure: 'not sure' };
  function say(msg) { note.textContent = ''; note.insertAdjacentHTML('beforeend', msg); note.hidden = false; }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }
  var key = null;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    var d = new FormData(form);
    if (d.get('website')) return;
    var g = function (k) { return String(d.get(k) || '').trim(); };
    var size = g('size'), unit = g('unit'), src = g('source');
    var details = [
      'Energy: ' + LABEL[src] + (size ? ', about ' + size + ' ' + unit : ''),
      'Sold today: ' + CONTRACT[g('contract')],
      'Gas pipeline: ' + g('pipe'),
      'Fiber: ' + g('fiber'),
      'Land: ' + (g('acres') ? g('acres') + ' acres' : 'not given'),
      'Coordinates: ' + (g('coords') || 'not given'),
      'Role: ' + g('role')
    ];
    var where = g('place') + ', ' + g('state') + (g('country') === 'CA' ? ', Canada' : '');
    var url = form.getAttribute('data-intake-url');
    function mail() {
      var body = ['Name: ' + g('name'), 'Company: ' + g('org'), 'Email: ' + g('email'), 'Phone: ' + g('phone'), 'Where: ' + where, 'Authority: ' + g('authority'), ''].concat(details, ['', g('notes')]);
      var to = form.getAttribute('data-mail-to');
      window.location.href = 'mailto:' + to + '?subject=' + encodeURIComponent('Site submission: ' + where) + '&body=' + encodeURIComponent(body.join('\n'));
      say('Your email app should now be open with the details ready to send. If not, write to <a href="mailto:' + to + '">' + to + '</a>.');
    }
    if (!url || g('country') !== 'US') return mail();
    var payload = {
      service: 'site_submission',
      contact: { name: g('name'), email: g('email'), phone: g('phone'), company: g('org') },
      brief: {
        country: 'US', geography: where, siteDetails: details.join('\n'), notes: g('notes'),
        sourceTypes: [SOURCE[src]], authority: g('role') + ': ' + g('authority'),
        power: { value: size && unit === 'MW' ? Number(size) : null, unit: 'MW' },
        upfrontBudget: { amount: null, currency: 'unknown' }
      },
      attribution: { source: 'accretioncompute.com', medium: 'submit_a_site', campaign: '', referrer: document.referrer || '', landingPath: location.pathname },
      consent: true, website: ''
    };
    key = key || uuid();
    var btn = form.querySelector('button[type=submit]'); btn.disabled = true;
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok && res.j.received) { form.reset(); key = null; say('Thank you. We have your site details and will reply by email, usually within a few business days.'); }
        else { btn.disabled = false; say('That did not go through. Please try again, or write to <a href="mailto:contact@accretioncompute.com">contact@accretioncompute.com</a>.'); }
      })
      .catch(function () { btn.disabled = false; say('That did not go through. Please try again, or write to <a href="mailto:contact@accretioncompute.com">contact@accretioncompute.com</a>.'); });
  });
})();
