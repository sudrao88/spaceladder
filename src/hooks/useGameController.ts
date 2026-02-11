import { useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';
import type { Player, WormholeEvent, WormholeType } from '../store/useGameStore';
import { secureRandom, secureRandomInt } from '../utils/random';

// Granular selectors — subscribe only to what the controller needs
const selectSetMoving = (s: ReturnType<typeof useGameStore.getState>) => s.setMoving;
const selectNextTurn = (s: ReturnType<typeof useGameStore.getState>) => s.nextTurn;
const selectSetPendingWormhole = (s: ReturnType<typeof useGameStore.getState>) => s.setPendingWormhole;
const selectAddWormholeEvent = (s: ReturnType<typeof useGameStore.getState>) => s.addWormholeEvent;

/** Inclusive random integer in [min, max] */
const randomInt = secureRandomInt;

/** Clamp a value between min and max */
const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

// --- Destination bounds ---
const DESTINATION_MIN = 2;
const DESTINATION_MAX = 98;
const SAFE_ZONE_MIN = 1;
const SAFE_ZONE_MAX = 99;

// --- Dynamic wormhole parameters ---

interface WormholeParams {
  triggerChance: number;
  forwardBias: number;
  forwardRange: [number, number];
  backwardRange: [number, number];
  drasticChance: number;
  drasticForwardRange: [number, number];
  drasticBackwardRange: [number, number];
  slingshotChance: number; // chance of special slingshot event (trailing only)
  gravityWellChance: number; // chance of gravity well event (leader only)
}

/**
 * Compute dynamic wormhole parameters based on game state.
 * This is the core "rubber-banding" algorithm that keeps games competitive.
 */
function computeWormholeParams(
  player: Player,
  allPlayers: Player[],
  history: WormholeEvent[],
): WormholeParams {
  const positions = allPlayers.map(p => p.position);
  const avgPosition = positions.reduce((a, b) => a + b, 0) / positions.length;
  const maxPosition = Math.max(...positions);
  const minPosition = Math.min(...positions);

  // How far ahead (+) or behind (-) from average, normalized to roughly -1..1
  const leadGap = (player.position - avgPosition) / 99;

  // Pack spread: 0 = bunched together, 1 = maximally spread
  const packSpread = (maxPosition - minPosition) / 99;

  // Player's recent momentum from last 4 wormholes (net direction of luck)
  const playerHistory = history
    .filter(h => h.playerId === player.id)
    .slice(-4);
  const momentum = playerHistory.length > 0
    ? playerHistory.reduce((sum, h) => sum + Math.sign(h.delta), 0) / playerHistory.length
    : 0; // -1 (all glitches) to +1 (all boosts)

  // Positional flags
  const isLeader = player.position === maxPosition && packSpread > 0.08;
  const isTrailing = player.position === minPosition && packSpread > 0.10;

  // Progress zone
  const isLateGame = player.position > 65;
  const isEndGame = player.position > 85;

  // ============================================================
  // TRIGGER CHANCE: base 28%, adjusted by position and game phase
  // ============================================================
  let triggerChance = 0.28;

  // Leaders face more wormholes when they're pulling away
  if (isLeader) {
    triggerChance += packSpread * 0.20; // up to +20% when far ahead
  }

  // Late game: more wormholes for everyone (tension!)
  if (isLateGame) triggerChance += 0.08;
  if (isEndGame) triggerChance += 0.07;

  triggerChance = clamp(triggerChance, 0.15, 0.55);

  // ============================================================
  // FORWARD BIAS: base 50%, rubber-banded by position & momentum
  // ============================================================
  let forwardBias = 0.50;

  // Leading players get pulled back (less forward, more backward)
  forwardBias -= leadGap * 0.35;

  // Counter momentum: lucky streaks get corrected
  forwardBias -= momentum * 0.18;

  // Trailing players get extra forward bias when pack is spread
  if (isTrailing) {
    forwardBias += packSpread * 0.20;
  }

  forwardBias = clamp(forwardBias, 0.20, 0.82);

  // ============================================================
  // JUMP MAGNITUDES: scaled by pack spread and game phase
  // ============================================================
  let fwdMin = 4, fwdMax = 14;
  let bwdMin = 3, bwdMax = 10;

  // Trailing players get bigger boosts proportional to how spread the pack is
  if (isTrailing && packSpread > 0.15) {
    const bonus = Math.floor(packSpread * 18);
    fwdMin += Math.floor(bonus * 0.5);
    fwdMax += bonus;
  }

  // Leaders get bigger setbacks proportional to their lead
  if (isLeader && packSpread > 0.15) {
    const penalty = Math.floor(packSpread * 14);
    bwdMin += Math.floor(penalty * 0.5);
    bwdMax += penalty;
  }

  // Late game: slightly bigger swings
  if (isLateGame) {
    fwdMax += 4;
    bwdMax += 4;
  }

  // ============================================================
  // DRASTIC JUMP CHANCE: rare big swings, biased by position
  // ============================================================
  let drasticChance = 0.10;
  if (isLeader) drasticChance += 0.08; // leaders face more drastic setbacks
  if (isTrailing) drasticChance += 0.08; // trailing players get more drastic boosts
  if (isEndGame) drasticChance += 0.05;

  // ============================================================
  // SPECIAL EVENTS: Slingshot (trailing) & Gravity Well (leader)
  // ============================================================
  // Only activate when the pack is meaningfully spread
  let slingshotChance = 0;
  let gravityWellChance = 0;

  if (isTrailing && packSpread > 0.18) {
    // Trailing player: chance to slingshot near the leader
    slingshotChance = clamp(packSpread * 0.25, 0, 0.14);
    // Boost if on a cold streak
    if (momentum < -0.3) slingshotChance += 0.06;
  }

  if (isLeader && packSpread > 0.18) {
    // Leader: chance to get pulled back toward the pack
    gravityWellChance = clamp(packSpread * 0.22, 0, 0.12);
    // Boost if on a hot streak
    if (momentum > 0.3) gravityWellChance += 0.06;
  }

  return {
    triggerChance,
    forwardBias,
    forwardRange: [fwdMin, fwdMax],
    backwardRange: [bwdMin, bwdMax],
    drasticChance,
    drasticForwardRange: [fwdMax + 2, fwdMax + 22],
    drasticBackwardRange: [bwdMax + 2, bwdMax + 18],
    slingshotChance,
    gravityWellChance,
  };
}

export const GameController = () => {
  const setMoving = useGameStore(selectSetMoving);
  const nextTurn = useGameStore(selectNextTurn);
  const setPendingWormhole = useGameStore(selectSetPendingWormhole);
  const addWormholeEvent = useGameStore(selectAddWormholeEvent);

  const checkWormhole = useCallback((player: Player) => {
    const currentTile = player.position;

    // No wormholes on start or near-finish tiles
    if (currentTile <= SAFE_ZONE_MIN || currentTile >= SAFE_ZONE_MAX) {
      nextTurn();
      return;
    }

    // Read full game state for dynamic computation
    const { players, wormholeHistory } = useGameStore.getState();

    const params = computeWormholeParams(player, players, wormholeHistory);

    // Roll for trigger
    if (secureRandom() >= params.triggerChance) {
      nextTurn();
      return;
    }

    let destination: number;
    let wormholeType: WormholeType;

    // Check for special events first
    const specialRoll = secureRandom();

    if (specialRoll < params.slingshotChance) {
      // COSMIC SLINGSHOT: trailing player teleports to within 3-8 tiles of the leader
      const maxPos = Math.max(...players.map(p => p.position));
      const offset = randomInt(3, 8);
      destination = clamp(maxPos - offset, DESTINATION_MIN, DESTINATION_MAX);
      wormholeType = 'slingshot';
    } else if (specialRoll < params.slingshotChance + params.gravityWellChance) {
      // GRAVITY WELL: leader pulled back toward the pack median
      const otherPositions = players
        .filter(p => p.id !== player.id)
        .map(p => p.position);
      const median = otherPositions.length > 0
        ? otherPositions.sort((a, b) => a - b)[Math.floor(otherPositions.length / 2)]
        : currentTile;
      // Pull to midpoint between current position and pack median
      const midpoint = Math.round((currentTile + median) / 2);
      destination = clamp(midpoint + randomInt(-3, 3), DESTINATION_MIN, DESTINATION_MAX);
      wormholeType = 'gravity-well';
    } else {
      // STANDARD WORMHOLE: boost or glitch with dynamic parameters
      const isDrastic = secureRandom() < params.drasticChance;
      const isForward = secureRandom() < params.forwardBias;

      let jumpDistance: number;
      if (isForward) {
        const [min, max] = isDrastic ? params.drasticForwardRange : params.forwardRange;
        jumpDistance = randomInt(min, max);
      } else {
        const [min, max] = isDrastic ? params.drasticBackwardRange : params.backwardRange;
        jumpDistance = randomInt(min, max);
      }

      destination = isForward
        ? currentTile + jumpDistance
        : currentTile - jumpDistance;

      wormholeType = isForward ? 'boost' : 'glitch';
    }

    // Clamp destination to valid range
    destination = clamp(destination, DESTINATION_MIN, DESTINATION_MAX);

    // If destination is the same tile, skip
    if (destination === currentTile) {
      nextTurn();
      return;
    }

    const isBoost = destination > currentTile;

    // Correct type if destination direction doesn't match initial intent
    if (wormholeType === 'boost' && !isBoost) wormholeType = 'glitch';
    if (wormholeType === 'glitch' && isBoost) wormholeType = 'boost';

    // Record the event in history for future rubber-banding
    const event: WormholeEvent = {
      playerId: player.id,
      fromTile: currentTile,
      toTile: destination,
      delta: destination - currentTile,
    };
    addWormholeEvent(event);

    // Show dialog
    setPendingWormhole({ playerId: player.id, destination, isBoost, wormholeType });
  }, [nextTurn, setPendingWormhole, addWormholeEvent]);

  const handleMovementComplete = useCallback((playerId: number) => {
    // Use getState() to access the most up-to-date state.
    // This prevents closure staleness issues where multiple rapid calls
    // (e.g. from animation bounces) might see 'isMoving' as true multiple times,
    // causing nextTurn() to be called more than once and skipping players.
    const currentPlayers = useGameStore.getState().players;
    const player = currentPlayers.find(p => p.id === playerId);

    if (!player || !player.isMoving) return;

    setMoving(playerId, false);

    setTimeout(() => {
      // Check collision FIRST — if collision, skip wormhole entirely
      if (useGameStore.getState().checkAndHandleCollision(playerId)) {
        return;
      }

      // No collision — proceed with wormhole check
      const freshPlayer = useGameStore.getState().players.find(p => p.id === playerId);
      if (freshPlayer) {
        checkWormhole(freshPlayer);
      }
    }, 500);
  }, [setMoving, checkWormhole]);

  return { handleMovementComplete };
};
