/**
 * Shared starfield generator for CSS-based background star effects.
 * Uses a seeded LCG pseudo-random for deterministic, render-safe star positions.
 */

export interface StarData {
  width: number;
  height: number;
  top: number;
  left: number;
  opacity: number;
  animationDelay: number;
  animationDuration: number;
}

export interface StarFieldConfig {
  /** Min star size in px (default: 1) */
  minSize?: number;
  /** Max additional size in px (default: 2) */
  sizeRange?: number;
  /** Min opacity (default: 0.2) */
  minOpacity?: number;
  /** Opacity range (default: 0.5) */
  opacityRange?: number;
  /** Max animation delay in seconds (default: 4) */
  maxDelay?: number;
  /** Min animation duration in seconds (default: 2) */
  minDuration?: number;
  /** Duration range in seconds (default: 3) */
  durationRange?: number;
}

/**
 * Generates a deterministic array of star positions using a seeded LCG.
 * Safe to call during render (no Math.random).
 */
export function generateStarField(
  count: number,
  seed: number,
  config: StarFieldConfig = {},
): StarData[] {
  const {
    minSize = 1,
    sizeRange = 2,
    minOpacity = 0.2,
    opacityRange = 0.5,
    maxDelay = 4,
    minDuration = 2,
    durationRange = 3,
  } = config;

  let s = seed;
  const next = () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };

  return Array.from({ length: count }, () => ({
    width: minSize + next() * sizeRange,
    height: minSize + next() * sizeRange,
    top: next() * 100,
    left: next() * 100,
    opacity: minOpacity + next() * opacityRange,
    animationDelay: next() * maxDelay,
    animationDuration: minDuration + next() * durationRange,
  }));
}
