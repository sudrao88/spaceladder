import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow';

export interface Player {
  id: number;
  color: PlayerColor;
  position: number; // 1 to 100
  isMoving: boolean;
}

export interface PendingWormhole {
  playerId: number;
  destination: number;
  isBoost: boolean;
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
  playerInitials: Record<number, string>;

  // Camera State
  isDefaultView: boolean;
  shouldResetCamera: boolean;
  shouldFollowPlayer: boolean;

  // Actions
  setupGame: (playerCount: number) => void;
  finalizeSetup: (initials: Record<number, string>, playerOrder: number[]) => void;
  rollDice: () => void;
  movePlayer: (playerId: number, steps: number) => void;
  teleportPlayer: (playerId: number, targetTile: number) => void;
  setPendingWormhole: (wormhole: PendingWormhole | null) => void;
  executeTeleport: () => void;
  nextTurn: () => void;
  setMoving: (playerId: number, isMoving: boolean) => void;
  resetGame: () => void;

  // Camera Actions
  setIsDefaultView: (isDefault: boolean) => void;
  triggerCameraReset: () => void;
  acknowledgeCameraReset: () => void;
  setShouldFollowPlayer: (shouldFollow: boolean) => void;
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
      playerInitials: {},
      isDefaultView: true,
      shouldResetCamera: false,
      shouldFollowPlayer: false,

      setupGame: (playerCount) => {
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
        // Enable camera follow mode when movement starts
        set({ players: newPlayers, shouldFollowPlayer: true, isDefaultView: false });
      },

      teleportPlayer: (playerId, targetTile) => {
        set((state) => ({
          players: state.players.map(p => p.id === playerId ? { ...p, position: targetTile } : p)
        }));
      },

      setPendingWormhole: (wormhole) => {
        set({ pendingWormhole: wormhole });
      },

      executeTeleport: () => {
        const { pendingWormhole } = get();
        if (!pendingWormhole) return;
        const { playerId, destination } = pendingWormhole;
        
        // Teleport the player
        // Keep camera following during teleport
        set((state) => ({
            players: state.players.map(p => p.id === playerId ? { ...p, position: destination } : p),
            pendingWormhole: null,
            shouldFollowPlayer: true // Ensure camera follows to destination
        }));
        
        // Wait a bit before next turn
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
    }),
    {
      name: 'wormhole-warp-storage',
      partialize: (state) => ({
          players: state.players,
          currentPlayerIndex: state.currentPlayerIndex,
          gameStatus: state.gameStatus,
          winner: state.winner,
          playerInitials: state.playerInitials,
      }),
    }
  )
);
