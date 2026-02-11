import { useEffect, useRef, type DependencyList } from 'react';

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Traps focus within a container element while it's mounted.
 * Returns a ref to attach to the container div.
 *
 * @param deps - Optional dependency array. When any value changes the trap
 *   re-evaluates focusable children and moves focus to the first one. This
 *   is important for dialogs whose content changes after mount (e.g.
 *   CollisionDialog switching from prompt to ejection phase).
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  deps: DependencyList = [],
) {
  const containerRef = useRef<T>(null);

  // Re-run whenever deps change so we pick up new focusable elements.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Focus the first focusable element (or the container itself)
    const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      container.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableEls = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusableEls.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusableEls[0];
      const last = focusableEls[focusableEls.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, deps);

  return containerRef;
}
