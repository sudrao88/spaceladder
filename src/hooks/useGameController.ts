import { useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';
import type { Player } from '../store/useGameStore';

// Granular selectors — subscribe only to what the controller needs
const selectSetMoving = (s: ReturnType<typeof useGameStore.getState>) => s.setMoving;
const selectNextTurn = (s: ReturnType<typeof useGameStore.getState>) => s.nextTurn;
const selectSetPendingWormhole = (s: ReturnType<typeof useGameStore.getState>) => s.setPendingWormhole;

/** Inclusive random integer in [min, max] */
const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const GameController = () => {
  const setMoving = useGameStore(selectSetMoving);
  const nextTurn = useGameStore(selectNextTurn);
  const setPendingWormhole = useGameStore(selectSetPendingWormhole);

  const checkWormhole = useCallback((player: Player) => {
      const currentTile = player.position;

      // No wormholes on start, near-finish, or finish tiles
      if (currentTile <= 1 || currentTile >= 98) {
          nextTurn();
          return;
      }

      // 25% chance of triggering a wormhole
      if (Math.random() >= 0.25) {
          nextTurn();
          return;
      }

      // 15% of wormholes are drastic jumps for excitement
      const isDrastic = Math.random() < 0.15;

      // 65% forward / 35% backward — biased to keep the game moving
      const isForward = Math.random() < 0.65;

      let jumpDistance: number;
      if (isForward) {
          jumpDistance = isDrastic
              ? randomInt(20, 40)   // drastic forward leap
              : randomInt(5, 15);   // normal forward hop
      } else {
          jumpDistance = isDrastic
              ? randomInt(15, 30)   // drastic backward fall
              : randomInt(3, 10);   // normal backward slip
      }

      let destination = isForward
          ? currentTile + jumpDistance
          : currentTile - jumpDistance;

      // Clamp: never below tile 2 (avoid tile 1), never above tile 97
      destination = Math.max(2, Math.min(97, destination));

      if (destination === currentTile) {
          nextTurn();
          return;
      }

      const isBoost = destination > currentTile;

      // Show dialog instead of teleporting immediately
      setPendingWormhole({ playerId: player.id, destination, isBoost });
  }, [nextTurn, setPendingWormhole]);

  const handleMovementComplete = useCallback((playerId: number) => {
    // CRITICAL FIX: Use getState() to access the most up-to-date state.
    // This prevents closure staleness issues where multiple rapid calls 
    // (e.g. from animation bounces) might see 'isMoving' as true multiple times,
    // causing nextTurn() to be called more than once and skipping players.
    const currentPlayers = useGameStore.getState().players;
    const player = currentPlayers.find(p => p.id === playerId);
    
    if (!player || !player.isMoving) return;

    setMoving(playerId, false);

    setTimeout(() => {
        checkWormhole(player);
    }, 500);
  }, [setMoving, checkWormhole]);

  return { handleMovementComplete };
};
