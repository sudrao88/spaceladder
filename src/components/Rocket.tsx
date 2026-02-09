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

export const Rocket = memo(({ player, onMovementComplete }: RocketProps) => {
  const targetPos = getTilePosition(player.position);
  // Lift slightly (0.1) to be above board
  const rocketTarget: [number, number, number] = [targetPos[0], 0.1, targetPos[2]];

  const [currentPos] = useState(rocketTarget);

  const { position } = useSpring({
    position: rocketTarget,
    from: { position: currentPos },
    config: SPRING_CONFIG,
    onRest: () => {
        if (player.isMoving) {
            onMovementComplete();
        }
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
    <animated.group position={position}>
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
