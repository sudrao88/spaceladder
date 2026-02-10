import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Increased count to maintain density over a larger area
const STAR_COUNT = 3000; 
// Wider spread to cover the camera view when zoomed out
const SPREAD = 200; 
const DEPTH = 100;

const StarfieldShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#ffffff') },
    uSize: { value: 6.0 }, // Reduced size as requested
  },
  vertexShader: `
    uniform float uTime;
    uniform float uSize;
    attribute float aSpeed;
    attribute float aScale;
    attribute vec3 aColor;
    varying vec3 vColor;

    void main() {
      vColor = aColor;
      vec3 pos = position;
      
      // Move Z based on time and speed
      float zRange = 100.0; // Matches DEPTH
      float zOffset = uTime * aSpeed;
      
      // Infinite scroll logic
      pos.z = mod(pos.z - zOffset + zRange * 0.5, zRange) - zRange * 0.5;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      
      // Distance attenuation
      gl_PointSize = uSize * aScale * (20.0 / -mvPosition.z);
      
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying vec3 vColor;

    void main() {
      vec2 center = gl_PointCoord - vec2(0.5);
      float dist = length(center);
      if (dist > 0.5) discard;

      // Soft circular particle
      float alpha = 1.0 - smoothstep(0.3, 0.5, dist);

      // Restored opacity
      gl_FragColor = vec4(vColor, alpha); 
    }
  `
};

export const Starfield = memo(() => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, colors, speeds, scales } = useMemo(() => {
    const pos = new Float32Array(STAR_COUNT * 3);
    const col = new Float32Array(STAR_COUNT * 3);
    const spd = new Float32Array(STAR_COUNT);
    const scl = new Float32Array(STAR_COUNT);

    const tempColor = new THREE.Color();

    for (let i = 0; i < STAR_COUNT; i++) {
        // Position - Spread widely
        pos[i * 3] = (Math.random() - 0.5) * SPREAD;     // X
        // Y: Positioned relative to board, deeper for parallax
        pos[i * 3 + 1] = -5.0 - Math.random() * 15.0; 
        pos[i * 3 + 2] = (Math.random() - 0.5) * DEPTH;  // Z

        // Color
        const tint = Math.random();
        const brightness = 0.5 + Math.random() * 0.5; // Restored brightness
        
        if (tint < 0.15) tempColor.setHSL(0.5, 1, brightness); // Cyan
        else if (tint < 0.25) tempColor.setHSL(0.8, 0.8, brightness); // Purple
        else tempColor.setHSL(0.6, 0, brightness); // White

        col[i * 3] = tempColor.r;
        col[i * 3 + 1] = tempColor.g;
        col[i * 3 + 2] = tempColor.b;

        // Speed & Scale
        spd[i] = 1.0 + Math.random() * 2.0; // Restored speed range
        scl[i] = 0.5 + Math.random() * 1.0; 
    }

    return { positions: pos, colors: col, speeds: spd, scales: scl };
  }, []);

  useFrame(({ clock }) => {
    if (shaderRef.current) {
      // Reduced speed factor to 0.05
      shaderRef.current.uniforms.uTime.value = clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={STAR_COUNT}
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-aColor"
          count={STAR_COUNT}
          args={[colors, 3]}
        />
        <bufferAttribute
          attach="attributes-aSpeed"
          count={STAR_COUNT}
          args={[speeds, 1]}
        />
        <bufferAttribute
          attach="attributes-aScale"
          count={STAR_COUNT}
          args={[scales, 1]}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderRef}
        args={[StarfieldShaderMaterial]}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
});

Starfield.displayName = 'Starfield';
