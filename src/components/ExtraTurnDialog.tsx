import { memo, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { PLAYER_EMOJIS } from '../utils/boardUtils';
import { useFocusTrap } from '../hooks/useFocusTrap';

const selectPendingExtraTurn = (s: ReturnType<typeof useGameStore.getState>) => s.pendingExtraTurn;
const selectAcknowledgeExtraTurn = (s: ReturnType<typeof useGameStore.getState>) => s.acknowledgeExtraTurn;
const selectPlayers = (s: ReturnType<typeof useGameStore.getState>) => s.players;
const selectPlayerInitials = (s: ReturnType<typeof useGameStore.getState>) => s.playerInitials;

export const ExtraTurnDialog = memo(() => {
  const pendingExtraTurn = useGameStore(selectPendingExtraTurn);
  const acknowledgeExtraTurn = useGameStore(selectAcknowledgeExtraTurn);
  const players = useGameStore(selectPlayers);
  const playerInitials = useGameStore(selectPlayerInitials);
  const focusTrapRef = useFocusTrap<HTMLDivElement>([pendingExtraTurn]);

  const handleAcknowledge = useCallback(() => {
    acknowledgeExtraTurn();
  }, [acknowledgeExtraTurn]);

  const { player, emoji, label } = useMemo(() => {
    if (!pendingExtraTurn) return { player: null, emoji: '🚀', label: '' };
    const p = players.find(pl => pl.id === pendingExtraTurn.playerId) ?? null;
    return {
      player: p,
      emoji: p ? PLAYER_EMOJIS[p.id % PLAYER_EMOJIS.length] : '🚀',
      label: p ? (playerInitials[p.id] || `P${p.id + 1}`) : '',
    };
  }, [pendingExtraTurn, players, playerInitials]);

  const isVisible = pendingExtraTurn !== null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={focusTrapRef}
          key="extra-turn-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Extra Turn"
          className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <motion.div
            className="relative z-10 flex flex-col items-center max-w-sm w-full rounded-2xl border shadow-2xl"
            style={{
              borderColor: 'rgba(250,204,21,0.5)',
              background: 'radial-gradient(ellipse at center, #1c1917 0%, #0c0a09 100%)',
              boxShadow: '0 0 60px rgba(250,204,21,0.25), 0 0 120px rgba(250,204,21,0.1)',
            }}
            initial={{ scale: 0.7, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -30 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          >
            <div className="flex flex-col items-center p-6 w-full">
              <motion.div
                className="text-6xl mb-3"
                role="img"
                aria-label="dice rolled six"
                initial={{ rotate: -15, scale: 0.8 }}
                animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: [1, 1.15, 1] }}
                transition={{ duration: 0.8 }}
              >
                🎲
              </motion.div>

              <h2 className="text-2xl font-bold text-center mb-2 text-yellow-300">
                Lucky Six!
              </h2>

              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="text-4xl">{emoji}</span>
                <span
                  className="text-lg font-mono font-bold"
                  style={{ color: player?.color }}
                >
                  {label}
                </span>
              </div>

              <p className="text-gray-200 text-sm text-center mb-5 leading-snug">
                You rolled a 6 — take another turn!
              </p>

              <button
                onClick={handleAcknowledge}
                className="group relative px-8 py-3 rounded-xl font-bold text-white text-base transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #ca8a04, #eab308, #facc15)',
                  boxShadow: '0 0 20px rgba(250,204,21,0.5)',
                }}
              >
                <span className="relative z-10">Roll Again</span>
                <div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ boxShadow: '0 0 30px rgba(250,204,21,0.8), inset 0 0 30px rgba(250,204,21,0.15)' }}
                />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

ExtraTurnDialog.displayName = 'ExtraTurnDialog';
