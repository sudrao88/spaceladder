import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import './index.css';
import App from './App';
import { initServiceWorkerUpdates } from './utils/swUpdateManager';

// Register service worker for offline gameplay support.
// We use the native API instead of virtual:pwa-register to avoid
// the auto-reload on SW update (which interrupts mid-game state).
// Derive paths from Vite's BASE_URL so deployment to a subpath works.
// Updates are detected and applied on the next new-game start.
// Skipped on Capacitor native builds — WKWebView intercepts fetches in ways
// that break SW-cached navigation, and the native shell handles offline.
if ('serviceWorker' in navigator && !Capacitor.isNativePlatform()) {
  const base = import.meta.env.BASE_URL ?? '/';
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base })
      .then(reg => initServiceWorkerUpdates(reg))
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

if (Capacitor.isNativePlatform()) {
  void (async () => {
    const [{ ScreenOrientation }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
      import('@capacitor/screen-orientation'),
      import('@capacitor/status-bar'),
      import('@capacitor/splash-screen'),
    ]);
    try { await ScreenOrientation.lock({ orientation: 'landscape' }); } catch (e) { console.warn('Orientation lock failed', e); }
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      if (Capacitor.getPlatform() === 'android') {
        await StatusBar.setBackgroundColor({ color: '#050510' });
      }
    } catch (e) { console.warn('StatusBar setup failed', e); }
    try { await SplashScreen.hide(); } catch (e) { console.warn('SplashScreen hide failed', e); }
  })();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
