import { memo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { CssStarfield } from './shared';

const SOLITAIRE_STAR_CONFIG = {
  minOpacity: 0.15,
  opacityRange: 0.4,
  maxDelay: 5,
  minDuration: 3,
  durationRange: 4,
};

const GameCard = memo(({
  title,
  subtitle,
  emoji,
  gradientFrom,
  gradientTo,
  borderColor,
  glowColor,
  onClick,
  description,
}: {
  title: string;
  subtitle: string;
  emoji: string;
  gradientFrom: string;
  gradientTo: string;
  borderColor: string;
  glowColor: string;
  onClick: () => void;
  description: string;
}) => (
  <motion.button
    whileHover={{ scale: 1.05, y: -4 }}
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    className={`relative flex flex-col items-center justify-center w-72 h-80 rounded-2xl border-2 ${borderColor} cursor-pointer transition-shadow`}
    style={{
      background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
      boxShadow: `0 0 30px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.1)`,
    }}
  >
    <span className="text-6xl mb-4" role="img" aria-label={title}>
      {emoji}
    </span>
    <h2 className="text-2xl font-bold text-white mb-1">{title}</h2>
    <p className="text-sm text-gray-300 mb-3">{subtitle}</p>
    <p className="text-xs text-gray-400 px-6 text-center leading-relaxed">{description}</p>

    {/* Corner decorations */}
    <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-white/30" />
    <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-white/30" />
    <div className="absolute bottom-3 left-3 w-2 h-2 rounded-full bg-white/30" />
    <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-white/30" />
  </motion.button>
));

GameCard.displayName = 'GameCard';

export const GameLauncher = memo(() => {
  const navigateTo = useAppStore((s) => s.navigateTo);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#050510] overflow-hidden">
      <CssStarfield count={60} seed={42} config={SOLITAIRE_STAR_CONFIG} />

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-12 text-center z-10"
      >
        <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 mb-2">
          SPACE LADDER
        </h1>
        <p className="text-gray-400 text-lg tracking-widest uppercase">Game Collection</p>
      </motion.div>

      {/* Game cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex gap-8 z-10"
      >
        <GameCard
          title="Wormhole Warp"
          subtitle="2-4 Players"
          emoji="🚀"
          gradientFrom="#0f172a"
          gradientTo="#1e1b4b"
          borderColor="border-cyan-500/50"
          glowColor="rgba(6,182,212,0.15)"
          description="Race across 100 tiles through wormholes. First to reach the end wins!"
          onClick={() => navigateTo('wormhole-warp')}
        />

        <GameCard
          title="Star Solitaire"
          subtitle="1 Player"
          emoji="⭐"
          gradientFrom="#0c1445"
          gradientTo="#1e1b4b"
          borderColor="border-cyan-500/50"
          glowColor="rgba(6,182,212,0.15)"
          description="Jump stars into black holes until one remains. A cosmic puzzle of strategy!"
          onClick={() => navigateTo('star-solitaire')}
        />
      </motion.div>
    </div>
  );
});

GameLauncher.displayName = 'GameLauncher';
