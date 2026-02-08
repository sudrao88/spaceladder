import { useState, useMemo } from 'react';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import type { Player } from '../store/useGameStore';
import { getTilePosition, PLAYER_EMOJIS } from '../utils/boardUtils';

interface RocketProps {
  player: Player;
  onMovementComplete: () => void;
}

export const Rocket = ({ player, onMovementComplete }: RocketProps) => {
  const targetPos = getTilePosition(player.position);
  // Flatten height for 2D view. Lift slightly (0.1) to be above board.
  const rocketTarget: [number, number, number] = [targetPos[0], 0.1, targetPos[2]];
  
  const [currentPos] = useState(rocketTarget);
  
  const { position } = useSpring({
    position: rocketTarget,
    from: { position: currentPos },
    config: { mass: 1, tension: 170, friction: 26 },
    onRest: () => {
        if (player.isMoving) {
            onMovementComplete();
        }
    }
  });

  const emoji = PLAYER_EMOJIS[player.id % PLAYER_EMOJIS.length];

  // Generate Texture from Emoji
  const emojiTexture = useMemo(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
          ctx.clearRect(0, 0, 256, 256);
          // Use system emoji fonts
          ctx.font = '200px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          // Draw emoji centered
          ctx.fillText(emoji, 128, 145); 
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
  }, [emoji]);

  return (
    // @ts-expect-error react-spring
    <animated.group position={position}>
      {/* Emoji Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        {/* Size 1.0 fits well within 1.2 tile */}
        <planeGeometry args={[1.0, 1.0]} />
        <meshBasicMaterial 
            map={emojiTexture} 
            transparent={true} 
            side={THREE.DoubleSide}
        />
      </mesh>
    </animated.group>
  );
};
