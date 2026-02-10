import { useState, useMemo, useEffect, memo, useRef } from 'react';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { useGameStore, type Player } from '../store/useGameStore';
import { getTilePosition, PLAYER_EMOJIS } from '../utils/boardUtils';
import { activeRocketRef } from '../utils/sceneRefs';

interface RocketProps {
  player: Player;
  onMovementComplete: () => void;
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
  
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
      ctx.clearRect(0, 0, 256, 256);
      // Ensure font stack covers most OS
      ctx.font = '200px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, 128, 145);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  
  textureCache.set(emoji, tex);
  return tex;
}

export const Rocket = memo(({ player, onMovementComplete }: RocketProps) => {
  const groupRef = useRef<THREE.Group>(null!);

  const rocketTarget = useMemo<[number, number, number]>(() => {
    const pos = getTilePosition(player.position);
    return [pos[0], 0.1, pos[2]];
  }, [player.position]);

  const [phase, setPhase] = useState<Phase>('idle');
  const [preMovePos, setPreMovePos] = useState(rocketTarget);
  
  const prevPhase = useRef<Phase>('idle');

  // Sync active rocket ref for camera following
  useEffect(() => {
    if (player.isMoving && groupRef.current) {
      activeRocketRef.current = groupRef.current;
    } else if (activeRocketRef.current === groupRef.current && !player.isMoving) {
        activeRocketRef.current = null;
    }
  }, [player.isMoving]);

  useEffect(() => {
    const unsub = useGameStore.subscribe((state, prevState) => {
      const curr = state.players.find(p => p.id === player.id);
      const prev = prevState.players.find(p => p.id === player.id);
      if (!curr || !prev) return;

      if (curr.isMoving && !prev.isMoving) {
        setPhase(p => (p === 'idle' ? 'lifting' : p));
      }
      
      if (!curr.isMoving && prev.isMoving) {
         const pos = getTilePosition(curr.position);
         setPreMovePos([pos[0], 0.1, pos[2]]);
      }

      if (curr.position !== prev.position && !curr.isMoving) {
        const pos = getTilePosition(curr.position);
        setPreMovePos([pos[0], 0.1, pos[2]]);
      }
    });
    return unsub;
  }, [player.id]);

  useEffect(() => {
      if (prevPhase.current === 'landing' && phase === 'idle') {
          onMovementComplete();
      }
      prevPhase.current = phase;
  }, [phase, onMovementComplete]);

  const positionTarget = phase === 'lifting' ? preMovePos : rocketTarget;
  const scaleTarget = phase === 'lifting' || phase === 'moving' ? LIFTED_SCALE : LANDED_SCALE;

  const { s } = useSpring({
    s: scaleTarget,
    config: SCALE_SPRING_CONFIG,
    onRest: () => {
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
      setPhase((current) => (current === 'moving' ? 'landing' : current));
    }
  });

  const emoji = PLAYER_EMOJIS[player.id % PLAYER_EMOJIS.length];

  // Retrieve cached texture
  // We do NOT dispose these textures on unmount anymore because they are cached globally.
  // This is a deliberate choice for performance in this game.
  const emojiTexture = getEmojiTexture(emoji);

  const isVisible = player.position > 1 || phase !== 'idle';

  return (
    <animated.group ref={groupRef} position={position} scale={s} visible={isVisible}>
      <mesh rotation={ROCKET_ROTATION}>
        <planeGeometry args={[1.0, 1.0]} />
        <meshBasicMaterial
            map={emojiTexture}
            transparent={true}
            side={THREE.DoubleSide}
        />
      </mesh>
    </animated.group>
  );
});

Rocket.displayName = 'Rocket';
