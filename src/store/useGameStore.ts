import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const POST_TELEPORT_DELAY_MS = 800;

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
  gameStatus: 'setup' | 'playing' | 'finished';
  winner: Player | null;
  pendingWormhole: PendingWormhole | null;
  
  // Camera State
  isDefaultView: boolean;
  shouldResetCamera: boolean;

  // Actions
  setupGame: (playerCount: number) => void;
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
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      players: [],
      currentPlayerIndex: 0,
      diceValue: null,
      isRolling: false,
      gameStatus: 'setup',
      winner: null,
      pendingWormhole: null,
      isDefaultView: true,
      shouldResetCamera: false,

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
          gameStatus: 'playing',
          winner: null,
          diceValue: null
        });
      },

      rollDice: () => {
        const { isRolling, gameStatus } = get();
        if (isRolling || gameStatus !== 'playing') return;

        set({ isRolling: true });
        
        // Simulate rolling delay
        setTimeout(() => {
          const roll = Math.floor(Math.random() * 6) + 1;
          set({ diceValue: roll, isRolling: false });
          
          const { players, currentPlayerIndex } = get();
          const currentPlayer = players[currentPlayerIndex];
          
          // Trigger movement
          get().movePlayer(currentPlayer.id, roll);
        }, 1000);
      },

      movePlayer: (playerId, steps) => {
        const { players } = get();
        const playerIndex = players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return;

        const player = players[playerIndex];
        set({
          players: players.map(p => p.id === playerId ? { ...p, isMoving: true } : p)
        });

        // Calculate target position with bounce back logic
        let targetPos = player.position + steps;
        if (targetPos > 100) {
          const excess = targetPos - 100;
          targetPos = 100 - excess;
        }
        
        set((state) => ({
           players: state.players.map(p => p.id === playerId ? { ...p, position: targetPos } : p)
        }));
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
        get().teleportPlayer(playerId, destination);
        set({ pendingWormhole: null });
        setTimeout(() => {
          get().nextTurn();
        }, POST_TELEPORT_DELAY_MS);
      },

      setMoving: (playerId, isMoving) => {
         set((state) => ({
          players: state.players.map(p => p.id === playerId ? { ...p, isMoving } : p)
        }));
      },

      nextTurn: () => {
        const { players, currentPlayerIndex } = get();
        
        // Check win condition
        const currentPlayer = players[currentPlayerIndex];
        if (currentPlayer.position === 100) {
            set({ gameStatus: 'finished', winner: currentPlayer });
            return;
        }

        const nextIndex = (currentPlayerIndex + 1) % players.length;
        set({ currentPlayerIndex: nextIndex, diceValue: null });
      },
      
      resetGame: () => {
          set({ gameStatus: 'setup', players: [], winner: null, diceValue: null, pendingWormhole: null });
      },

      setIsDefaultView: (isDefault) => set({ isDefaultView: isDefault }),
      triggerCameraReset: () => set({ shouldResetCamera: true }),
      acknowledgeCameraReset: () => set({ shouldResetCamera: false }),
    }),
    {
      name: 'wormhole-warp-storage',
      partialize: (state) => ({ 
          players: state.players, 
          currentPlayerIndex: state.currentPlayerIndex,
          gameStatus: state.gameStatus,
          winner: state.winner 
      }), // Persist only essential state
    }
  )
);
