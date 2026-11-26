/* Menugedrag voor de pagina's die momenti-nav.css gebruiken. */
(function () {
  'use strict';
  var nav = document.querySelector('nav.site-nav');
  var hamburger = document.getElementById('hamburger');
  var overlay = document.getElementById('navOverlay');
  if (!nav || !hamburger || !overlay) return;

  window.closeMenu = function () {
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    overlay.style.display = 'none';
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  };
  hamburger.addEventListener('click', function () {
    if (hamburger.classList.contains('open')) { window.closeMenu(); return; }
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    overlay.style.display = 'flex';
    requestAnimationFrame(function () { overlay.classList.add('open'); });
    document.body.style.overflow = 'hidden';
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') window.closeMenu(); });

  /* Pagina's zonder eigen taalmenu-script (zoals 404). */
  if (typeof window.toggleLangMenu !== 'function') {
    window.toggleLangMenu = function (btn) {
      var wrap = btn.closest('.nav-lang-switch');
      btn.setAttribute('aria-expanded', wrap.classList.toggle('open') ? 'true' : 'false');
    };
    document.addEventListener('click', function (e) {
      document.querySelectorAll('.nav-lang-switch.open').forEach(function (w) {
        if (!w.contains(e.target)) w.classList.remove('open');
      });
    });
  }

  /* Lichte tekst zodra het menu boven een donker vlak (zoals de footer) staat. */
  var dark = document.querySelectorAll('footer, .site-dark');
  function update() {
    var y = 97, onDark = false;
    dark.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top <= y && r.bottom >= y) onDark = true;
    });
    nav.classList.toggle('nav--light', onDark);
    nav.classList.toggle('nav--scrolled', window.scrollY > 40);
  }
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
})();
