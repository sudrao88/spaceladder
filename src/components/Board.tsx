import { memo, useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { getBoardTiles, TILE_SIZE } from '../utils/boardUtils';

const BOARD_OFFSET_Y = 0;

// Shared geometries to reduce draw calls and memory usage
const tileGeometry = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
const edgesGeometry = new THREE.EdgesGeometry(tileGeometry);

// Shared materials
const tileMaterial = new THREE.MeshStandardMaterial({ color: '#1e293b' }); // Uniform dark grey
const borderMaterial = new THREE.LineBasicMaterial({ color: '#64748b', linewidth: 1 });

interface TileProps {
  id: number;
  x: number;
  z: number;
}

const Tile = memo(({ id, x, z }: TileProps) => {
  return (
    <group position={[x, BOARD_OFFSET_Y, z]}>
      {/* Tile Base */}
      <mesh 
        geometry={tileGeometry} 
        material={tileMaterial} 
        rotation={[-Math.PI / 2, 0, 0]} 
        receiveShadow 
      />
      
      {/* Border */}
      <lineSegments 
        geometry={edgesGeometry} 
        material={borderMaterial} 
        position={[0, 0.005, 0]} 
        rotation={[-Math.PI / 2, 0, 0]} 
      />

      {/* Tile Number - Text geometry is unique per number so we keep it inside */}
      <Text
        position={[0, 0.02, 0]} // Center
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.25}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
      >
        {id}
      </Text>
    </group>
  );
});

Tile.displayName = 'Tile';

export const Board = memo(() => {
  const tiles = useMemo(() => getBoardTiles(), []);

  return (
    <group>
      {tiles.map((tile) => (
        <Tile
          key={tile.id}
          id={tile.id}
          x={tile.x}
          z={tile.z}
        />
      ))}
    </group>
  );
});

Board.displayName = 'Board';
