import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';

interface StarData {
  width: number;
  height: number;
  top: number;
  left: number;
  opacity: number;
  animationDelay: number;
  animationDuration: number;
}

function generateStarField(count: number, seed: number): StarData[] {
  // Simple seeded pseudo-random for deterministic star positions
  let s = seed;
  const next = () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
  return Array.from({ length: count }, () => ({
    width: 1 + next() * 2,
    height: 1 + next() * 2,
    top: next() * 100,
    left: next() * 100,
    opacity: 0.2 + next() * 0.5,
    animationDelay: next() * 4,
    animationDuration: 2 + next() * 3,
  }));
}

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
  const stars = useMemo(() => generateStarField(60, 42), []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#050510] overflow-hidden">
      {/* Background stars (CSS-based for lightweight launcher) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {stars.map((star, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              width: `${star.width}px`,
              height: `${star.height}px`,
              top: `${star.top}%`,
              left: `${star.left}%`,
              opacity: star.opacity,
              animationDelay: `${star.animationDelay}s`,
              animationDuration: `${star.animationDuration}s`,
            }}
          />
        ))}
      </div>

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
          gradientFrom="#1a0a2e"
          gradientTo="#0c1445"
          borderColor="border-purple-500/50"
          glowColor="rgba(168,85,247,0.15)"
          description="Jump stars into black holes until one remains. A cosmic puzzle of strategy!"
          onClick={() => navigateTo('star-solitaire')}
        />
      </motion.div>
    </div>
  );
});

GameLauncher.displayName = 'GameLauncher';
