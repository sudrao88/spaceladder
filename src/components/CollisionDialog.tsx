import { memo, useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { PLAYER_EMOJIS } from '../utils/boardUtils';
import { useFocusTrap } from '../hooks/useFocusTrap';

const selectPendingCollision = (s: ReturnType<typeof useGameStore.getState>) => s.pendingCollision;
const selectExecuteCollision = (s: ReturnType<typeof useGameStore.getState>) => s.executeCollision;
const selectPlayers = (s: ReturnType<typeof useGameStore.getState>) => s.players;
const selectPlayerInitials = (s: ReturnType<typeof useGameStore.getState>) => s.playerInitials;

const COLLISION_MESSAGES = [
  'Two ships tried to dock at the same port!',
  'Orbital paths have intersected!',
  'A near-miss turned into a direct hit!',
  'Space is vast, yet you found each other!',
];

const EJECT_ANIMATION_DURATION_MS = 1000;

export const CollisionDialog = memo(() => {
  const pendingCollision = useGameStore(selectPendingCollision);
  const executeCollision = useGameStore(selectExecuteCollision);
  const players = useGameStore(selectPlayers);
  const playerInitials = useGameStore(selectPlayerInitials);
  const [isEjecting, setIsEjecting] = useState(false);
  const focusTrapRef = useFocusTrap<HTMLDivElement>([isEjecting]);

  const message = useMemo(() => {
    if (!pendingCollision) return '';
    const index = (pendingCollision.movingPlayerId * 17 + pendingCollision.tile) % COLLISION_MESSAGES.length;
    return COLLISION_MESSAGES[index];
  }, [pendingCollision]);

  const handleEject = useCallback(() => {
    setIsEjecting(true);
  }, []);

  useEffect(() => {
    if (!isEjecting) return;
    const timer = setTimeout(() => {
      executeCollision();
      setIsEjecting(false);
    }, EJECT_ANIMATION_DURATION_MS);
    return () => clearTimeout(timer);
  }, [isEjecting, executeCollision]);

  const isVisible = pendingCollision !== null;

  const { winner, loser, winnerEmoji, loserEmoji, winnerLabel, loserLabel, collisionTile, loserDestination } = useMemo(() => {
    if (!pendingCollision) {
      return { winner: null, loser: null, winnerEmoji: '🚀', loserEmoji: '🚀', winnerLabel: '', loserLabel: '', collisionTile: 0, loserDestination: 0 };
    }
    const w = players.find(p => p.id === pendingCollision.winnerId) ?? null;
    const l = players.find(p => p.id === pendingCollision.loserId) ?? null;
    return {
      winner: w,
      loser: l,
      winnerEmoji: w ? PLAYER_EMOJIS[w.id % PLAYER_EMOJIS.length] : '🚀',
      loserEmoji: l ? PLAYER_EMOJIS[l.id % PLAYER_EMOJIS.length] : '🚀',
      winnerLabel: w ? (playerInitials[w.id] || `P${w.id + 1}`) : '',
      loserLabel: l ? (playerInitials[l.id] || `P${l.id + 1}`) : '',
      collisionTile: pendingCollision.tile,
      loserDestination: pendingCollision.loserDestination,
    };
  }, [pendingCollision, players, playerInitials]);

  if (!isVisible && !isEjecting) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={focusTrapRef}
          key="collision-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Space Collision"
          className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Dialog card */}
          <motion.div
            className="relative z-10 flex flex-col items-center max-w-sm w-[90%] overflow-hidden rounded-2xl border shadow-2xl"
            style={{
              borderColor: 'rgba(251,146,60,0.5)',
              background: 'radial-gradient(ellipse at center, #1c1917 0%, #0c0a09 100%)',
              boxShadow: '0 0 60px rgba(251,146,60,0.25), 0 0 120px rgba(251,146,60,0.1)',
            }}
            initial={{ scale: 0.7, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -30 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          >
            <AnimatePresence mode="wait">
              {!isEjecting && (
                <motion.div
                  key="collision-prompt"
                  className="flex flex-col items-center p-6 w-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Impact icon with pulsing ring */}
                  <div className="relative mb-4">
                    <div
                      className="collision-ring"
                    />
                    <span className="text-5xl relative z-10 block" role="img" aria-label="collision">
                      💥
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-center mb-1 text-orange-400">
                    Space Collision!
                  </h2>

                  <p className="text-gray-300 text-sm text-center mb-2 leading-snug">
                    {message}
                  </p>

                  {/* Show the two colliding players */}
                  <div className="flex items-center justify-center gap-4 mb-2">
                    <div className="flex flex-col items-center">
                      <span className="text-3xl">{winnerEmoji}</span>
                      <span className="text-xs font-mono mt-1" style={{ color: winner?.color }}>{winnerLabel}</span>
                    </div>
                    <span className="text-2xl text-orange-400">⚡</span>
                    <div className="flex flex-col items-center">
                      <span className="text-3xl">{loserEmoji}</span>
                      <span className="text-xs font-mono mt-1" style={{ color: loser?.color }}>{loserLabel}</span>
                    </div>
                  </div>

                  <p className="text-gray-400 text-xs text-center mb-1 font-mono">
                    Tile {collisionTile}
                  </p>

                  {/* Outcome */}
                  <div className="bg-black/40 rounded-lg px-4 py-2 mb-3 border border-orange-500/20">
                    <p className="text-orange-300 text-sm text-center">
                      {winnerEmoji} <span style={{ color: winner?.color }} className="font-bold">{winnerLabel}</span> holds position!
                    </p>
                    <p className="text-orange-300 text-sm text-center">
                      {loserEmoji} <span style={{ color: loser?.color }} className="font-bold">{loserLabel}</span> retreats to Tile {loserDestination}
                    </p>
                  </div>

                  <button
                    onClick={handleEject}
                    className="group relative px-8 py-3 rounded-xl font-bold text-white text-base transition-all active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #c2410c, #ea580c, #fb923c)',
                      boxShadow: '0 0 20px rgba(251,146,60,0.5)',
                    }}
                  >
                    <span className="relative z-10">Eject!</span>
                    <div
                      className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ boxShadow: '0 0 30px rgba(251,146,60,0.8), inset 0 0 30px rgba(251,146,60,0.15)' }}
                    />
                  </button>
                </motion.div>
              )}

              {/* Ejection animation phase */}
              {isEjecting && (
                <motion.div
                  key="ejecting"
                  className="flex flex-col items-center justify-center p-6 w-full h-[250px] relative overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Winner stays centered */}
                  <motion.span
                    className="text-5xl relative z-10"
                    role="img"
                    aria-label="winner stays"
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6 }}
                  >
                    {winnerEmoji}
                  </motion.span>

                  {/* Loser gets ejected */}
                  <motion.span
                    className="text-4xl absolute z-10"
                    role="img"
                    aria-label="loser ejected"
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{
                      x: [0, -20, -150],
                      y: [0, -30, 80],
                      opacity: [1, 1, 0],
                      scale: [1, 0.8, 0.3],
                      rotate: [0, -30, -180],
                    }}
                    transition={{ duration: 0.8, ease: 'easeIn' }}
                  >
                    {loserEmoji}
                  </motion.span>

                  <motion.p
                    className="absolute bottom-5 text-sm font-bold tracking-widest uppercase text-orange-400"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: [0, 1, 1, 0], y: [10, 0, 0, -10] }}
                    transition={{ duration: 0.8, times: [0, 0.15, 0.7, 1] }}
                  >
                    Ejecting...
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

CollisionDialog.displayName = 'CollisionDialog';
