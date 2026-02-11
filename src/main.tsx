import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Register service worker for offline gameplay support.
// We use the native API instead of virtual:pwa-register to avoid
// the auto-reload on SW update (which interrupts mid-game state).
// Derive paths from Vite's BASE_URL so deployment to a subpath works.
if ('serviceWorker' in navigator) {
  const base = import.meta.env.BASE_URL ?? '/';
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(error => {
      console.error('Service Worker registration failed:', error);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
