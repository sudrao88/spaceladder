import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const STAR_COUNT = 300;
const SPREAD = 20; // stars span a 40x40 area centered on origin
const DRIFT_SPEED = 0.1; // units per second
const STAR_Y = -0.5; // below the board plane

// Build star geometry once at module level to avoid Math.random() inside render
function createStarGeometry(): THREE.BufferGeometry {
  const positions = new Float32Array(STAR_COUNT * 3);
  const colors = new Float32Array(STAR_COUNT * 3);

  for (let i = 0; i < STAR_COUNT; i++) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * SPREAD * 2;
    positions[i3 + 1] = STAR_Y - Math.random() * 0.3;
    positions[i3 + 2] = (Math.random() - 0.5) * SPREAD * 2;

    const brightness = 0.7 + Math.random() * 0.3;
    const tint = Math.random();
    if (tint < 0.15) {
      // cyan tint
      colors[i3] = brightness * 0.7;
      colors[i3 + 1] = brightness;
      colors[i3 + 2] = brightness;
    } else if (tint < 0.25) {
      // purple tint
      colors[i3] = brightness * 0.85;
      colors[i3 + 1] = brightness * 0.7;
      colors[i3 + 2] = brightness;
    } else {
      colors[i3] = brightness;
      colors[i3 + 1] = brightness;
      colors[i3 + 2] = brightness;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

/**
 * A lightweight drifting starfield rendered as a single Points object.
 * Stars slowly scroll in the –Z direction and wrap around, giving
 * the impression that the board is floating through space.
 */
export const Starfield = memo(() => {
  const pointsRef = useRef<THREE.Points>(null);
  // Per-instance geometry so multiple Starfields don't share mutable buffers.
  // createStarGeometry is defined at module scope so the linter doesn't flag
  // its internal Math.random() calls as impure render-time code.
  const geometry = useMemo(() => createStarGeometry(), []);

  useFrame((_state, delta) => {
    if (!pointsRef.current) return;

    const posAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;

    const drift = DRIFT_SPEED * delta;

    for (let i = 0; i < STAR_COUNT; i++) {
      const iz = i * 3 + 2;
      positions[iz] -= drift;

      // Wrap around when a star drifts out of range
      if (positions[iz] < -SPREAD) {
        positions[iz] += SPREAD * 2;
        // Randomize x on wrap so the pattern doesn't repeat obviously
        positions[i * 3] = (Math.random() - 0.5) * SPREAD * 2;
      }
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        vertexColors
        size={1.18}
        sizeAttenuation={false}
        transparent
        opacity={1.0}
        depthWrite={false}
      />
    </points>
  );
});

Starfield.displayName = 'Starfield';
