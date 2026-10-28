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

// Home hero: a living logo with a glowing horizon bent around it, a few grains of dust, and a black/white switch.
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var hero = document.querySelector('[data-hero]');
    var canvas = hero && hero.querySelector('.hero-canvas');
    var logo = hero && hero.querySelector('.alogo');
    if (!canvas || !canvas.getContext || !logo) return;
    var ctx = canvas.getContext('2d');
    var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    var theme = 'dark';
    try { if (localStorage.getItem('ac-theme') === 'light') theme = 'light'; } catch (e) {}

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

    function grain(fresh) {
      var life = 6 + Math.random() * 8;
      return { r: 0.5 + Math.random() * (fresh ? 1.1 : 0.35), a: Math.random() * 6.2832, v: 0.02 + Math.random() * 0.05,
        y: (Math.random() - 0.5) * 0.05, s: 0.7 + Math.random() * 0.8, o: 0.3 + Math.random() * 0.4, life: life, t: fresh ? Math.random() * life : 0 };
    }
    var dust = [];
    for (var i = 0; i < GRAINS; i++) dust.push(grain(true));

    function mount() {
      hero.classList.toggle('dark', theme === 'dark');
      hero.classList.toggle('light', theme === 'light');
      logo.innerHTML = symbol(theme) + '<div class="wm"></div>';
      var s = logo.querySelector('.sym');
      halo = s.querySelector('.halo'); core = s.querySelector('.core'); glows = [].slice.call(s.querySelectorAll('.glow'));
    }
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2), hr = hero.getBoundingClientRect();
      var c = logo.querySelector('.sym .core').getBoundingClientRect(), sym = logo.querySelector('.sym').getBoundingClientRect();
      w = hr.width; h = hr.height; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = c.left - hr.left + c.width / 2; cy = c.top - hr.top + c.height / 2; S = sym.width; E = 0.44 * S; ink = INK[theme];
    }
    function lens(x, y) { var b = Math.hypot(x, y) || 0.001, k = (b + Math.sqrt(b * b + 4 * E * E)) / 2 / b; return [cx + x * k, cy + y * k]; }
    function rgba(a) { return 'rgba(' + ink[0] + ',' + ink[1] + ',' + ink[2] + ',' + Math.max(0, a).toFixed(3) + ')'; }
    // Nothing is drawn behind the wordmark and headline.
    function clearAt(y) { return y < cy + 0.45 * S ? 1 : Math.max(0, 1 - (y - cy - 0.45 * S) / (0.35 * S)); }

    function frame(dt, t) {
      ctx.clearRect(0, 0, w, h);
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
        for (var x = -L, n = 0; x <= L; x += 3, n++) { var p = lens(x, off * S); n ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
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
        var q = lens(Math.cos(p.a) * p.r * S, Math.sin(p.a) * p.r * S * 0.22 + p.y * S);
        var edge = Math.max(0, 1 - Math.abs(q[0] - cx) / L);
        var a = Math.sin(Math.PI * p.t / p.life) * p.o * edge * clearAt(q[1]) * dim * (0.8 + 0.2 * breathe);
        if (a < 0.01) return;
        ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(q[0], q[1], p.s, 0, 6.2832); ctx.fill();
      });
      ctx.globalAlpha = 1;

      // The logo answers the breath: its core and glow brighten with it.
      energy *= Math.exp(-dt * 1.4);
      var e = Math.min(1, energy + 0.12 * breathe);
      halo.style.opacity = (0.3 + 0.55 * e).toFixed(3); halo.style.transform = 'scale(' + (1 + 0.7 * e).toFixed(3) + ')';
      core.style.transform = 'scale(' + (1 + 0.25 * e).toFixed(3) + ')';
      glows.forEach(function (g) { g.style.opacity = (0.08 + 0.18 * e).toFixed(3); });
    }
    function loop(t) { if (!on) return; var dt = Math.min(0.05, (t - last) / 1000 || 0); last = t; frame(dt, t / 1000); requestAnimationFrame(loop); }

    // Black / white switch
    var sw = document.createElement('div');
    sw.className = 'hero-theme'; sw.setAttribute('role', 'group'); sw.setAttribute('aria-label', 'Hero colour');
    sw.innerHTML = '<button type="button" data-theme="dark">Black</button><button type="button" data-theme="light">White</button>';
    hero.appendChild(sw);
    var buttons = [].slice.call(sw.querySelectorAll('button'));
    function press() { buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-theme') === theme)); }); }
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        theme = b.getAttribute('data-theme');
        try { localStorage.setItem('ac-theme', theme); } catch (e) {}
        press(); mount(); size(); if (still) frame(0, 0);
      });
    });

    mount(); press(); size();
    window.addEventListener('resize', function () { size(); if (still) frame(0, 0); });
    if (still || !('IntersectionObserver' in window)) { frame(0, 0); return; }
    new IntersectionObserver(function (en) {
      var was = on; on = en[0].isIntersecting;
      if (on && !was) { last = performance.now(); requestAnimationFrame(loop); }
    }).observe(hero);
  });
})();
