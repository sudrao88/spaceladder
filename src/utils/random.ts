/**
 * Cryptographically-strong replacement for Math.random().
 * Returns a float in [0, 1) using crypto.getRandomValues().
 */
export function secureRandom(): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  // Divide by 2^32 to get a value in [0, 1)
  return arr[0] / 4294967296;
}

/** Inclusive random integer in [min, max] using crypto RNG */
export function secureRandomInt(min: number, max: number): number {
  return Math.floor(secureRandom() * (max - min + 1)) + min;
}
