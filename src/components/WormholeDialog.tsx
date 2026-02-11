import { memo, useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import type { WormholeType } from '../store/useGameStore';
import { PLAYER_EMOJIS } from '../utils/boardUtils';
import { useFocusTrap } from '../hooks/useFocusTrap';

const selectPendingWormhole = (s: ReturnType<typeof useGameStore.getState>) => s.pendingWormhole;
const selectExecuteTeleport = (s: ReturnType<typeof useGameStore.getState>) => s.executeTeleport;
const selectPlayers = (s: ReturnType<typeof useGameStore.getState>) => s.players;

const BOOST_MESSAGES = [
  'Wormhole detected! The cosmos are in your favour!',
  'A rift in spacetime! Lucky you, traveller!',
  'Wormhole incoming! Buckle up for a stellar shortcut!',
  'The universe just opened a fast lane for you!',
];

const GLITCH_MESSAGES = [
  'Wormhole alert! Space has a quirky sense of humour...',
  'A rogue wormhole! Hold on tight, things got wobbly!',
  'Spacetime hiccup! The cosmos giveth and taketh away!',
  'Wormhole glitch detected! Turbulence ahead!',
];

const SLINGSHOT_MESSAGES = [
  'Cosmic slingshot engaged! The universe is evening the odds!',
  'A gravitational assist from a passing star! Catch-up time!',
  'The galaxy takes pity on the underdog! Full speed ahead!',
  'A rare spacetime corridor opens! Leapfrog incoming!',
];

const GRAVITY_WELL_MESSAGES = [
  'Gravity well detected! The pack is pulling you back!',
  'A dark matter anomaly drags you toward the fleet!',
  'The cosmos demands balance! Spacetime correction incoming!',
  'A stellar anchor latches on! The lead was too comfortable!',
];

interface WormholeTheme {
  title: string;
  borderColor: string;
  glowColor: string;
  textColor: string;
  buttonGradient: string;
  buttonGlow: string;
  hoverGlow: string;
  warpText: string;
}

const WORMHOLE_THEMES: Record<WormholeType, WormholeTheme> = {
  boost: {
    title: 'Wormhole Boost!',
    borderColor: 'rgba(6,182,212,0.5)',
    glowColor: 'rgba(6,182,212,0.25)',
    textColor: '#22d3ee',
    buttonGradient: 'linear-gradient(135deg, #0891b2, #06b6d4, #22d3ee)',
    buttonGlow: '0 0 20px rgba(6,182,212,0.5)',
    hoverGlow: '0 0 30px rgba(6,182,212,0.8), inset 0 0 30px rgba(6,182,212,0.15)',
    warpText: 'Warping through spacetime...',
  },
  glitch: {
    title: 'Wormhole Glitch!',
    borderColor: 'rgba(168,85,247,0.5)',
    glowColor: 'rgba(168,85,247,0.25)',
    textColor: '#c084fc',
    buttonGradient: 'linear-gradient(135deg, #7c3aed, #a855f7, #c084fc)',
    buttonGlow: '0 0 20px rgba(168,85,247,0.5)',
    hoverGlow: '0 0 30px rgba(168,85,247,0.8), inset 0 0 30px rgba(168,85,247,0.15)',
    warpText: 'Warping through spacetime...',
  },
  slingshot: {
    title: 'Cosmic Slingshot!',
    borderColor: 'rgba(250,204,21,0.5)',
    glowColor: 'rgba(250,204,21,0.25)',
    textColor: '#facc15',
    buttonGradient: 'linear-gradient(135deg, #ca8a04, #eab308, #facc15)',
    buttonGlow: '0 0 20px rgba(250,204,21,0.5)',
    hoverGlow: '0 0 30px rgba(250,204,21,0.8), inset 0 0 30px rgba(250,204,21,0.15)',
    warpText: 'Slingshotting past the competition...',
  },
  'gravity-well': {
    title: 'Gravity Well!',
    borderColor: 'rgba(239,68,68,0.5)',
    glowColor: 'rgba(239,68,68,0.25)',
    textColor: '#f87171',
    buttonGradient: 'linear-gradient(135deg, #b91c1c, #ef4444, #f87171)',
    buttonGlow: '0 0 20px rgba(239,68,68,0.5)',
    hoverGlow: '0 0 30px rgba(239,68,68,0.8), inset 0 0 30px rgba(239,68,68,0.15)',
    warpText: 'Gravitational pull engaging...',
  },
};

const MESSAGE_POOLS: Record<WormholeType, string[]> = {
  boost: BOOST_MESSAGES,
  glitch: GLITCH_MESSAGES,
  slingshot: SLINGSHOT_MESSAGES,
  'gravity-well': GRAVITY_WELL_MESSAGES,
};

const STAR_COUNT = 60;

/** Pre-generate star data so values are stable and computed outside render */
const STAR_DATA = Array.from({ length: STAR_COUNT }, (_, i) => ({
  index: i,
  angle: (i / STAR_COUNT) * 360,
  delay: (i * 0.02) % 0.6,
  length: 40 + ((((i * 7919) % 97) / 97) * 80), // deterministic pseudo-random
}));

interface StarProps {
  angle: number;
  delay: number;
  length: number;
}

/** A single animated star streak for the warp tunnel effect */
const WarpStar = memo(({ angle, delay, length }: StarProps) => {
  return (
    <div
      className="warp-star"
      style={{
        '--angle': `${angle}deg`,
        '--delay': `${delay}s`,
        '--length': `${length}px`,
      } as React.CSSProperties}
    />
  );
});

WarpStar.displayName = 'WarpStar';

const WARP_ANIMATION_DURATION_MS = 1400;

export const WormholeDialog = memo(() => {
  const pendingWormhole = useGameStore(selectPendingWormhole);
  const executeTeleport = useGameStore(selectExecuteTeleport);
  const players = useGameStore(selectPlayers);
  const [isWarping, setIsWarping] = useState(false);
  const focusTrapRef = useFocusTrap<HTMLDivElement>();

  // Pick a message and theme deterministically from the wormhole data
  const wormholeType = pendingWormhole?.wormholeType ?? (pendingWormhole?.isBoost ? 'boost' : 'glitch');
  const theme = WORMHOLE_THEMES[wormholeType];

  const message = useMemo(() => {
    if (!pendingWormhole) return '';
    const type = pendingWormhole.wormholeType ?? (pendingWormhole.isBoost ? 'boost' : 'glitch');
    const pool = MESSAGE_POOLS[type];
    const index = (pendingWormhole.playerId * 31 + pendingWormhole.destination) % pool.length;
    return pool[index];
  }, [pendingWormhole]);

  const handleTeleport = useCallback(() => {
    setIsWarping(true);
  }, []);

  // Execute teleport after warp animation completes; clean up on unmount
  useEffect(() => {
    if (!isWarping) return;
    const timer = setTimeout(() => {
      executeTeleport();
      setIsWarping(false);
    }, WARP_ANIMATION_DURATION_MS);
    return () => clearTimeout(timer);
  }, [isWarping, executeTeleport]);

  // Derive visibility from store state — no effect needed
  const isVisible = pendingWormhole !== null;

  if (!isVisible && !isWarping) return null;

  const player = pendingWormhole ? players.find(p => p.id === pendingWormhole.playerId) : null;
  const emoji = player ? PLAYER_EMOJIS[player.id % PLAYER_EMOJIS.length] : '🚀';
  const destinationTile = pendingWormhole?.destination ?? 0;

  // Icon for the wormhole type
  const wormholeIcon = wormholeType === 'slingshot' ? '☄️'
    : wormholeType === 'gravity-well' ? '🕳️'
    : '🌀';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={focusTrapRef}
          key="wormhole-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={theme.title}
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
              borderColor: theme.borderColor,
              background: 'radial-gradient(ellipse at center, #0f172a 0%, #020617 100%)',
              boxShadow: `0 0 60px ${theme.glowColor}, 0 0 120px ${theme.glowColor.replace('0.25', '0.1')}`,
            }}
            initial={{ scale: 0.7, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -30 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          >
            {/* ---- PROMPT PHASE ---- */}
            <AnimatePresence mode="wait">
              {!isWarping && (
                <motion.div
                  key="prompt"
                  className="flex flex-col items-center p-6 w-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Pulsing wormhole ring */}
                  <div className="relative mb-4">
                    <div
                      className="wormhole-ring"
                      style={{
                        '--ring-color': theme.borderColor.replace('0.5', '0.6'),
                      } as React.CSSProperties}
                    />
                    <span className="text-5xl relative z-10 block" role="img" aria-label="wormhole">
                      {wormholeIcon}
                    </span>
                  </div>

                  <h2
                    className="text-xl font-bold text-center mb-1"
                    style={{ color: theme.textColor }}
                  >
                    {theme.title}
                  </h2>

                  <p className="text-gray-300 text-sm text-center mb-1 leading-snug">
                    {message}
                  </p>

                  <p className="text-gray-400 text-xs text-center mb-3 font-mono">
                    Destination: Tile {destinationTile}
                  </p>

                  <button
                    onClick={handleTeleport}
                    className="group relative px-8 py-3 rounded-xl font-bold text-white text-base transition-all active:scale-95"
                    style={{
                      background: theme.buttonGradient,
                      boxShadow: theme.buttonGlow,
                    }}
                  >
                    <span className="relative z-10">Teleport Now!</span>
                    <div
                      className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ boxShadow: theme.hoverGlow }}
                    />
                  </button>
                </motion.div>
              )}

              {/* ---- WARP ANIMATION PHASE ---- */}
              {isWarping && (
                <motion.div
                  key="warping"
                  className="flex flex-col items-center justify-center p-6 w-full h-[280px] relative overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Warp star streaks radiating outward from centre */}
                  <div className="warp-tunnel">
                    {STAR_DATA.map((star) => (
                      <WarpStar key={star.index} angle={star.angle} delay={star.delay} length={star.length} />
                    ))}
                  </div>

                  {/* Central emoji with scale + shake animation */}
                  <motion.span
                    className="text-6xl relative z-10 drop-shadow-[0_0_20px_rgba(255,255,255,0.6)]"
                    role="img"
                    aria-label="player warping"
                    initial={{ scale: 1 }}
                    animate={{
                      scale: [1, 1.3, 1.1, 1.4, 0],
                      rotate: [0, -5, 5, -3, 0],
                      opacity: [1, 1, 1, 1, 0],
                    }}
                    transition={{ duration: 1.2, ease: 'easeIn' }}
                  >
                    {emoji}
                  </motion.span>

                  {/* Warp status text */}
                  <motion.p
                    className="absolute bottom-5 text-sm font-bold tracking-widest uppercase"
                    style={{ color: theme.textColor }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: [0, 1, 1, 0], y: [10, 0, 0, -10] }}
                    transition={{ duration: 1.2, times: [0, 0.15, 0.7, 1] }}
                  >
                    {theme.warpText}
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

WormholeDialog.displayName = 'WormholeDialog';
