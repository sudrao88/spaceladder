import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Register service worker for offline gameplay support.
// We use the native API instead of virtual:pwa-register to avoid
// the auto-reload on SW update (which interrupts mid-game state).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
