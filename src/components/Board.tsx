import { useMemo } from 'react';
import { Text, Edges } from '@react-three/drei';
import { getCachedBoardTiles, TILE_SIZE } from '../utils/boardUtils';

export const Board = () => {
  const tiles = useMemo(() => {
    const rawTiles = getCachedBoardTiles();
    return rawTiles.map(tile => ({
        ...tile,
        position: [tile.x, 0, tile.z] as [number, number, number],
    }));
  }, []);

  return (
    <group>
      {tiles.map((tile) => (
        <group key={tile.id} position={tile.position}>
          {/* Tile Base - Flat 2D */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[TILE_SIZE, TILE_SIZE]} />
            <meshBasicMaterial color="#1e293b" /> 
            <Edges color="#475569" linewidth={1} />
          </mesh>
          
          <Text
            position={[0, 0.01, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.4}
            color="#94a3b8"
            anchorX="center"
            anchorY="middle"
          >
            {tile.id}
          </Text>
        </group>
      ))}
    </group>
  );
};
