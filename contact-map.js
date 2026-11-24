/* Momenti - kaart op de contactpagina
 *
 * Google Maps wordt NIET geladen tot de bezoeker zelf op "Kaart laden" klikt.
 * Net als bij de cookietoestemming (zie consent.js) gaat er geen enkel verzoek
 * naar Google voordat daar bewust voor gekozen is. Tot die tijd staat er een
 * statische weergave met een gewone link naar Google Maps.
 *
 * De keuze wordt bewaard in localStorage onder 'momenti-maps' ('granted').
 * Intrekken kan via "Kaart uitschakelen" onder de kaart.
 *
 * LET OP: API_KEY is een browsersleutel en dus per definitie openbaar. De
 * beveiliging zit in de beperkingen in Google Cloud Console (APIs & Services >
 * Credentials > de sleutel): HTTP-referrers https://www.momenti.agency/* en
 * https://momenti.agency/*, en alleen "Maps JavaScript API" toegestaan.
 *
 * De kaart gebruikt geen Map ID: de huisstijl-kleuren komen uit MAP_STYLE
 * hieronder, de speld is een eigen HTML-overlay (OverlayView).
 */
(function () {
  'use strict';

  var API_KEY = 'AIzaSyDANzxgJqkxF7Yjee2r5TPCvkzr19fmWxU';
  var LOCATION = { lat: 52.2037259, lng: 5.3809223 }; // Parnaskruid 80, Amersfoort
  var ZOOM = 16;
  var STORE_KEY = 'momenti-maps';
  var LANG = (document.documentElement.getAttribute('lang') || 'nl').toLowerCase().indexOf('en') === 0 ? 'en' : 'nl';
  var READY_TIMEOUT = 15000;

  // Navy/cream/tan, zelfde palet als de rest van de site.
  var MAP_STYLE = [
    { elementType: 'geometry', stylers: [{ color: '#15162b' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#9a917e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0d0e1c' }, { weight: 3 }] },
    { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#2a2c4d' }] },
    { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d9cfba' }] },
    { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#8a826f' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.park', stylers: [{ visibility: 'on' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#14192c' }] },
    { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#222445' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#15162b' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a826f' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#2a2d52' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#33375f' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1a1b33' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#b3a88f' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a0b17' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4b4f78' }] }
  ];

  var root, ui;
  var map = null;
  var overlay = null;
  var active = false;
  var viaClick = false;
  var apiPromise = null;
  var readyTimer = null;

  function readChoice() {
    try { return window.localStorage.getItem(STORE_KEY); } catch (e) { return null; }
  }
  function saveChoice() {
    try { window.localStorage.setItem(STORE_KEY, 'granted'); } catch (e) { /* private mode: keuze geldt alleen deze sessie */ }
  }
  function clearChoice() {
    try { window.localStorage.removeItem(STORE_KEY); } catch (e) { /* niets te wissen */ }
  }

  function loadApi() {
    if (apiPromise) return apiPromise;
    apiPromise = new Promise(function (resolve, reject) {
      if (window.google && window.google.maps && window.google.maps.importLibrary) { resolve(); return; }
      // Ongeldige of niet-toegestane sleutel: Google roept deze functie aan.
      window.gm_authFailure = function () { fail(); };
      window.__momentiMapsReady = resolve;
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(API_KEY) +
        '&v=weekly&loading=async&language=' + LANG + '&region=NL&callback=__momentiMapsReady';
      s.onerror = function () { reject(new Error('maps-script')); };
      document.head.appendChild(s);
    });
    apiPromise.catch(function () { apiPromise = null; });
    return apiPromise;
  }

  function buildMap() {
    return window.google.maps.importLibrary('maps').then(function (lib) {
      var maps = window.google.maps;
      var MapCtor = lib.Map || maps.Map;
      var OverlayView = lib.OverlayView || maps.OverlayView;

      var center = new maps.LatLng(LOCATION.lat, LOCATION.lng);
      var instance = new MapCtor(ui.canvas, {
        center: center,
        zoom: ZOOM,
        minZoom: 10,
        maxZoom: 19,
        styles: MAP_STYLE,
        backgroundColor: '#15162b',
        disableDefaultUI: true,
        clickableIcons: false,
        gestureHandling: 'cooperative',
        keyboardShortcuts: true
      });

      // Eigen speld: HTML-element dat met de kaart meebeweegt.
      class Pin extends OverlayView {
        constructor(position, el) {
          super();
          this.position = position;
          this.el = el;
        }
        onAdd() { this.getPanes().overlayLayer.appendChild(this.el); }
        draw() {
          var p = this.getProjection().fromLatLngToDivPixel(this.position);
          if (!p) return;
          this.el.style.left = p.x + 'px';
          this.el.style.top = p.y + 'px';
        }
        onRemove() { if (this.el.parentNode) this.el.parentNode.removeChild(this.el); }
      }

      var pinEl = ui.pin.cloneNode(true);
      pinEl.classList.remove('cm-marker--static');
      pinEl.removeAttribute('data-map-pin');
      pinEl.hidden = false;
      var pin = new Pin(center, pinEl);
      pin.setMap(instance);

      return { map: instance, overlay: pin };
    });
  }

  function teardown() {
    clearTimeout(readyTimer);
    if (overlay) { overlay.setMap(null); overlay = null; }
    map = null;
    ui.canvas.innerHTML = '';
    ui.canvas.classList.remove('is-ready');
    ui.canvas.hidden = true;
    ui.zoom.hidden = true;
    ui.off.hidden = true;
    root.removeAttribute('aria-busy');
  }

  function showGate() {
    ui.gate.hidden = false;
    ui.load.disabled = false;
    ui.art.hidden = false;
    ui.pin.hidden = false;
    ui.error.hidden = true;
  }

  function showMap() {
    clearTimeout(readyTimer);
    root.removeAttribute('aria-busy');
    ui.canvas.classList.add('is-ready');
    ui.gate.hidden = true;
    ui.zoom.hidden = false;
    ui.off.hidden = false;
    // De statische weergave blijft nog even staan zodat de overgang vloeiend is.
    setTimeout(function () {
      if (!map) return;
      ui.art.hidden = true;
      ui.pin.hidden = true;
    }, 600);
    if (viaClick) {
      try { ui.zoomIn.focus({ preventScroll: true }); } catch (e) { /* oud browser: focus blijft waar hij is */ }
    }
  }

  function fail() {
    teardown();
    active = false;
    ui.gate.hidden = true;
    ui.art.hidden = false;
    ui.pin.hidden = false;
    ui.error.hidden = false;
  }

  function activate() {
    if (active) return;
    active = true;
    root.setAttribute('aria-busy', 'true');
    ui.error.hidden = true;
    if (viaClick) { ui.load.disabled = true; } else { ui.gate.hidden = true; }
    ui.canvas.hidden = false; // moet zichtbaar zijn (met afmetingen) voordat de kaart wordt gemaakt

    readyTimer = setTimeout(fail, READY_TIMEOUT);
    loadApi().then(buildMap).then(function (res) {
      if (!active) { res.overlay.setMap(null); return; } // ondertussen uitgeschakeld
      map = res.map;
      overlay = res.overlay;
      window.google.maps.event.addListenerOnce(map, 'tilesloaded', showMap);
    }).catch(fail);
  }

  function init() {
    root = document.querySelector('[data-momenti-map]');
    if (!root) return;
    ui = {
      art: root.querySelector('[data-map-art]'),
      canvas: root.querySelector('[data-map-canvas]'),
      pin: root.querySelector('[data-map-pin]'),
      gate: root.querySelector('[data-map-gate]'),
      load: root.querySelector('[data-map-load]'),
      error: root.querySelector('[data-map-error]'),
      zoom: root.querySelector('[data-map-zoom]'),
      zoomIn: root.querySelector('[data-map-zoom-in]'),
      zoomOut: root.querySelector('[data-map-zoom-out]'),
      off: root.querySelector('[data-map-off]')
    };
    for (var k in ui) { if (!ui[k]) return; } // markup onvolledig: laat de statische weergave staan

    ui.load.addEventListener('click', function () {
      viaClick = true;
      saveChoice();
      activate();
    });
    ui.off.addEventListener('click', function () {
      clearChoice();
      teardown();
      active = false;
      viaClick = false;
      showGate();
      try { ui.load.focus({ preventScroll: true }); } catch (e) { /* niets */ }
    });
    ui.zoomIn.addEventListener('click', function () { if (map) map.setZoom((map.getZoom() || ZOOM) + 1); });
    ui.zoomOut.addEventListener('click', function () { if (map) map.setZoom((map.getZoom() || ZOOM) - 1); });

    if (readChoice() === 'granted') {
      // Eerder toestemming gegeven: laden zodra de kaart in beeld komt.
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          for (var i = 0; i < entries.length; i++) {
            if (entries[i].isIntersecting) { io.disconnect(); activate(); break; }
          }
        }, { rootMargin: '300px 0px' });
        io.observe(root);
      } else {
        activate();
      }
    } else {
      showGate();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
