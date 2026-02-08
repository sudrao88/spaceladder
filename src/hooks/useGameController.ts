import { useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';
import type { Player } from '../store/useGameStore';

// Granular selectors — subscribe only to what the controller needs
const selectPlayers = (s: ReturnType<typeof useGameStore.getState>) => s.players;
const selectSetMoving = (s: ReturnType<typeof useGameStore.getState>) => s.setMoving;
const selectNextTurn = (s: ReturnType<typeof useGameStore.getState>) => s.nextTurn;
const selectTeleportPlayer = (s: ReturnType<typeof useGameStore.getState>) => s.teleportPlayer;

export const GameController = () => {
  const players = useGameStore(selectPlayers);
  const setMoving = useGameStore(selectSetMoving);
  const nextTurn = useGameStore(selectNextTurn);
  const teleportPlayer = useGameStore(selectTeleportPlayer);

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
          console.log(isBoost ? "WORMHOLE BOOST!" : "WORMHOLE GLITCH!");

          teleportPlayer(player.id, destination);

          setTimeout(() => {
              nextTurn();
          }, 1000);

      } else {
          nextTurn();
      }
  }, [nextTurn, teleportPlayer]);

  const handleMovementComplete = useCallback((playerId: number) => {
    const player = players.find(p => p.id === playerId);
    if (!player || !player.isMoving) return;

    setMoving(playerId, false);

    setTimeout(() => {
        checkWormhole(player);
    }, 500);
  }, [players, setMoving, checkWormhole]);

  return { handleMovementComplete };
};
