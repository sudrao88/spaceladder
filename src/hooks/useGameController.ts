import { useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';
import type { Player } from '../store/useGameStore';

// Granular selectors — subscribe only to what the controller needs
const selectSetMoving = (s: ReturnType<typeof useGameStore.getState>) => s.setMoving;
const selectNextTurn = (s: ReturnType<typeof useGameStore.getState>) => s.nextTurn;
const selectSetPendingWormhole = (s: ReturnType<typeof useGameStore.getState>) => s.setPendingWormhole;

export const GameController = () => {
  const setMoving = useGameStore(selectSetMoving);
  const nextTurn = useGameStore(selectNextTurn);
  const setPendingWormhole = useGameStore(selectSetPendingWormhole);

  const checkWormhole = useCallback((player: Player) => {
      const currentTile = player.position;

      // No wormholes on start or finish
      if (currentTile === 1 || currentTile === 100) {
          nextTurn();
          return;
      }

      // 25% Chance
      const isWormhole = Math.random() < 0.25;

      if (isWormhole) {
          let destination = Math.floor(Math.random() * 99) + 1; // 1 to 99
          if (destination === 100) destination = 99;

          if (destination === currentTile) {
               nextTurn();
               return;
          }

          const isBoost = destination > currentTile;

          // Show dialog instead of teleporting immediately
          setPendingWormhole({ playerId: player.id, destination, isBoost });

      } else {
          nextTurn();
      }
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
