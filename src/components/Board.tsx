import { useMemo } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

const BOARD_SIZE = 10;
const TILE_SIZE = 1.2;
const TILE_GAP = 0.1;

export const Board = () => {
  // Generate snake pattern positions
  const tiles = useMemo(() => {
    const tileData = [];
    for (let i = 0; i < 100; i++) {
      const row = Math.floor(i / BOARD_SIZE);
      const col = i % BOARD_SIZE;
      
      // Snake pattern: even rows go right, odd rows go left
      const xIndex = row % 2 === 0 ? col : BOARD_SIZE - 1 - col;
      // Position 1 is bottom-left (or however we orient it)
      // Let's center the board
      const x = (xIndex - BOARD_SIZE / 2) * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2;
      const z = -(row - BOARD_SIZE / 2) * (TILE_SIZE + TILE_GAP) - TILE_SIZE / 2;
      
      tileData.push({
        id: i + 1,
        position: [x, 0, z] as [number, number, number],
        color: new THREE.Color().setHSL(i / 100 * 0.8, 1, 0.5) // Rainbow gradient
      });
    }
    return tileData;
  }, []);

  return (
    <group>
      {tiles.map((tile) => (
        <group key={tile.id} position={tile.position}>
          {/* Tile Base */}
          <mesh receiveShadow>
            <boxGeometry args={[TILE_SIZE, 0.2, TILE_SIZE]} />
            <meshStandardMaterial 
              color={'#1a1a2e'} 
              emissive={tile.color}
              emissiveIntensity={0.5}
              roughness={0.2}
              metalness={0.8}
            />
          </mesh>
          
          <Text
            position={[0, 0.11, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.4}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {tile.id}
          </Text>
        </group>
      ))}
      
      {/* Ambient Grid Helper for "Void" feel */}
      <gridHelper args={[20, 20, 0xff00ff, 0x00ffff]} position={[0, -0.1, 0]} />
    </group>
  );
};
