import { useState, useMemo, useEffect, memo, useRef, useLayoutEffect } from 'react';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { useGameStore, type Player } from '../store/useGameStore';
import { getTilePosition, PLAYER_EMOJIS } from '../utils/boardUtils';
import { activeRocketRef } from '../utils/sceneRefs';

interface RocketProps {
  player: Player;
  onMovementComplete: (playerId: number) => void;
}

const ROCKET_ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0];
const SPRING_CONFIG = { mass: 1, tension: 120, friction: 30 };
const SCALE_SPRING_CONFIG = { mass: 1, tension: 200, friction: 25 };
const LIFTED_SCALE = 1.5; 
const LANDED_SCALE = 1.0;

type Phase = 'idle' | 'lifting' | 'moving' | 'landing';

// --- Global Texture Cache ---
const textureCache = new Map<string, THREE.CanvasTexture>();

function getEmojiTexture(emoji: string): THREE.CanvasTexture {
  if (textureCache.has(emoji)) {
      return textureCache.get(emoji)!;
  }
  
  // Increased texture resolution from 256 to 512 for sharper zoomed-in view
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
      ctx.clearRect(0, 0, 512, 512);
      // Ensure font stack covers most OS - Scaled font size accordingly
      ctx.font = '400px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, 256, 290); // Adjusted center y for better vertical alignment
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  // Use Linear filtering for smoother scaling, or Nearest if pixel art style is preferred (using Linear for emojis)
  tex.minFilter = THREE.LinearMipMapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 16; // Max anisotropy for sharpness at angles
  
  textureCache.set(emoji, tex);
  return tex;
}

export const Rocket = memo(({ player, onMovementComplete }: RocketProps) => {
  const groupRef = useRef<THREE.Group>(null!);

  const rocketTarget = useMemo<[number, number, number]>(() => {
    // Ensure player position is within bounds
    const pos = getTilePosition(Math.max(1, player.position));
    // Keep Y at 0.1 to avoid z-fighting with board
    return [pos[0], 0.1, pos[2]];
  }, [player.position]);

  const [phase, setPhase] = useState<Phase>('idle');
  const [preMovePos, setPreMovePos] = useState(rocketTarget);
  
  const prevPhase = useRef<Phase>('idle');

  // Sync active rocket ref for camera following
  // useLayoutEffect ensures the ref is set BEFORE the browser paints and BEFORE the next frame loop reads it.
  useLayoutEffect(() => {
    if (player.isMoving && groupRef.current) {
      activeRocketRef.current = groupRef.current;
    } else if (activeRocketRef.current === groupRef.current && !player.isMoving) {
        // Only clear if WE were the active one
        activeRocketRef.current = null;
    }
    
    // Cleanup on unmount or when player changes
    return () => {
       if (activeRocketRef.current === groupRef.current) {
         activeRocketRef.current = null;
       }
    };
  }, [player.isMoving, player.id]); // Added player.id for safety

  useEffect(() => {
    // Only subscribe to relevant changes to avoid unnecessary effect runs
    const unsub = useGameStore.subscribe((state, prevState) => {
      const curr = state.players.find(p => p.id === player.id);
      const prev = prevState.players.find(p => p.id === player.id);
      
      if (!curr || !prev) return;

      // Detect start of movement
      if (curr.isMoving && !prev.isMoving) {
        setPhase(p => (p === 'idle' ? 'lifting' : p));
      }
      
      // Detect end of movement (if phase didn't catch it naturally)
      if (!curr.isMoving && prev.isMoving) {
         // Force update position if simulation ended abruptly
         const pos = getTilePosition(curr.position);
         setPreMovePos([pos[0], 0.1, pos[2]]);
      }

      // Detect instant teleports (e.g. wormholes) while not "moving" in animation sense
      if (curr.position !== prev.position && !curr.isMoving) {
        const pos = getTilePosition(curr.position);
        setPreMovePos([pos[0], 0.1, pos[2]]);
      }
    });
    return unsub;
  }, [player.id]);

  // Phase transition logic
  useEffect(() => {
      if (prevPhase.current === 'landing' && phase === 'idle') {
          onMovementComplete(player.id);
      }
      prevPhase.current = phase;
  }, [phase, onMovementComplete, player.id]);

  // Determine current target based on phase
  // If lifting, stay at start position but go up (handled by scale/y anim in spring)
  // If moving, target is the new destination
  // If idle/landing, target is final destination
  const positionTarget = phase === 'lifting' ? preMovePos : rocketTarget;
  
  // Scale animation: pop up when moving
  const scaleTarget = phase === 'lifting' || phase === 'moving' ? LIFTED_SCALE : LANDED_SCALE;

  const { s } = useSpring({
    s: scaleTarget,
    config: SCALE_SPRING_CONFIG,
    onRest: () => {
      // Phase state machine transitions
      setPhase((current) => {
        if (current === 'lifting') return 'moving';
        if (current === 'landing') return 'idle';
        return current;
      });
    }
  });

  const { position } = useSpring({
    position: positionTarget,
    config: SPRING_CONFIG,
    onRest: () => {
       // Only land if we were moving
      setPhase((current) => (current === 'moving' ? 'landing' : current));
    }
  });

  const emoji = PLAYER_EMOJIS[player.id % PLAYER_EMOJIS.length];
  // Memoize texture generation to avoid re-creating on every render
  const emojiTexture = useMemo(() => getEmojiTexture(emoji), [emoji]);
  
  // Only render if on board (position > 1) or if animating. Position 1 is "Start", visually hidden until they roll.
  const isVisible = player.position > 1 || phase !== 'idle';

  return (
    // animated.group handles interpolation of position and scale
    <animated.group ref={groupRef} position={position} scale={s} visible={isVisible}>
      <mesh rotation={ROCKET_ROTATION}>
        <planeGeometry args={[1.0, 1.0]} />
        <meshBasicMaterial
            map={emojiTexture}
            transparent={true}
            side={THREE.DoubleSide}
            // Ensure alpha testing/premultiplied alpha handles edges cleanly
            alphaTest={0.5} 
        />
      </mesh>
    </animated.group>
  );
});

Rocket.displayName = 'Rocket';
