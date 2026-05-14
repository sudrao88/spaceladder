import { useGameStore } from '../../store/useGameStore';
import { PROTOCOL_VERSION } from '../config';
import { getCurrentSession, sendCastMessage, subscribeCast } from './castContext';

const DEBOUNCE_MS = 50;

type GameState = ReturnType<typeof useGameStore.getState>;

// Fields that the receiver needs to render the game. Mirrors the persist
// `partialize` shape plus the transient flags driving animations + dialogs.
function buildPayload(state: GameState) {
  return {
    players: state.players,
    currentPlayerIndex: state.currentPlayerIndex,
    gameStatus: state.gameStatus,
    winner: state.winner,
    playerInitials: state.playerInitials,
    wormholeHistory: state.wormholeHistory,
    turnNumber: state.turnNumber,
    diceValue: state.diceValue,
    isRolling: state.isRolling,
    isTurnProcessing: state.isTurnProcessing,
    pendingWormhole: state.pendingWormhole,
    pendingCollision: state.pendingCollision,
    pendingMathChallenge: state.pendingMathChallenge,
    mathModeEnabled: state.mathModeEnabled,
    playerShields: state.playerShields,
    mathSettings: state.mathSettings,
    cameraFollowEnabled: state.cameraFollowEnabled,
    shouldFollowPlayer: state.shouldFollowPlayer,
    shouldResetCamera: state.shouldResetCamera,
    isDefaultView: state.isDefaultView,
  };
}

export type CastPayload = ReturnType<typeof buildPayload>;

let seq = 0;
let storeUnsub: (() => void) | null = null;
let castUnsub: (() => void) | null = null;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let active = false;

function sendSnapshot() {
  const payload = buildPayload(useGameStore.getState());
  sendCastMessage({
    type: 'STATE_SNAPSHOT',
    v: PROTOCOL_VERSION,
    seq: ++seq,
    payload,
  });
}

function schedulePatch() {
  if (!active) return;
  if (pendingTimer !== null) return;
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    const payload = buildPayload(useGameStore.getState());
    sendCastMessage({
      type: 'STATE_PATCH',
      v: PROTOCOL_VERSION,
      seq: ++seq,
      payload,
    });
  }, DEBOUNCE_MS);
}

function start() {
  if (active) return;
  active = true;
  // Push initial snapshot once a session is active so the receiver starts
  // from a known state, then keep it fresh on every store change.
  sendSnapshot();
  storeUnsub = useGameStore.subscribe(() => schedulePatch());
}

function stop(notifyReceiver: boolean) {
  if (!active) return;
  active = false;
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  if (storeUnsub) {
    storeUnsub();
    storeUnsub = null;
  }
  if (notifyReceiver) {
    sendCastMessage({ type: 'SESSION_END', v: PROTOCOL_VERSION, seq: ++seq });
  }
}

export function startCastSync(): () => void {
  castUnsub = subscribeCast((snap) => {
    if (snap.state === 'connected' && getCurrentSession()) {
      start();
    } else {
      stop(false);
    }
  });

  return () => {
    stop(true);
    if (castUnsub) {
      castUnsub();
      castUnsub = null;
    }
  };
}
