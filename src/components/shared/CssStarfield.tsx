import { memo, useMemo } from 'react';
import { generateStarField } from '../../utils/starfield';
import type { StarFieldConfig } from '../../utils/starfield';

/**
 * Shared CSS-based starfield background.
 * Renders lightweight animated dots for space ambiance without WebGL.
 */
export const CssStarfield = memo(({
  count = 50,
  seed = 42,
  className = 'animate-pulse',
  config,
}: {
  count?: number;
  seed?: number;
  /** CSS animation class applied to each star dot */
  className?: string;
  config?: StarFieldConfig;
}) => {
  const stars = useMemo(() => generateStarField(count, seed, config), [count, seed, config]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star, i) => (
        <div
          key={i}
          className={`absolute rounded-full bg-white ${className}`}
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
  );
});

CssStarfield.displayName = 'CssStarfield';
