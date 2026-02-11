/**
 * Service Worker Update Manager
 *
 * Detects when a new service worker has been installed and activated,
 * which signals that a new app version has been deployed. The game
 * checks this on every new-game start and reloads to pick up the
 * latest assets.
 */

let registration: ServiceWorkerRegistration | null = null;
let updateDetected = false;

/**
 * Call once after SW registration succeeds.
 * Sets up listeners that flip `updateDetected` when a new SW takes control.
 */
export function initServiceWorkerUpdates(reg: ServiceWorkerRegistration): void {
  registration = reg;

  // A new SW is already installed and waiting to activate
  if (reg.waiting) {
    updateDetected = true;
  }

  // Detect newly-installing workers that finish installation
  reg.addEventListener('updatefound', () => {
    const installing = reg.installing;
    if (!installing) return;

    installing.addEventListener('statechange', () => {
      // installed + existing controller = an update is ready
      if (installing.state === 'installed' && navigator.serviceWorker.controller) {
        updateDetected = true;
      }
    });
  });

  // Detect when a new SW claims this client (skipWaiting + clientsClaim)
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) {
      updateDetected = true;
    }
  });
}

/** Whether the SW layer has signalled that a newer version is available. */
export function hasServiceWorkerUpdate(): boolean {
  return updateDetected;
}

/**
 * Ask the SW registration to re-check the server for a newer SW script.
 * This is a no-op if no registration exists (e.g. SW not supported).
 */
export async function checkForServiceWorkerUpdate(): Promise<void> {
  if (!registration) return;
  try {
    await registration.update();
  } catch {
    // Network error — silently ignore
  }
}
