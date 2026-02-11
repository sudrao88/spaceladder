import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Dice } from './Dice';
import { WormholeDialog } from './WormholeDialog';
import { PlayerInitials } from './PlayerInitials';
import { useGameStore } from '../store/useGameStore';
import { PLAYER_EMOJIS } from '../utils/boardUtils';

// Granular selectors — each subscribes only to the slice it needs,
// so unrelated state changes (e.g. player positions) won't re-render HUD.
const selectGameStatus = (s: ReturnType<typeof useGameStore.getState>) => s.gameStatus;
const selectPlayers = (s: ReturnType<typeof useGameStore.getState>) => s.players;
const selectCurrentPlayerIndex = (s: ReturnType<typeof useGameStore.getState>) => s.currentPlayerIndex;
const selectDiceValue = (s: ReturnType<typeof useGameStore.getState>) => s.diceValue;
const selectIsRolling = (s: ReturnType<typeof useGameStore.getState>) => s.isRolling;
const selectWinner = (s: ReturnType<typeof useGameStore.getState>) => s.winner;
const selectSetupGame = (s: ReturnType<typeof useGameStore.getState>) => s.setupGame;
const selectRollDice = (s: ReturnType<typeof useGameStore.getState>) => s.rollDice;
const selectResetGame = (s: ReturnType<typeof useGameStore.getState>) => s.resetGame;
const selectPlayerInitials = (s: ReturnType<typeof useGameStore.getState>) => s.playerInitials;
const selectIsDefaultView = (s: ReturnType<typeof useGameStore.getState>) => s.isDefaultView;
const selectTriggerCameraReset = (s: ReturnType<typeof useGameStore.getState>) => s.triggerCameraReset;
const selectShouldFollowPlayer = (s: ReturnType<typeof useGameStore.getState>) => s.shouldFollowPlayer;
const selectWormholeHistory = (s: ReturnType<typeof useGameStore.getState>) => s.wormholeHistory;
const selectCameraFollowEnabled = (s: ReturnType<typeof useGameStore.getState>) => s.cameraFollowEnabled;
const selectToggleCameraFollow = (s: ReturnType<typeof useGameStore.getState>) => s.toggleCameraFollow;

const SetupScreen = memo(() => {
  const setupGame = useGameStore(selectSetupGame);

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 text-white backdrop-blur-sm pointer-events-auto">
      <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600 mb-8 neon-text">
        WORMHOLE WARP
      </h1>
      <div className="flex gap-4">
        {[2, 3, 4].map(num => (
          <button
            key={num}
            onClick={() => setupGame(num)}
            className="px-8 py-4 bg-gray-800 hover:bg-cyan-900 border border-cyan-500 rounded-lg text-xl font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:shadow-[0_0_25px_rgba(6,182,212,0.8)]"
          >
            {num} Players
          </button>
        ))}
      </div>
    </div>
  );
});

SetupScreen.displayName = 'SetupScreen';

const FinishedScreen = memo(() => {
  const winner = useGameStore(selectWinner);
  const resetGame = useGameStore(selectResetGame);
  const playerInitials = useGameStore(selectPlayerInitials);

  const winnerId = winner?.id ?? 0;
  const winnerLabel = playerInitials[winnerId] || `P${winnerId + 1}`;
  const winnerEmoji = PLAYER_EMOJIS[winnerId % PLAYER_EMOJIS.length];

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90 text-white pointer-events-auto">
      <h1 className="text-5xl font-bold text-yellow-400 mb-4 animate-pulse">GAME OVER</h1>
      <h2 className="text-3xl mb-8">
          {winnerEmoji} <span style={{ color: winner?.color }}>{winnerLabel}</span> Wins!
      </h2>
      <button
        onClick={resetGame}
        className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded text-white font-bold"
      >
        Play Again
      </button>
    </div>
  );
});

FinishedScreen.displayName = 'FinishedScreen';

interface PlayerListProps {
  currentPlayerIndex: number;
}

/** Compute a momentum label from recent wormhole history for a player */
function getMomentumIndicator(playerId: number, history: ReturnType<typeof useGameStore.getState>['wormholeHistory']): { label: string; color: string } | null {
  const recent = history.filter(h => h.playerId === playerId).slice(-3);
  if (recent.length === 0) return null;
  const net = recent.reduce((sum, h) => sum + Math.sign(h.delta), 0);
  if (net >= 2) return { label: '\u2191' + recent.filter(h => h.delta > 0).length, color: '#22d3ee' }; // up arrow + count
  if (net <= -2) return { label: '\u2193' + recent.filter(h => h.delta < 0).length, color: '#c084fc' }; // down arrow + count
  return null;
}

