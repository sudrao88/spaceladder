import { useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { NAMESPACE } from '../config';
import type { CastPayload } from '../sender/syncBridge';

interface CastMessage {
  type: 'STATE_SNAPSHOT' | 'STATE_PATCH' | 'SESSION_END';
  v: number;
  seq: number;
  payload?: CastPayload;
}

// Listens for sender state messages over the custom namespace and applies
// them into the local Zustand store. The receiver never dispatches game
// actions, so randomness paths in the store are dormant.
export function useReceiverBridge() {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.cast?.framework) {
      console.warn('[cast] receiver SDK not available — running in standalone mode');
      return;
    }

    const context = window.cast.framework.CastReceiverContext.getInstance();

    let lastSeq = -1;

    const handler = (event: CustomMessageEvent) => {
      try {
        const raw = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
        const msg = JSON.parse(raw) as CastMessage;

        if (msg.type === 'SESSION_END') {
          useGameStore.getState().resetGame();
          lastSeq = -1;
          return;
        }

        // Snapshots are always authoritative — accept them even if their seq
        // looks "old" (e.g. the sender refreshed and reset its counter).
        if (msg.type !== 'STATE_SNAPSHOT' && typeof msg.seq === 'number' && msg.seq <= lastSeq) {
          return;
        }
        if (typeof msg.seq === 'number') lastSeq = msg.seq;

        if (msg.payload) {
          useGameStore.setState(msg.payload as Partial<ReturnType<typeof useGameStore.getState>>);
        }
      } catch (err) {
        console.warn('[cast] receiver failed to apply message', err);
      }
    };

    context.addCustomMessageListener(NAMESPACE, handler);
    context.start({ disableIdleTimeout: true });

    return () => {
      context.removeCustomMessageListener(NAMESPACE, handler);
    };
  }, []);
}
