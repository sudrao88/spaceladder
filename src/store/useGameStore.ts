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

const POST_TELEPORT_DELAY_MS = 800;

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
          diceValue: null,
          isRolling: false,
          pendingWormhole: null,
          shouldResetCamera: true
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

        // Calculate target position
        const targetPos = player.position + steps;
        
        // Block if roll exceeds 100
        if (targetPos > 100) {
             // Turn ends immediately if overshot
             // We set isMoving=true momentarily to trigger the cycle, but position stays same
             // The Rocket component needs to handle a 'move' to the SAME position gracefully
             // (lifting up and landing back down)
             //  Actually, if we don't change position, Rocket won't animate.
             //  So we just skip turn for now? Or implement a "bounce" animation later.
             //  Let's just pass turn.
             get().nextTurn();
             return;
        }

        const newPlayers = players.map(p => p.id === playerId ? { ...p, isMoving: true, position: targetPos } : p);
        set({ players: newPlayers });
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
        set((state) => ({
            players: state.players.map(p => p.id === playerId ? { ...p, position: destination } : p),
            pendingWormhole: null
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

        // Check win condition
        if (currentPlayer.position === 100) {
            set({ gameStatus: 'finished', winner: currentPlayer });
            return;
        }

        const nextIndex = (currentPlayerIndex + 1) % players.length;
        set({ currentPlayerIndex: nextIndex, diceValue: null });
      },
      
      resetGame: () => {
          set({ 
            gameStatus: 'setup', 
            players: [], 
            winner: null, 
            diceValue: null, 
            pendingWormhole: null,
            currentPlayerIndex: 0,
            isRolling: false,
            shouldResetCamera: true
          });
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
