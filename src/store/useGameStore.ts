import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { hasServiceWorkerUpdate, checkForServiceWorkerUpdate } from '../utils/swUpdateManager';

const APP_VERSION_KEY = 'wormhole-warp-version';
const STORAGE_KEY = 'wormhole-warp-storage';

/**
 * Called at the start of every new game. If a newer build has been deployed
 * (detected via service-worker update or a changed build-time version stamp),
 * clears persisted state and reloads the page so the user gets the latest code.
 * Returns `true` if a reload was triggered (caller should bail out).
 */
function reloadIfNewVersionAvailable(): boolean {
  const storedVersion = localStorage.getItem(APP_VERSION_KEY);

  // If the SW layer has detected a newer deployment, reload immediately.
  if (hasServiceWorkerUpdate()) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(APP_VERSION_KEY, __APP_VERSION__);
    window.location.reload();
    return true;
  }

  // If this is the first visit or the stored version differs from the
  // running code, clear stale persisted state (old data may be incompatible
  // with new code) and record the current version. No reload needed because
  // the running code is already the latest (e.g. user hard-refreshed).
  if (storedVersion !== __APP_VERSION__) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(APP_VERSION_KEY, __APP_VERSION__);
  }

  // Kick off a background SW update check so the *next* new-game start
  // can detect any deployment that happened while this session was active.
  checkForServiceWorkerUpdate();

  return false;
}

export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow';

export interface Player {
  id: number;
  color: PlayerColor;
  position: number; // 1 to 100
  isMoving: boolean;
}

export type WormholeType = 'boost' | 'glitch' | 'slingshot' | 'gravity-well';

export interface PendingWormhole {
  playerId: number;
  destination: number;
  isBoost: boolean;
  wormholeType: WormholeType;
}

export interface WormholeEvent {
  playerId: number;
  fromTile: number;
  toTile: number;
  delta: number; // positive = boost, negative = glitch
}

export interface PendingCollision {
  movingPlayerId: number;
  occupyingPlayerId: number;
  tile: number;
  winnerId: number;
  loserId: number;
  loserDestination: number;
}

interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  diceValue: number | null;
  isRolling: boolean;
  isTurnProcessing: boolean; // New flag to prevent overlapping turns
  gameStatus: 'setup' | 'initials' | 'playing' | 'finished';
  winner: Player | null;
  pendingWormhole: PendingWormhole | null;
  pendingCollision: PendingCollision | null;
  wormholeHistory: WormholeEvent[];
  playerInitials: Record<number, string>;

  // Camera State
  isDefaultView: boolean;
  shouldResetCamera: boolean;
  shouldFollowPlayer: boolean;
  cameraFollowEnabled: boolean;

  // Actions
  setupGame: (playerCount: number) => void;
  finalizeSetup: (initials: Record<number, string>, playerOrder: number[]) => void;
  rollDice: () => void;
  movePlayer: (playerId: number, steps: number) => void;
  teleportPlayer: (playerId: number, targetTile: number) => void;
  setPendingWormhole: (wormhole: PendingWormhole | null) => void;
  addWormholeEvent: (event: WormholeEvent) => void;
  executeTeleport: () => void;
  checkAndHandleCollision: (playerId: number) => boolean;
  executeCollision: () => void;
  nextTurn: () => void;
  setMoving: (playerId: number, isMoving: boolean) => void;
  resetGame: () => void;

  // Camera Actions
  setIsDefaultView: (isDefault: boolean) => void;
  triggerCameraReset: () => void;
  acknowledgeCameraReset: () => void;
  setShouldFollowPlayer: (shouldFollow: boolean) => void;
  toggleCameraFollow: () => void;
}

