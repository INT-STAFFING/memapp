/* MemAPP — layer PWA (progressive enhancement).
 * Nulla qui è necessario al funzionamento del sito: se il service worker non è disponibile
 * o la registrazione fallisce, l'app resta identica alla versione web classica. */
(() => {
  'use strict';

  const DISMISS_COOKIE = 'memapp-install-dismissed';
  const DISMISS_DAYS   = 30;

  const isStandalone = () =>
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true;

  /* ── Cookie (niente localStorage/sessionStorage per le funzioni PWA) ── */
  function readCookie(name) {
    try { return document.cookie.split('; ').some(c => c.startsWith(name + '=')); } catch (e) { return false; }
  }
  function writeCookie(name) {
    try { document.cookie = `${name}=1; max-age=${DISMISS_DAYS * 86400}; path=/; SameSite=Lax`; } catch (e) { /* cookie bloccati */ }
  }

  /* ── Piattaforma ── */
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // Solo Safari vero: gli altri browser iOS o le webview non offrono "Aggiungi a Home" con le stesse voci di menu.
  const isIOSSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|FBAN|FBAV|Instagram|Line/.test(ua);
  const isAndroid = /Android/i.test(ua);

  /* ── Banner di installazione ── */
  let bannerEl = null;
  let deferredPrompt = null;

  function dismissBanner(restoreFocus) {
    writeCookie(DISMISS_COOKIE);
    if (bannerEl) { bannerEl.remove(); bannerEl = null; }
    if (restoreFocus) {
      const h1 = document.querySelector('h1');
      if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
    }
  }

  function showBanner(kind) {
    if (bannerEl || isStandalone() || readCookie(DISMISS_COOKIE)) return;
    const container = document.querySelector('.container');
    if (!container) return;

    const el = document.createElement('div');
    el.className = 'install-banner';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Installa MemAPP');

    const text = document.createElement('p');
    text.className = 'install-text';
    text.id = 'install-text';
    el.setAttribute('aria-describedby', 'install-text');
    text.textContent = kind === 'ios'
      ? 'Per installare MemAPP: tocca Condividi → Aggiungi a Home.'
      : 'Installa MemAPP sul tuo dispositivo per aprirla come un’app.';
    el.appendChild(text);

    const actions = document.createElement('div');
    actions.className = 'install-actions';

    if (kind === 'prompt') {
      const install = document.createElement('button');
      install.type = 'button';
      install.className = 'fbtn fbtn-solid';
      install.textContent = 'Installa app';
      install.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        const ev = deferredPrompt;
        deferredPrompt = null;
        try {
          await ev.prompt();
          await ev.userChoice;
        } catch (e) { /* prompt annullato o non disponibile */ }
        dismissBanner(true);
      });
      actions.appendChild(install);
    }

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'fbtn fbtn-ghost';
    close.textContent = 'Chiudi';
    close.setAttribute('aria-label', 'Chiudi il banner di installazione');
    close.addEventListener('click', () => dismissBanner(true));
    actions.appendChild(close);

    el.addEventListener('keydown', e => { if (e.key === 'Escape') dismissBanner(true); });
    el.appendChild(actions);

    container.insertBefore(el, container.firstChild);
    bannerEl = el;
  }

  window.addEventListener('beforeinstallprompt', e => {
    // Il banner è pensato per mobile: su desktop si lascia l'icona di installazione del browser.
    if (!isAndroid) return;
    e.preventDefault();
    deferredPrompt = e;
    showBanner('prompt');
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (bannerEl) { bannerEl.remove(); bannerEl = null; }
  });

  if (isIOSSafari && !isStandalone()) {
    const run = () => showBanner('ios');
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  }

  /* ── Service worker + toast di aggiornamento ── */
  let updateRequested = false;

  function showUpdateToast(registration) {
    if (document.getElementById('update-toast')) return;
    const el = document.createElement('div');
    el.id = 'update-toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');

    const msg = document.createElement('span');
    msg.textContent = 'Aggiornamento disponibile';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Ricarica';
    btn.addEventListener('click', () => {
      btn.disabled = true;
      updateRequested = true;
      const waiting = registration.waiting;
      if (waiting) waiting.postMessage({ type: 'SKIP_WAITING' });
      else window.location.reload();
    });
    el.append(msg, btn);
    document.body.appendChild(el);
  }

  if ('serviceWorker' in navigator && navigator.serviceWorker) {
    let reloading = false;
    // Il ricaricamento avviene solo dopo il tocco su "Ricarica", mai in automatico durante una riproduzione.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading || !updateRequested) return;
      reloading = true;
      window.location.reload();
    });

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(reg => {
        const announce = () => {
          if (reg.waiting && navigator.serviceWorker.controller) {
            showUpdateToast(reg);
          }
        };
        announce();
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) showUpdateToast(reg);
          });
        });
        // Controllo periodico per sessioni lunghe
        setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
      }).catch(() => { /* registrazione fallita: l'app continua a funzionare come sito web */ });
    });
  }
})();
