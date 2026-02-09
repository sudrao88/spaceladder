import { useState, useMemo, useEffect, memo } from 'react';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import type { Player } from '../store/useGameStore';
import { getTilePosition, PLAYER_EMOJIS } from '../utils/boardUtils';

interface RocketProps {
  player: Player;
  onMovementComplete: () => void;
}

const ROCKET_ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0];
const SPRING_CONFIG = { mass: 1, tension: 170, friction: 26 };
const SCALE_SPRING_CONFIG = { mass: 1, tension: 300, friction: 20 };
const LIFTED_SCALE = 1.3;
const LANDED_SCALE = 1.0;

type Phase = 'idle' | 'lifting' | 'moving' | 'landing';

export const Rocket = memo(({ player, onMovementComplete }: RocketProps) => {
  const rocketTarget = useMemo<[number, number, number]>(() => {
    const pos = getTilePosition(player.position);
    return [pos[0], 0.1, pos[2]];
  }, [player.position]);

  const [phase, setPhase] = useState<Phase>('idle');
  const [initialPos] = useState(rocketTarget);
  const [preMovePos, setPreMovePos] = useState(rocketTarget);
  const [prevIsMoving, setPrevIsMoving] = useState(false);
  const [trackedPosition, setTrackedPosition] = useState(player.position);

  // --- Adjust state during render (React-recommended pattern) ---
  let startedLifting = false;

  // 1. Detect isMoving false→true transition → begin lift
  if (player.isMoving && !prevIsMoving) {
    setPrevIsMoving(true);
    if (phase === 'idle') {
      setPhase('lifting');
      startedLifting = true;
    }
  }
  if (!player.isMoving && prevIsMoving) {
    setPrevIsMoving(false);
  }

  // 2. Track store position changes while idle (teleport / reset / initial)
  if (player.position !== trackedPosition) {
    setTrackedPosition(player.position);
    if (phase === 'idle' && !startedLifting) {
      setPreMovePos(rocketTarget);
    }
  }

  // --- Derive spring targets from state ---
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
          // Same-tile bounce-back: skip move, go straight to landing
          if (preMovePos[0] === rocketTarget[0] && preMovePos[2] === rocketTarget[2]) {
            return 'landing';
          }
          return 'moving';
        }
        if (current === 'landing') {
          setPreMovePos(rocketTarget);
          onMovementComplete();
          return 'idle';
        }
        return current;
      });
    }
  });

  const { position } = useSpring({
    position: positionTarget,
    from: { position: initialPos },
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

  return (
    <animated.group position={position} scale={s}>
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
