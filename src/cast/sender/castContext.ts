import { loadCastSenderSdk } from './loadSenderSdk';
import { IS_CAST_CONFIGURED, NAMESPACE, RECEIVER_APP_ID } from '../config';

export type CastUiState =
  | 'unavailable'
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'error';

export interface CastSnapshot {
  state: CastUiState;
  deviceName: string | null;
  error: string | null;
}

type Listener = (snapshot: CastSnapshot) => void;

const listeners = new Set<Listener>();
let snapshot: CastSnapshot = {
  state: IS_CAST_CONFIGURED ? 'idle' : 'unavailable',
  deviceName: null,
  error: null,
};
let initPromise: Promise<void> | null = null;
let castRef: typeof window.cast | null = null;

function emit(next: Partial<CastSnapshot>) {
  snapshot = { ...snapshot, ...next };
  for (const listener of listeners) listener(snapshot);
}

function mapCastState(state: CastStateValue | undefined): CastUiState {
  switch (state) {
    case 'CONNECTING':
      return 'connecting';
    case 'CONNECTED':
      return 'connected';
    case 'NO_DEVICES_AVAILABLE':
    case 'NOT_CONNECTED':
    default:
      return 'idle';
  }
}

export function getCastSnapshot(): CastSnapshot {
  return snapshot;
}

export function subscribeCast(listener: Listener): () => void {
  listeners.add(listener);
  listener(snapshot);
  return () => {
    listeners.delete(listener);
  };
}

export function initCastSender(): Promise<void> {
  if (!IS_CAST_CONFIGURED) {
    return Promise.resolve();
  }
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const cast = await loadCastSenderSdk();
    if (!cast?.framework) {
      emit({ state: 'unavailable' });
      return;
    }
    castRef = cast;
    const context = cast.framework.CastContext.getInstance();
    context.setOptions({
      receiverApplicationId: RECEIVER_APP_ID,
      autoJoinPolicy: cast.framework.AutoJoinPolicy.ORIGIN_SCOPED,
      resumeSavedSession: true,
    });

    emit({ state: mapCastState(context.getCastState()) });

    context.addEventListener(
      cast.framework.CastContextEventType.CAST_STATE_CHANGED,
      (evt) => {
        const e = evt as CastStateChangedEvent;
        const session = context.getCurrentSession();
        const deviceName = session?.getCastDevice()?.friendlyName ?? null;
        emit({ state: mapCastState(e.castState), deviceName });
      },
    );

    context.addEventListener(
      cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
      (evt) => {
        const e = evt as SessionStateChangedEvent;
        const session = context.getCurrentSession();
        const deviceName = session?.getCastDevice()?.friendlyName ?? null;
        if (e.sessionState === 'SESSION_START_FAILED') {
          emit({ state: 'error', error: e.errorCode ?? 'session start failed' });
          return;
        }
        if (
          e.sessionState === 'SESSION_STARTED' ||
          e.sessionState === 'SESSION_RESUMED'
        ) {
          emit({ state: 'connected', deviceName, error: null });
          return;
        }
        if (e.sessionState === 'SESSION_ENDED') {
          emit({ state: 'idle', deviceName: null, error: null });
        }
      },
    );
  })();

  return initPromise;
}

export async function requestCastSession(): Promise<void> {
  if (!castRef?.framework) return;
  emit({ state: 'connecting', error: null });
  try {
    await castRef.framework.CastContext.getInstance().requestSession();
  } catch (err) {
    // User-cancelled dismissals are surfaced as strings like "cancel"; treat
    // those as a soft return to idle instead of an error state.
    const code = typeof err === 'string' ? err : (err as Error)?.message ?? 'error';
    if (code === 'cancel') {
      emit({ state: 'idle', error: null });
    } else {
      emit({ state: 'error', error: code });
    }
  }
}

export function endCastSession(): void {
  if (!castRef?.framework) return;
  castRef.framework.CastContext.getInstance().endCurrentSession(true);
}

export function sendCastMessage(payload: unknown): boolean {
  if (!castRef?.framework) return false;
  const session = castRef.framework.CastContext.getInstance().getCurrentSession();
  if (!session) return false;
  try {
    void session.sendMessage(NAMESPACE, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn('[cast] sendMessage failed', err);
    return false;
  }
}

export function getCurrentSession(): CastSession | null {
  if (!castRef?.framework) return null;
  return castRef.framework.CastContext.getInstance().getCurrentSession();
}
