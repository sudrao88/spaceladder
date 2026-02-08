import { useEffect, useState } from 'react';
import { useSpring, animated } from '@react-spring/three';
import type { Player } from '../store/useGameStore';

// We need to know where each tile is to animate towards it.
// Re-calculating tile positions or importing a helper is best.
const BOARD_SIZE = 10;
const TILE_SIZE = 1.2;
const TILE_GAP = 0.1;

const getTilePosition = (tileNumber: number): [number, number, number] => {
  const i = tileNumber - 1;
  const row = Math.floor(i / BOARD_SIZE);
  const col = i % BOARD_SIZE;
  const xIndex = row % 2 === 0 ? col : BOARD_SIZE - 1 - col;
  const x = (xIndex - BOARD_SIZE / 2) * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2;
  const z = -(row - BOARD_SIZE / 2) * (TILE_SIZE + TILE_GAP) - TILE_SIZE / 2;
  return [x, 0.5, z]; // 0.5 height for rocket
};

interface RocketProps {
  player: Player;
  onMovementComplete: () => void;
}

export const Rocket = ({ player, onMovementComplete }: RocketProps) => {
  const targetPos = getTilePosition(player.position);
  // Keep track of previous position to animate from
  const [currentPos] = useState(targetPos);
  
  // Spring animation
  const { position } = useSpring({
    position: targetPos,
    from: { position: currentPos },
    config: { mass: 1, tension: 170, friction: 26 },
    onRest: () => {
        if (player.isMoving) {
            onMovementComplete();
        }
    }
  });

  useEffect(() => {
     // When player.position changes, we update currentPos to the *previous* target 
     // (which is where the spring was) so it flows smoothly? 
     // Actually useSpring handles "from" automatically if we update "to".
     // But we need to update our internal reference after animation?
     // Actually, just let useSpring handle the transition.
     
     // However, we want to make sure we don't trigger "onMovementComplete" 
     // immediately on mount or non-moving updates.
  }, [player.position]);

  const colorMap: Record<string, string> = {
    red: '#ff0055',
    blue: '#0055ff',
    green: '#00ff55',
    yellow: '#ffff00',
  };

  return (
    // @ts-ignore
    <animated.group position={position}>
      {/* Rocket Body */}
      <mesh castShadow>
        <coneGeometry args={[0.2, 0.6, 8]} />
        <meshStandardMaterial 
            color={colorMap[player.color]} 
            emissive={colorMap[player.color]}
            emissiveIntensity={2}
        />
      </mesh>
      {/* Thruster Glow */}
      <pointLight distance={1} intensity={2} color={colorMap[player.color]} position={[0, -0.2, 0]} />
    </animated.group>
  );
};
