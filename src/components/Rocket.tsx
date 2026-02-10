import { useState, useMemo, useEffect, memo, useRef } from 'react';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { useGameStore, type Player } from '../store/useGameStore';
import { getTilePosition, PLAYER_EMOJIS } from '../utils/boardUtils';
import { activeRocketRef } from '../App';

interface RocketProps {
  player: Player;
  onMovementComplete: () => void;
}

const ROCKET_ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0];
// Slower spring for movement
const SPRING_CONFIG = { mass: 1, tension: 120, friction: 30 }; // Reduced tension, increased friction
const SCALE_SPRING_CONFIG = { mass: 1, tension: 200, friction: 25 };
const LIFTED_SCALE = 1.5; 
const LANDED_SCALE = 1.0;

type Phase = 'idle' | 'lifting' | 'moving' | 'landing';

export const Rocket = memo(({ player, onMovementComplete }: RocketProps) => {
  const groupRef = useRef<THREE.Group>(null!);

  const rocketTarget = useMemo<[number, number, number]>(() => {
    const pos = getTilePosition(player.position);
    return [pos[0], 0.1, pos[2]];
  }, [player.position]);

  const [phase, setPhase] = useState<Phase>('idle');
  const [preMovePos, setPreMovePos] = useState(rocketTarget);
  
  // Ref to track previous phase for transition logic
  const prevPhase = useRef<Phase>('idle');

  // Sync active rocket ref for camera following
  useEffect(() => {
    if (player.isMoving && groupRef.current) {
      activeRocketRef.current = groupRef.current;
    } else if (activeRocketRef.current === groupRef.current && !player.isMoving) {
        // Only clear if we were the active one
        // Wait a tick to ensure camera logic doesn't snap
        activeRocketRef.current = null;
    }
  }, [player.isMoving]);


  // Subscribe to store for transition detection (setState in subscription callback is lint-safe)
  useEffect(() => {
    const unsub = useGameStore.subscribe((state, prevState) => {
      const curr = state.players.find(p => p.id === player.id);
      const prev = prevState.players.find(p => p.id === player.id);
      if (!curr || !prev) return;

      // isMoving false→true → begin lift
      if (curr.isMoving && !prev.isMoving) {
        setPhase(p => (p === 'idle' ? 'lifting' : p));
      }
      
      // isMoving true→false → end of move
      // Sync preMovePos to new position so next lift starts from here
      if (!curr.isMoving && prev.isMoving) {
         const pos = getTilePosition(curr.position);
         setPreMovePos([pos[0], 0.1, pos[2]]);
      }

      // Position changed while grounded (teleport / reset) → sync preMovePos
      if (curr.position !== prev.position && !curr.isMoving) {
        const pos = getTilePosition(curr.position);
        setPreMovePos([pos[0], 0.1, pos[2]]);
      }
    });
    return unsub;
  }, [player.id]);

  // Handle phase completion side effects
  useEffect(() => {
      // Transition: landing -> idle
      if (prevPhase.current === 'landing' && phase === 'idle') {
          onMovementComplete();
      }
      
      prevPhase.current = phase;
  }, [phase, onMovementComplete]);

  // --- Derive spring targets from phase ---
  // During lifting: hold at pre-move position; otherwise follow the store position
  const positionTarget = phase === 'lifting' ? preMovePos : rocketTarget;
  // Enlarged while airborne (lifting + moving), normal while grounded (landing + idle)
  const scaleTarget = phase === 'lifting' || phase === 'moving' ? LIFTED_SCALE : LANDED_SCALE;

  const { s } = useSpring({
    s: scaleTarget,
    config: SCALE_SPRING_CONFIG,
    onRest: () => {
      setPhase((current) => {
        if (current === 'lifting') {
          // If we are just lifting but the target is the same as start (blocked move), 
          // we still want to transition to 'moving' then 'landing' so the turn cycle completes.
          // The visual effect will be a hop in place.
          return 'moving';
        }
        if (current === 'landing') {
          // Side effects handled in useEffect now
          return 'idle';
        }
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

  // Generate texture from emoji; dispose on unmount or emoji change
  const emojiTexture = useMemo(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
          ctx.clearRect(0, 0, 256, 256);
          ctx.font = '200px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(emoji, 128, 145);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
  }, [emoji]);

  // Dispose texture on unmount to prevent GPU memory leaks
  useEffect(() => {
      return () => {
          emojiTexture.dispose();
      };
  }, [emojiTexture]);

  // Handle visibility: token is invisible if at tile 1 and not currently moving/lifting
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
