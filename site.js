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
