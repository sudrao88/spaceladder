import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { WormholeDialog } from './WormholeDialog';
import { CollisionDialog } from './CollisionDialog';
import { MathChallengeDialog } from './MathChallengeDialog';
import { PlayerInitials } from './PlayerInitials';
import { Dice } from './Dice';
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
const selectPlayerShields = (s: ReturnType<typeof useGameStore.getState>) => s.playerShields;
const selectMathModeEnabled = (s: ReturnType<typeof useGameStore.getState>) => s.mathModeEnabled;
const selectMathSettings = (s: ReturnType<typeof useGameStore.getState>) => s.mathSettings;
const selectSetMathSettings = (s: ReturnType<typeof useGameStore.getState>) => s.setMathSettings;
const selectToggleMathMode = (s: ReturnType<typeof useGameStore.getState>) => s.toggleMathMode;

const SetupScreen = memo(() => {
  const setupGame = useGameStore(selectSetupGame);
  const [mathModeOn, setMathModeOn] = useState(false);

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 text-white backdrop-blur-sm pointer-events-auto">
      <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600 mb-8 neon-text">
        WORMHOLE WARP
      </h1>
      <div className="flex gap-4 mb-8" role="group" aria-label="Select number of players">
        {[2, 3, 4].map((num, i) => (
          <button
            key={num}
            autoFocus={i === 0}
            onClick={() => setupGame(num, mathModeOn)}
            className="px-8 py-4 bg-gray-800 hover:bg-cyan-900 border border-cyan-500 rounded-lg text-xl font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:shadow-[0_0_25px_rgba(6,182,212,0.8)]"
          >
            {num} Players
          </button>
        ))}
      </div>

      {/* Math Mode toggle with explanation */}
      <div className="flex flex-col items-center max-w-md w-[90%]">
        <button
          onClick={() => setMathModeOn(prev => !prev)}
          className={`flex items-center gap-3 px-5 py-3 rounded-xl border transition-all ${
            mathModeOn
              ? 'border-cyan-400/60 bg-cyan-900/30 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
              : 'border-white/20 bg-gray-800/60 hover:border-white/40'
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"
              fill={mathModeOn ? '#22d3ee' : 'transparent'}
              stroke={mathModeOn ? '#22d3ee' : '#6b7280'}
              strokeWidth={1.5}
              opacity={mathModeOn ? 1 : 0.5}
            />
            {mathModeOn && (
              <text x="12" y="15" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#0f172a" fontFamily="monospace">+</text>
            )}
          </svg>
          <span className={`text-sm font-bold ${mathModeOn ? 'text-cyan-400' : 'text-gray-400'}`}>
            Math Mode {mathModeOn ? 'ON' : 'OFF'}
          </span>
          <div
            className={`relative w-10 h-5 rounded-full transition-colors ${
              mathModeOn ? 'bg-cyan-500' : 'bg-gray-600'
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                mathModeOn ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </div>
        </button>

        <p className="text-gray-500 text-xs text-center mt-3 leading-relaxed max-w-sm">
          After each dice roll, players solve an addition problem. Answer fast enough to earn
          a <span className="text-cyan-400 font-semibold">Glitch Shield</span> — shields can block wormhole glitches!
          Timer settings can be adjusted in-game.
        </p>
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
        autoFocus
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

const ShieldBadge = memo(({ count }: { count: number }) => (
  <span className="flex items-center gap-1 ml-1">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"
        fill="#22d3ee"
        stroke="#06b6d4"
        strokeWidth={1.5}
      />
    </svg>
    <span className="text-cyan-400 text-xs font-mono font-bold">x{count}</span>
  </span>
));

ShieldBadge.displayName = 'ShieldBadge';

const PlayerList = memo(({ currentPlayerIndex }: PlayerListProps) => {
  const players = useGameStore(selectPlayers);
  const playerInitials = useGameStore(selectPlayerInitials);
  const wormholeHistory = useGameStore(selectWormholeHistory);
  const playerShields = useGameStore(selectPlayerShields);
  const mathModeEnabled = useGameStore(selectMathModeEnabled);

  return (
    <div className="absolute top-4 left-4 flex flex-col gap-3 pointer-events-auto">
      {players.map((p, idx) => {
        const momentum = getMomentumIndicator(p.id, wormholeHistory);
        const shields = playerShields[p.id] || 0;
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
            {mathModeEnabled && shields > 0 && <ShieldBadge count={shields} />}
          </div>
        );
      })}
    </div>
  );
});

PlayerList.displayName = 'PlayerList';

/**
 * Click overlay and 3D render container for the dice.
 * By rendering the 3D dice in its own Canvas inside the HUD layer (z-10),
 * we ensure it is always visually on top of the main board Canvas,
 * even when the camera is zoomed in.
 */
const DicePanel = memo(() => {
  const diceValue = useGameStore(selectDiceValue);
  const isRolling = useGameStore(selectIsRolling);
  const rollDice = useGameStore(selectRollDice);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !isRolling) {
      e.preventDefault();
      rollDice();
    }
  }, [isRolling, rollDice]);

  return (
    <div className="absolute bottom-12 right-12 flex flex-col items-center pointer-events-none">
      <div className="pointer-events-auto flex flex-col items-center">
        <div
          role="button"
          tabIndex={0}
          aria-label={isRolling ? 'Rolling dice...' : 'Roll dice'}
          aria-disabled={isRolling}
          className="h-24 w-24 bg-transparent relative cursor-pointer hover:scale-110 transition-transform duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-full overflow-hidden"
          onClick={!isRolling ? rollDice : undefined}
          onKeyDown={handleKeyDown}
          title="Tap to Roll"
        >
          {/* 
             Separate Canvas for the dice ensures isolation from the main board's 
             depth buffer and z-order.
          */}
          <Canvas 
            camera={{ position: [0, 0, 6], fov: 45 }}
            dpr={[1, 2]}
            gl={{ antialias: true }}
          >
            <ambientLight intensity={0.5} />
            <pointLight position={[5, 5, 5]} intensity={1} />
            <pointLight position={[-5, -5, -5]} intensity={0.5} />
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
    const mathSettings = useGameStore(selectMathSettings);
    const setMathSettings = useGameStore(selectSetMathSettings);
    const mathModeEnabled = useGameStore(selectMathModeEnabled);
    const toggleMathMode = useGameStore(selectToggleMathMode);
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

                        {/* Math Mode Toggle */}
                        <button
                            onClick={toggleMathMode}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors border-t border-white/10"
                        >
                            <span className="text-sm text-white">Math Mode</span>
                            <div
                                className={`relative w-10 h-5 rounded-full transition-colors ${
                                    mathModeEnabled ? 'bg-cyan-500' : 'bg-gray-600'
                                }`}
                            >
                                <div
                                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                        mathModeEnabled ? 'translate-x-5' : 'translate-x-0.5'
                                    }`}
                                />
                            </div>
                        </button>

                        {/* Math Mode: Countdown Timer */}
                        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
                            <span className="text-sm text-white">Math Timer</span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setMathSettings({ countdownSeconds: Math.max(10, mathSettings.countdownSeconds - 10) })}
                                    className="w-6 h-6 flex items-center justify-center rounded bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold"
                                >-</button>
                                <span className="text-xs text-gray-300 font-mono w-8 text-center">{mathSettings.countdownSeconds}s</span>
                                <button
                                    onClick={() => setMathSettings({ countdownSeconds: Math.min(120, mathSettings.countdownSeconds + 10) })}
                                    className="w-6 h-6 flex items-center justify-center rounded bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold"
                                >+</button>
                            </div>
                        </div>

                        {/* Math Mode: Shield Bonus Time */}
                        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
                            <span className="text-sm text-white">Shield Bonus</span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setMathSettings({ shieldThresholdSeconds: Math.max(3, mathSettings.shieldThresholdSeconds - 1) })}
                                    className="w-6 h-6 flex items-center justify-center rounded bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold"
                                >-</button>
                                <span className="text-xs text-gray-300 font-mono w-8 text-center">{mathSettings.shieldThresholdSeconds}s</span>
                                <button
                                    onClick={() => setMathSettings({ shieldThresholdSeconds: Math.min(30, mathSettings.shieldThresholdSeconds + 1) })}
                                    className="w-6 h-6 flex items-center justify-center rounded bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold"
                                >+</button>
                            </div>
                        </div>

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
      <MathChallengeDialog />
      <WormholeDialog />
      <CollisionDialog />
      <ResetViewButton />
    </div>
  );
});

HUD.displayName = 'HUD';