const POST_TELEPORT_DELAY_MS = 800;

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      players: [],
      currentPlayerIndex: 0,
      diceValue: null,
      isRolling: false,
      isTurnProcessing: false,
      gameStatus: 'setup',
      winner: null,
      pendingWormhole: null,
      pendingCollision: null,
      wormholeHistory: [],
      playerInitials: {},
      isDefaultView: true,
      shouldResetCamera: false,
      shouldFollowPlayer: false,
      cameraFollowEnabled: true,

      setupGame: (playerCount) => {
        // Check for app updates on every new game start.
        // If a reload is triggered, bail out — the page will reload with fresh code.
        if (reloadIfNewVersionAvailable()) return;

        const colors: PlayerColor[] = ['red', 'blue', 'green', 'yellow'];
        const newPlayers: Player[] = Array.from({ length: playerCount }, (_, i) => ({
          id: i,
          color: colors[i],
          position: 1,
          isMoving: false,
        }));
        set({
          players: newPlayers,
          currentPlayerIndex: 0,
          gameStatus: 'initials',
          winner: null,
          diceValue: null,
          isRolling: false,
          isTurnProcessing: false,
          pendingWormhole: null,
          pendingCollision: null,
          wormholeHistory: [],
          playerInitials: {},
        });
      },

      finalizeSetup: (initials, playerOrder) => {
        const { players } = get();
        const playerMap = new Map(players.map(p => [p.id, p]));
        const reorderedPlayers = playerOrder.map(id => playerMap.get(id)!);
        set({
          playerInitials: initials,
          players: reorderedPlayers,
          currentPlayerIndex: 0,
          gameStatus: 'playing',
          shouldResetCamera: true,
        });
      },

      rollDice: () => {
        const { isRolling, gameStatus, isTurnProcessing } = get();
        
        // Comprehensive guard using isTurnProcessing
        if (isRolling || isTurnProcessing || gameStatus !== 'playing') {
            return;
        }

        (async () => {
          // Immediately set turn as processing to lock out future calls
          set({ isRolling: true, isTurnProcessing: true, diceValue: null });
          
          const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
          
          // Simulate rolling delay
          await delay(1000);
          
          const roll = Math.floor(Math.random() * 6) + 1;
          set({ diceValue: roll, isRolling: false });
          
          // Wait a bit AFTER the dice stops and shows the value before moving the player
          await delay(800);
          
          const { players, currentPlayerIndex } = get();
          const currentPlayer = players[currentPlayerIndex];
          
          if (currentPlayer) {
            // Trigger movement
            get().movePlayer(currentPlayer.id, roll);
          } else {
             // Safety: if no player, reset turn processing
             set({ isTurnProcessing: false });
          }
        })();
      },

      movePlayer: (playerId, steps) => {
        const { players } = get();
        const playerIndex = players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) {
            set({ isTurnProcessing: false });
            return;
        }

        const player = players[playerIndex];

        // Calculate target position
        const targetPos = player.position + steps;
        
        // Block if roll exceeds 100
        if (targetPos > 100) {
             // Turn ends immediately if overshot
             get().nextTurn();
             return;
        }

        const newPlayers = players.map(p => p.id === playerId ? { ...p, isMoving: true, position: targetPos } : p);
        // Enable camera follow mode when movement starts (if setting is on)
        const { cameraFollowEnabled, isDefaultView } = get();
        set({
          players: newPlayers,
          shouldFollowPlayer: cameraFollowEnabled,
          isDefaultView: cameraFollowEnabled ? false : isDefaultView,
        });
      },

      teleportPlayer: (playerId, targetTile) => {
        set((state) => ({
          players: state.players.map(p => p.id === playerId ? { ...p, position: targetTile } : p)
        }));
      },

      setPendingWormhole: (wormhole) => {
        set({ pendingWormhole: wormhole });
      },

      addWormholeEvent: (event) => {
        set((state) => ({
          wormholeHistory: [...state.wormholeHistory, event],
        }));
      },

      executeTeleport: () => {
        const { pendingWormhole } = get();
        if (!pendingWormhole) return;
        const { playerId, destination } = pendingWormhole;

        // Teleport the player
        // Keep camera following during teleport (if setting is on)
        const { cameraFollowEnabled } = get();
        set((state) => ({
            players: state.players.map(p => p.id === playerId ? { ...p, position: destination } : p),
            pendingWormhole: null,
            shouldFollowPlayer: cameraFollowEnabled,
        }));

        // Wait a bit, then check for collision at the wormhole destination
        setTimeout(() => {
            if (!get().checkAndHandleCollision(playerId)) {
                get().nextTurn();
            }
        }, POST_TELEPORT_DELAY_MS);
      },

      checkAndHandleCollision: (playerId: number): boolean => {
        const { players } = get();
        const player = players.find(p => p.id === playerId);
        if (!player || player.position <= 1) return false;

        const occupant = players.find(p => p.id !== playerId && p.position === player.position);
        if (!occupant) return false;

        // Collision detected — randomly pick winner
        const movingPlayerWins = Math.random() < 0.5;
        const winnerId = movingPlayerWins ? player.id : occupant.id;
        const loserId = movingPlayerWins ? occupant.id : player.id;

        // Calculate loser destination: back 5 spaces, minimum tile 2
        const collisionTile = player.position;
        const RETREAT_MIN = 2;
        const RETREAT_MAX = 99;
        let destination = Math.max(collisionTile - 5, RETREAT_MIN);

        // Positions occupied by players other than the loser
        const occupiedPositions = new Set(
          players.filter(p => p.id !== loserId).map(p => p.position)
        );

        // First pass: walk backward to find an empty tile
        let foundSpot = false;
        while (destination >= RETREAT_MIN) {
          if (!occupiedPositions.has(destination)) {
            foundSpot = true;
            break;
          }
          destination--;
        }

        // Second pass: if backward search failed, walk forward from retreat start
        if (!foundSpot) {
          destination = Math.max(collisionTile - 5, RETREAT_MIN) + 1;
          while (destination <= RETREAT_MAX && (occupiedPositions.has(destination) || destination === collisionTile)) {
            destination++;
          }
        }

        set({
          pendingCollision: {
            movingPlayerId: playerId,
            occupyingPlayerId: occupant.id,
            tile: collisionTile,
            winnerId,
            loserId,
            loserDestination: destination,
          },
        });

        return true;
      },

      executeCollision: () => {
        const { pendingCollision } = get();
        if (!pendingCollision) return;

        const { loserId, loserDestination } = pendingCollision;
        const { cameraFollowEnabled } = get();

        set((state) => ({
          players: state.players.map(p =>
            p.id === loserId ? { ...p, position: loserDestination } : p
          ),
          pendingCollision: null,
          shouldFollowPlayer: cameraFollowEnabled,
        }));

        // Wait for the displacement animation, then advance the turn
        setTimeout(() => {
          get().nextTurn();
        }, POST_TELEPORT_DELAY_MS);
      },

      setMoving: (playerId, isMoving) => {
         const { players } = get();
         const player = players.find(p => p.id === playerId);
         if (player && player.isMoving === isMoving) return;

         set((state) => ({
          players: state.players.map(p => p.id === playerId ? { ...p, isMoving } : p)
        }));
      },

      nextTurn: () => {
        const { players, currentPlayerIndex } = get();
        const currentPlayer = players[currentPlayerIndex];

        if (!currentPlayer) {
            set({ isTurnProcessing: false });
            return;
        }

        // Check win condition
        if (currentPlayer.position === 100) {
            set({ gameStatus: 'finished', winner: currentPlayer, isTurnProcessing: false });
            return;
        }

        const nextIndex = (currentPlayerIndex + 1) % players.length;
        // RESET TURN PROCESSING AND DICE HERE
        // Also reset camera to default view for the next player's roll
        set({ 
            currentPlayerIndex: nextIndex, 
            diceValue: null, 
            isTurnProcessing: false,
            shouldFollowPlayer: false,
            shouldResetCamera: true, // Trigger camera reset to default
            isDefaultView: true
        });
      },
      
      resetGame: () => {
          set({
            gameStatus: 'setup',
            players: [],
            winner: null,
            diceValue: null,
            pendingWormhole: null,
            pendingCollision: null,
            wormholeHistory: [],
            playerInitials: {},
            currentPlayerIndex: 0,
            isRolling: false,
            isTurnProcessing: false,
            shouldResetCamera: true,
            shouldFollowPlayer: false,
            isDefaultView: true
          });
      },

      setIsDefaultView: (isDefault) => set({ isDefaultView: isDefault }),
      triggerCameraReset: () => set({ shouldResetCamera: true, shouldFollowPlayer: false }),
      acknowledgeCameraReset: () => set({ shouldResetCamera: false }),
      setShouldFollowPlayer: (shouldFollow) => set({ shouldFollowPlayer: shouldFollow }),
      toggleCameraFollow: () => {
        set((state) => {
          const next = !state.cameraFollowEnabled;
          // If disabling mid-follow, stop following and reset camera
          return next
            ? { cameraFollowEnabled: true }
            : { cameraFollowEnabled: false, shouldFollowPlayer: false, shouldResetCamera: true };
        });
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
          // Strip transient animation flag so a reload never leaves a player
          // stuck in isMoving:true (which blocks the Rocket subscription from
          // detecting the lifting transition and freezes turn processing).
          players: state.players.map(p => ({ ...p, isMoving: false })),
          currentPlayerIndex: state.currentPlayerIndex,
          gameStatus: state.gameStatus,
          winner: state.winner,
          playerInitials: state.playerInitials,
          wormholeHistory: state.wormholeHistory,
          cameraFollowEnabled: state.cameraFollowEnabled,
      }),
    }
  )
);
