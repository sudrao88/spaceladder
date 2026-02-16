import { memo, useMemo } from 'react';
import { SolitaireBoard } from './SolitaireBoard';
import { SolitaireHUD } from './SolitaireHUD';

interface BgStar {
  width: number;
  height: number;
  top: number;
  left: number;
  opacity: number;
  animationDelay: number;
  animationDuration: number;
}

function generateBgStars(count: number, seed: number): BgStar[] {
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
    opacity: 0.15 + next() * 0.4,
    animationDelay: next() * 5,
    animationDuration: 3 + next() * 4,
  }));
}

export const StarSolitaire = memo(() => {
  const bgStars = useMemo(() => generateBgStars(40, 77), []);

  return (
    <div className="relative w-full h-screen bg-[#050510] overflow-hidden select-none">
      {/* Background with subtle space ambiance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Nebula gradients */}
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-10 blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)',
            top: '-10%',
            right: '-5%',
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-10 blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(6,182,212,0.3) 0%, transparent 70%)',
            bottom: '-10%',
            left: '-5%',
          }}
        />

        {/* Scattered stars */}
        {bgStars.map((star, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white solitaire-twinkle"
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

      {/* Landscape Enforcement Overlay */}
      <div className="landscape-enforce fixed inset-0 z-[100] bg-black text-white items-center justify-center p-8 text-center">
        <p className="text-xl font-bold">Please rotate your device to landscape mode to play.</p>
      </div>

      {/* HUD (overlays) */}
      <SolitaireHUD />

      {/* Board - centered */}
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <SolitaireBoard />
      </div>
    </div>
  );
});

StarSolitaire.displayName = 'StarSolitaire';