const PlayerList = memo(({ currentPlayerIndex }: PlayerListProps) => {
  const players = useGameStore(selectPlayers);
  const playerInitials = useGameStore(selectPlayerInitials);
  const wormholeHistory = useGameStore(selectWormholeHistory);

  return (
    <div className="absolute top-4 left-4 flex flex-col gap-3 pointer-events-auto">
      {players.map((p, idx) => {
        const momentum = getMomentumIndicator(p.id, wormholeHistory);
        return (
          <div
            key={p.id}
            className={`flex items-center gap-3 px-4 py-2 rounded-xl bg-black/50 backdrop-blur-md border transition-all
                ${idx === currentPlayerIndex ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70'}
            `}
          >
            <span className="text-2xl" role="img" aria-label="player-token">
              {PLAYER_EMOJIS[p.id % PLAYER_EMOJIS.length]}
            </span>
            <span className="text-white font-mono font-bold text-base">{playerInitials[p.id] || `P${p.id + 1}`}</span>
            <span className="text-cyan-300 ml-2 text-sm">Tile: {p.position}</span>
            {momentum && (
              <span className="text-xs font-bold ml-1" style={{ color: momentum.color }}>
                {momentum.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
});

PlayerList.displayName = 'PlayerList';

const DicePanel = memo(() => {
  const diceValue = useGameStore(selectDiceValue);
  const isRolling = useGameStore(selectIsRolling);
  const rollDice = useGameStore(selectRollDice);
  
  return (
    <div className="absolute bottom-12 right-12 flex flex-col items-center pointer-events-none">
       {/* 
          Dice Panel:
          - Bottom right corner
          - Clickable moon to roll
          - Label "ROLL" is now on the moon itself (in Dice.tsx)
          - Increased padding from edges by changing from bottom-6 right-6 to bottom-12 right-12
       */}
      <div className="pointer-events-auto flex flex-col items-center">
        <div 
            className="h-24 w-24 bg-transparent relative cursor-pointer hover:scale-110 transition-transform duration-300"
            onClick={!isRolling ? rollDice : undefined}
            title="Tap to Roll"
        >
          <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[5, 5, 5]} intensity={1} />
            <pointLight position={[-5, -5, -5]} intensity={0.5} />
            {/* Removed onClick prop from Dice, handled by parent div */}
            <Dice value={diceValue} isRolling={isRolling} />
          </Canvas>
        </div>
      </div>
    </div>
  );
});

DicePanel.displayName = 'DicePanel';

const ResetViewButton = memo(() => {
    const isDefaultView = useGameStore(selectIsDefaultView);
    const triggerCameraReset = useGameStore(selectTriggerCameraReset);
    const shouldFollowPlayer = useGameStore(selectShouldFollowPlayer);
    
    // Hide if in default view OR if camera is currently following player
    if (isDefaultView || shouldFollowPlayer) return null;
    
    return (
        <div className="absolute bottom-6 left-6 pointer-events-auto">
             <button
                onClick={triggerCameraReset}
                className="bg-gray-800/80 hover:bg-gray-700 text-white px-4 py-2 rounded shadow-lg border border-white/20 transition-all"
             >
                Reset View
             </button>
        </div>
    );
});

ResetViewButton.displayName = 'ResetViewButton';

const SettingsButton = memo(() => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isRestartDialogOpen, setIsRestartDialogOpen] = useState(false);
    const resetGame = useGameStore(selectResetGame);
    const cameraFollowEnabled = useGameStore(selectCameraFollowEnabled);
    const toggleCameraFollow = useGameStore(selectToggleCameraFollow);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleRestartConfirm = () => {
        resetGame();
        setIsRestartDialogOpen(false);
        setIsMenuOpen(false);
    };

    // Close menu when clicking outside
    const handleClickOutside = useCallback((e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
            setIsMenuOpen(false);
        }
    }, []);

    useEffect(() => {
        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isMenuOpen, handleClickOutside]);

    return (
        <>
            <div className="absolute top-4 right-4 pointer-events-auto" ref={menuRef}>
                <button
                    onClick={() => setIsMenuOpen(prev => !prev)}
                    className="p-2 bg-gray-800/80 hover:bg-gray-700 text-white rounded-full shadow-lg border border-white/20 transition-all flex items-center justify-center"
                    title="Settings"
                >
                    <span className="text-xl leading-none grayscale">🌐</span>
                </button>

                {isMenuOpen && (
                    <div className="absolute top-12 right-0 w-56 bg-gray-900/95 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-white/10">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Settings</span>
                        </div>

                        {/* Camera Follow Toggle */}
                        <button
                            onClick={toggleCameraFollow}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors"
                        >
                            <span className="text-sm text-white">Camera Follow</span>
                            <div
                                className={`relative w-10 h-5 rounded-full transition-colors ${
                                    cameraFollowEnabled ? 'bg-cyan-500' : 'bg-gray-600'
                                }`}
                            >
                                <div
                                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                        cameraFollowEnabled ? 'translate-x-5' : 'translate-x-0.5'
                                    }`}
                                />
                            </div>
                        </button>

                        {/* Restart Game */}
                        <button
                            onClick={() => {
                                setIsRestartDialogOpen(true);
                                setIsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-900/40 transition-colors border-t border-white/10"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-red-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                            <span className="text-sm text-red-400">Restart Game</span>
                        </button>
                    </div>
                )}
            </div>

            {isRestartDialogOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto">
                    <div className="bg-gray-900 border border-white/20 rounded-xl p-8 max-w-sm w-full shadow-2xl transform transition-all scale-100">
                        <h3 className="text-xl font-bold text-white mb-4">Start New Game?</h3>
                        <p className="text-gray-300 mb-6">Are you sure you want to discard the current game and start over?</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsRestartDialogOpen(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRestartConfirm}
                                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-medium shadow-lg shadow-red-500/20 transition-all"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
});

SettingsButton.displayName = 'SettingsButton';


export const HUD = memo(() => {
  const gameStatus = useGameStore(selectGameStatus);
  const currentPlayerIndex = useGameStore(selectCurrentPlayerIndex);

  if (gameStatus === 'setup') {
    return <SetupScreen />;
  }

  if (gameStatus === 'initials') {
    return <PlayerInitials />;
  }

  if (gameStatus === 'finished') {
    return <FinishedScreen />;
  }

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      <PlayerList currentPlayerIndex={currentPlayerIndex} />
      <SettingsButton />
      <DicePanel />
      <WormholeDialog />
      <ResetViewButton />
    </div>
  );
});

HUD.displayName = 'HUD';
