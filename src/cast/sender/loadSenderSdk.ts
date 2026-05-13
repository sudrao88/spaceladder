// Loads the Google Cast Sender SDK and resolves once the library
// signals that the Cast API is available. Idempotent — repeated calls
// return the same promise. Resolves to `null` (rather than rejecting)
// in non-Chromium browsers so callers can gracefully hide UI.

const SDK_SRC =
  'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
const TIMEOUT_MS = 5000;

let cached: Promise<typeof window.cast | null> | null = null;

export function loadCastSenderSdk(): Promise<typeof window.cast | null> {
  if (cached) return cached;

  if (typeof window === 'undefined') {
    cached = Promise.resolve(null);
    return cached;
  }

  cached = new Promise((resolve) => {
    let settled = false;
    const finish = (value: typeof window.cast | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    window.__onGCastApiAvailable = (isAvailable: boolean, errorInfo?: string) => {
      if (isAvailable && window.cast?.framework) {
        finish(window.cast);
      } else {
        if (errorInfo) console.warn('[cast] sender SDK reported unavailable:', errorInfo);
        finish(null);
      }
    };

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src^="https://www.gstatic.com/cv/js/sender/"]`,
    );
    if (!existing) {
      const script = document.createElement('script');
      script.src = SDK_SRC;
      script.async = true;
      script.onerror = () => finish(null);
      document.head.appendChild(script);
    }

    setTimeout(() => finish(window.cast ?? null), TIMEOUT_MS);
  });

  return cached;
}
