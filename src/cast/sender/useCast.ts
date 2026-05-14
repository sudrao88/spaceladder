import { useEffect, useState } from 'react';
import {
  endCastSession,
  getCastSnapshot,
  initCastSender,
  requestCastSession,
  subscribeCast,
  type CastSnapshot,
} from './castContext';

export interface UseCastResult extends CastSnapshot {
  requestSession: () => void;
  endSession: () => void;
}

export function useCast(): UseCastResult {
  const [snap, setSnap] = useState<CastSnapshot>(getCastSnapshot);

  useEffect(() => {
    void initCastSender();
    return subscribeCast(setSnap);
  }, []);

  return {
    ...snap,
    requestSession: () => {
      void requestCastSession();
    },
    endSession: endCastSession,
  };
}
