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

// --- Wormhole balancing knobs ---
const WORMHOLE_CHANCE = 0.25;
const WORMHOLE_DRASTIC_JUMP_CHANCE = 0.15;
const WORMHOLE_FORWARD_BIAS = 0.57;
const WORMHOLE_SAFE_ZONE_MIN = 1;
const WORMHOLE_SAFE_ZONE_MAX = 98;
const DESTINATION_MIN = 2;
const DESTINATION_MAX = 97;
const FORWARD_NORMAL_RANGE: [number, number] = [5, 15];
const FORWARD_DRASTIC_RANGE: [number, number] = [20, 40];
const BACKWARD_NORMAL_RANGE: [number, number] = [3, 10];
const BACKWARD_DRASTIC_RANGE: [number, number] = [15, 30];

export const GameController = () => {
  const setMoving = useGameStore(selectSetMoving);
  const nextTurn = useGameStore(selectNextTurn);
  const setPendingWormhole = useGameStore(selectSetPendingWormhole);

  const checkWormhole = useCallback((player: Player) => {
      const currentTile = player.position;

      // No wormholes on start, near-finish, or finish tiles
      if (currentTile <= WORMHOLE_SAFE_ZONE_MIN || currentTile >= WORMHOLE_SAFE_ZONE_MAX) {
          nextTurn();
          return;
      }

      if (Math.random() >= WORMHOLE_CHANCE) {
          nextTurn();
          return;
      }

      const isDrastic = Math.random() < WORMHOLE_DRASTIC_JUMP_CHANCE;
      const isForward = Math.random() < WORMHOLE_FORWARD_BIAS;

      let jumpDistance: number;
      if (isForward) {
          const [min, max] = isDrastic ? FORWARD_DRASTIC_RANGE : FORWARD_NORMAL_RANGE;
          jumpDistance = randomInt(min, max);
      } else {
          const [min, max] = isDrastic ? BACKWARD_DRASTIC_RANGE : BACKWARD_NORMAL_RANGE;
          jumpDistance = randomInt(min, max);
      }

      let destination = isForward
          ? currentTile + jumpDistance
          : currentTile - jumpDistance;

      destination = Math.max(DESTINATION_MIN, Math.min(DESTINATION_MAX, destination));

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
