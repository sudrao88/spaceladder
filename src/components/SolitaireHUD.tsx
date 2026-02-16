import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSolitaireStore } from '../store/useSolitaireStore';
import { useAppStore } from '../store/useAppStore';

const selectGamePhase = (s: ReturnType<typeof useSolitaireStore.getState>) => s.gamePhase;
const selectMoveCount = (s: ReturnType<typeof useSolitaireStore.getState>) => s.moveCount;
const selectStarsRemaining = (s: ReturnType<typeof useSolitaireStore.getState>) => s.starsRemaining;
const selectBestScore = (s: ReturnType<typeof useSolitaireStore.getState>) => s.bestScore;
const selectStartGame = (s: ReturnType<typeof useSolitaireStore.getState>) => s.startGame;
const selectUndoMove = (s: ReturnType<typeof useSolitaireStore.getState>) => s.undoMove;
const selectResetGame = (s: ReturnType<typeof useSolitaireStore.getState>) => s.resetGame;
const selectMoveHistory = (s: ReturnType<typeof useSolitaireStore.getState>) => s.moveHistory;

const BackButton = memo(() => {
  const navigateTo = useAppStore((s) => s.navigateTo);

  return (
    <button
      onClick={() => navigateTo('launcher')}
      className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg border border-white/10 transition-all text-sm z-20"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      Games
    </button>
  );
});

BackButton.displayName = 'BackButton';

const StatsPanel = memo(() => {
  const moveCount = useSolitaireStore(selectMoveCount);
  const starsRemaining = useSolitaireStore(selectStarsRemaining);
  const bestScore = useSolitaireStore(selectBestScore);

  return (
    <div className="flex gap-6 items-center">
      <div className="flex flex-col items-center">
        <span className="text-xs text-gray-400 uppercase tracking-wider">Stars</span>
        <span className="text-2xl font-bold text-yellow-400">{starsRemaining}</span>
      </div>
      <div className="w-px h-8 bg-gray-600" />
      <div className="flex flex-col items-center">
        <span className="text-xs text-gray-400 uppercase tracking-wider">Moves</span>
        <span className="text-2xl font-bold text-cyan-400">{moveCount}</span>
      </div>
      {bestScore !== null && (
        <>
          <div className="w-px h-8 bg-gray-600" />
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Best</span>
            <span className="text-2xl font-bold text-purple-400">{bestScore}</span>
          </div>
        </>
      )}
    </div>
  );
});

StatsPanel.displayName = 'StatsPanel';

const ActionButtons = memo(() => {
  const undoMove = useSolitaireStore(selectUndoMove);
  const resetGame = useSolitaireStore(selectResetGame);
  const moveHistory = useSolitaireStore(selectMoveHistory);
  const startGame = useSolitaireStore(selectStartGame);
  const canUndo = moveHistory.length > 0;

  return (
    <div className="flex gap-3">
      <button
        onClick={undoMove}
        disabled={!canUndo}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
          canUndo
            ? 'bg-gray-800/80 hover:bg-gray-700 text-white border-white/20 hover:border-white/40'
            : 'bg-gray-900/50 text-gray-600 border-gray-700/30 cursor-not-allowed'
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7v6h6M21 17a9 9 0 00-9-9 9 9 0 00-6.69 3L3 13" />
        </svg>
        Undo
      </button>
      <button
        onClick={() => { resetGame(); startGame(); }}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-white border border-white/20 hover:border-white/40 text-sm font-medium transition-all"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 4v6h-6M1 20v-6h6" />
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
        </svg>
        Restart
      </button>
    </div>
  );
});

ActionButtons.displayName = 'ActionButtons';

const IdleScreen = memo(() => {
  const startGame = useSolitaireStore(selectStartGame);
  const bestScore = useSolitaireStore(selectBestScore);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col items-center"
      >
        <span className="text-7xl mb-6">⭐</span>
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-purple-500 mb-3">
          STAR SOLITAIRE
        </h1>
        <p className="text-gray-400 mb-2 text-center max-w-md">
          Jump stars over each other into black holes. Try to leave just one star remaining!
        </p>
        {bestScore !== null && (
          <p className="text-purple-400 text-sm mb-6">
            Your best: {bestScore} {bestScore === 1 ? 'star' : 'stars'} remaining
          </p>
        )}
        {bestScore === null && <div className="mb-6" />}
        <button
          autoFocus
          onClick={startGame}
          className="px-10 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xl font-bold shadow-lg shadow-purple-500/30 transition-all active:scale-95 border border-purple-400/30"
        >
          Start Game
        </button>
      </motion.div>
    </motion.div>
  );
});

IdleScreen.displayName = 'IdleScreen';

const EndScreen = memo(() => {
  const gamePhase = useSolitaireStore(selectGamePhase);
  const starsRemaining = useSolitaireStore(selectStarsRemaining);
  const moveCount = useSolitaireStore(selectMoveCount);
  const startGame = useSolitaireStore(selectStartGame);
  const resetGame = useSolitaireStore(selectResetGame);
  const bestScore = useSolitaireStore(selectBestScore);

  if (gamePhase !== 'won' && gamePhase !== 'lost') return null;

  const isWin = gamePhase === 'won';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="flex flex-col items-center bg-gray-900/95 rounded-2xl p-8 border border-white/10 shadow-2xl max-w-sm w-full"
      >
        <span className="text-6xl mb-4">{isWin ? '🌟' : '💫'}</span>
        <h2 className={`text-3xl font-bold mb-2 ${isWin ? 'text-yellow-400' : 'text-purple-400'}`}>
          {isWin ? 'PERFECT!' : 'GAME OVER'}
        </h2>
        <p className="text-gray-300 mb-1 text-center">
          {isWin
            ? 'You solved it! Only one star remains in the center!'
            : `${starsRemaining} ${starsRemaining === 1 ? 'star' : 'stars'} remaining. No more moves available.`}
        </p>
        <p className="text-gray-500 text-sm mb-1">Completed in {moveCount} moves</p>
        {bestScore !== null && (
          <p className="text-purple-400 text-sm mb-6">
            Best: {bestScore} {bestScore === 1 ? 'star' : 'stars'}
          </p>
        )}
        {bestScore === null && <div className="mb-6" />}
        <div className="flex gap-3">
          <button
            autoFocus
            onClick={() => { resetGame(); startGame(); }}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-all active:scale-95"
          >
            Play Again
          </button>
          <button
            onClick={() => useAppStore.getState().navigateTo('launcher')}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition-all active:scale-95"
          >
            Home
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
});

EndScreen.displayName = 'EndScreen';

export const SolitaireHUD = memo(() => {
  const gamePhase = useSolitaireStore(selectGamePhase);

  return (
    <>
      <BackButton />

      <AnimatePresence>
        {gamePhase === 'idle' && <IdleScreen />}
      </AnimatePresence>

      {gamePhase === 'playing' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-10">
          <StatsPanel />
          <ActionButtons />
        </div>
      )}

      <AnimatePresence>
        <EndScreen />
      </AnimatePresence>
    </>
  );
});

SolitaireHUD.displayName = 'SolitaireHUD';
