import { memo } from 'react';
import { SolitaireBoard } from './SolitaireBoard';
import { SolitaireHUD } from './SolitaireHUD';
import { LandscapeEnforcer, CssStarfield } from './shared';

const BG_STAR_CONFIG = {
  minOpacity: 0.15,
  opacityRange: 0.4,
  maxDelay: 5,
  minDuration: 3,
  durationRange: 4,
};

export const StarSolitaire = memo(() => {
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
      </div>

      <CssStarfield count={40} seed={77} className="solitaire-twinkle" config={BG_STAR_CONFIG} />

      <LandscapeEnforcer />

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
