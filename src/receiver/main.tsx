import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import { ReceiverApp } from './ReceiverApp';

// Receiver runs inside the Chromecast browser context. It deliberately does
// not register a service worker, does not import Capacitor, and does not
// mount the GameController hook — the sender owns all game logic and
// randomness; we just render whatever state arrives over Cast.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ReceiverApp />
  </React.StrictMode>,
);
