import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { initServiceWorkerUpdates } from './utils/swUpdateManager';

// Register service worker for offline gameplay support.
// We use the native API instead of virtual:pwa-register to avoid
// the auto-reload on SW update (which interrupts mid-game state).
// Instead, updates are detected and applied on the next new-game start.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => initServiceWorkerUpdates(reg))
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
