/* Momenti - cookietoestemming
 *
 * GA4 wordt NIET geladen tot de bezoeker expliciet toestemming geeft.
 * Dit is bewust geen Consent Mode-variant waarbij gtag alvast laadt: hier
 * komt er geen enkel verzoek naar Google voordat er op "Accepteren" is geklikt.
 *
 * Keuze wordt bewaard in localStorage onder 'momenti-consent' ('granted' | 'denied').
 * Intrekken kan via een link met data-consent-reopen (staat in de footer).
 */
(function () {
  'use strict';

  var GA_ID = 'G-7WL128RHD9';
  var KEY = 'momenti-consent';
  var PRIVACY_URL = '/privacy';

  function readChoice() {
    try { return window.localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function saveChoice(value) {
    try { window.localStorage.setItem(KEY, value); } catch (e) { /* private mode: keuze geldt alleen deze sessie */ }
  }

  function loadAnalytics() {
    if (window.__momentiAnalyticsLoaded) return;
    window.__momentiAnalyticsLoaded = true;

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });
  }

  function injectStyles() {
    if (document.getElementById('momenti-consent-style')) return;
    var css = [
      '.mc-banner{position:fixed;left:20px;bottom:20px;z-index:9999;width:min(380px,calc(100vw - 40px));',
      'background:#0D0E1C;color:#EDE8DC;border:1px solid rgba(196,168,130,0.28);border-radius:14px;',
      'padding:22px 24px;box-shadow:0 18px 48px -18px rgba(0,0,0,0.7);',
      "font-family:'DM Sans',system-ui,-apple-system,sans-serif;}",
      '.mc-banner h2{margin:0 0 8px;font-family:\'Cormorant Garamond\',Georgia,serif;font-weight:500;',
      'font-size:21px;line-height:1.25;color:#EDE8DC;}',
      '.mc-banner p{margin:0 0 16px;font-size:13.5px;line-height:1.65;opacity:0.72;font-weight:300;}',
      '.mc-banner a.mc-link{color:#C4A882;text-decoration:none;border-bottom:1px solid rgba(196,168,130,0.4);}',
      '.mc-banner a.mc-link:hover,.mc-banner a.mc-link:focus-visible{border-bottom-color:#C4A882;}',
      '.mc-actions{display:flex;gap:10px;flex-wrap:wrap;}',
      '.mc-btn{flex:1 1 auto;cursor:pointer;font-family:inherit;font-size:10.5px;font-weight:500;',
      'letter-spacing:0.11em;text-transform:uppercase;padding:12px 16px;border-radius:999px;',
      'transition:background .18s,color .18s,border-color .18s;}',
      '.mc-accept{background:#C4A882;color:#0D0E1C;border:1px solid #C4A882;}',
      '.mc-accept:hover{background:#EDE8DC;border-color:#EDE8DC;}',
      '.mc-deny{background:transparent;color:#EDE8DC;border:1px solid rgba(237,232,220,0.3);}',
      '.mc-deny:hover{border-color:#EDE8DC;}',
      '.mc-btn:focus-visible{outline:2px solid #C4A882;outline-offset:3px;}',
      '@media (max-width:520px){.mc-banner{left:12px;right:12px;bottom:12px;width:auto;padding:20px;}}',
      '@media (prefers-reduced-motion:no-preference){',
      '.mc-banner{animation:mcIn .32s cubic-bezier(0.23,1,0.32,1);}',
      '@keyframes mcIn{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;}}}'
    ].join('');
    var el = document.createElement('style');
    el.id = 'momenti-consent-style';
    el.textContent = css;
    document.head.appendChild(el);
  }

  function removeBanner() {
    var b = document.querySelector('.mc-banner');
    if (b && b.parentNode) b.parentNode.removeChild(b);
  }

  function showBanner() {
    if (document.querySelector('.mc-banner')) return;
    injectStyles();

    var wrap = document.createElement('div');
    wrap.className = 'mc-banner';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-labelledby', 'mc-title');
    wrap.setAttribute('aria-describedby', 'mc-desc');

    var h = document.createElement('h2');
    h.id = 'mc-title';
    h.textContent = 'Cookies';

    var p = document.createElement('p');
    p.id = 'mc-desc';
    p.appendChild(document.createTextNode(
      'We gebruiken alleen analytische cookies om te zien hoe de site gebruikt wordt. ' +
      'Er wordt niets geladen zolang je geen keuze hebt gemaakt. Meer hierover in ons '
    ));
    var a = document.createElement('a');
    a.className = 'mc-link';
    a.href = PRIVACY_URL;
    a.textContent = 'privacybeleid';
    p.appendChild(a);
    p.appendChild(document.createTextNode('.'));

    var actions = document.createElement('div');
    actions.className = 'mc-actions';

    var accept = document.createElement('button');
    accept.type = 'button';
    accept.className = 'mc-btn mc-accept';
    accept.textContent = 'Accepteren';
    accept.addEventListener('click', function () {
      saveChoice('granted');
      removeBanner();
      loadAnalytics();
    });

    var deny = document.createElement('button');
    deny.type = 'button';
    deny.className = 'mc-btn mc-deny';
    deny.textContent = 'Alleen noodzakelijk';
    deny.addEventListener('click', function () {
      saveChoice('denied');
      removeBanner();
    });

    actions.appendChild(accept);
    actions.appendChild(deny);
    wrap.appendChild(h);
    wrap.appendChild(p);
    wrap.appendChild(actions);
    document.body.appendChild(wrap);
    accept.focus();
  }

  function bindReopen() {
    document.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-consent-reopen]') : null;
      if (!t) return;
      e.preventDefault();
      try { window.localStorage.removeItem(KEY); } catch (err) { /* niets te wissen */ }
      showBanner();
    });
  }

  function init() {
    bindReopen();
    var choice = readChoice();
    if (choice === 'granted') { loadAnalytics(); return; }
    if (choice === 'denied') return;
    showBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
