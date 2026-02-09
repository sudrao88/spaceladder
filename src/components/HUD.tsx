import { memo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Dice } from './Dice';
import { WormholeDialog } from './WormholeDialog';
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
const selectIsDefaultView = (s: ReturnType<typeof useGameStore.getState>) => s.isDefaultView;
const selectTriggerCameraReset = (s: ReturnType<typeof useGameStore.getState>) => s.triggerCameraReset;

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

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90 text-white pointer-events-auto">
      <h1 className="text-5xl font-bold text-yellow-400 mb-4 animate-pulse">GAME OVER</h1>
      <h2 className="text-3xl mb-8">
          Player <span style={{ color: winner?.color }}>{winner?.id! + 1}</span> Wins!
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

const PlayerList = memo(({ currentPlayerIndex }: PlayerListProps) => {
  const players = useGameStore(selectPlayers);

  return (
    <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-auto">
      {players.map((p, idx) => (
        <div
          key={p.id}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-md border border-l-4 transition-all
              ${idx === currentPlayerIndex ? 'border-white scale-105 shadow-lg' : 'border-transparent opacity-70'}
          `}
          style={{ borderLeftColor: p.color }}
        >
          <span className="text-xl" role="img" aria-label="player-token">
            {PLAYER_EMOJIS[p.id % PLAYER_EMOJIS.length]}
          </span>
          <span className="text-white font-mono font-bold text-sm">P{p.id + 1}</span>
          <span className="text-cyan-300 ml-1 text-xs">Tile: {p.position}</span>
        </div>
      ))}
    </div>
  );
});

PlayerList.displayName = 'PlayerList';

const DicePanel = memo(() => {
  const diceValue = useGameStore(selectDiceValue);
  const isRolling = useGameStore(selectIsRolling);
  const rollDice = useGameStore(selectRollDice);
  const currentPlayerIndex = useGameStore(selectCurrentPlayerIndex);
  const players = useGameStore(selectPlayers);
  const currentPlayer = players[currentPlayerIndex];

  return (
    <div className="absolute right-0 top-0 bottom-0 w-40 flex flex-col items-center justify-center pointer-events-none">
      <div className="flex flex-col items-center pointer-events-auto bg-black/60 p-3 rounded-l-xl backdrop-blur-md border-l border-y border-white/10 hover:border-white/30 transition-all shadow-2xl">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-300">
          {isRolling ? 'Rolling...' : `Player ${currentPlayer?.id + 1}`}
        </div>
        <div className="h-20 w-20 bg-transparent mb-4 relative">
          <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
            <ambientLight intensity={0.7} />
            <pointLight position={[5, 5, 5]} intensity={1} />
            <pointLight position={[-5, -5, -5]} intensity={0.5} />
            <Dice value={diceValue} isRolling={isRolling} />
          </Canvas>
        </div>
        <button
          onClick={rollDice}
          disabled={isRolling}
          className={`
            w-full py-2 rounded border-2 flex items-center justify-center text-white font-bold text-sm transition-all
            ${isRolling
              ? 'border-gray-600 bg-gray-800 cursor-not-allowed'
              : 'border-cyan-500 bg-cyan-900/80 hover:bg-cyan-700 hover:scale-105 shadow-lg'
            }
          `}
        >
          ROLL
        </button>
      </div>
    </div>
  );
});

DicePanel.displayName = 'DicePanel';

const ResetViewButton = memo(() => {
    const isDefaultView = useGameStore(selectIsDefaultView);
    const triggerCameraReset = useGameStore(selectTriggerCameraReset);
    
    if (isDefaultView) return null;
    
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

export const HUD = memo(() => {
  const gameStatus = useGameStore(selectGameStatus);
  const currentPlayerIndex = useGameStore(selectCurrentPlayerIndex);

  if (gameStatus === 'setup') {
    return <SetupScreen />;
  }

  if (gameStatus === 'finished') {
    return <FinishedScreen />;
  }

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      <PlayerList currentPlayerIndex={currentPlayerIndex} />
      <DicePanel />
      <WormholeDialog />
      <ResetViewButton />
    </div>
  );
});

HUD.displayName = 'HUD';
