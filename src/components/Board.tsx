import { memo, useMemo, useRef, useLayoutEffect } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { getBoardTiles, TILE_SIZE } from '../utils/boardUtils';

const BOARD_OFFSET_Y = 0;
const TILE_HALF = TILE_SIZE / 2;

const BRIGHT_COSMIC_COLORS = [
  new THREE.Color('#0066ff'), // Bright Electric Blue
  new THREE.Color('#7000ff'), // Electric Purple
  new THREE.Color('#00f2ff'), // Vivid Cyan
  new THREE.Color('#ff00e5'), // Hot Pink
];

export const Board = memo(() => {
  const tiles = useMemo(() => getBoardTiles(), []);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Set up instance matrices for the tiles
  useLayoutEffect(() => {
    if (meshRef.current) {
      const tempObject = new THREE.Object3D();
      tiles.forEach((tile, i) => {
        tempObject.position.set(tile.x, BOARD_OFFSET_Y, tile.z);
        tempObject.rotation.set(-Math.PI / 2, 0, 0);
        tempObject.updateMatrix();
        meshRef.current!.setMatrixAt(i, tempObject.matrix);
        meshRef.current!.setColorAt(i, BRIGHT_COSMIC_COLORS[i % BRIGHT_COSMIC_COLORS.length]);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor) {
        meshRef.current.instanceColor.needsUpdate = true;
      }
    }
  }, [tiles]);

  // Create merged geometry for borders (single draw call for all lines)
  const borderGeometry = useMemo(() => {
    const vertices: number[] = [];
    const y = BOARD_OFFSET_Y + 0.005;

    tiles.forEach(tile => {
      const left = tile.x - TILE_HALF;
      const right = tile.x + TILE_HALF;
      const top = tile.z - TILE_HALF; 
      const bottom = tile.z + TILE_HALF;

      // 4 line segments per tile
      // Top
      vertices.push(left, y, top, right, y, top);
      // Right
      vertices.push(right, y, top, right, y, bottom);
      // Bottom
      vertices.push(right, y, bottom, left, y, bottom);
      // Left
      vertices.push(left, y, bottom, left, y, top);
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geo;
  }, [tiles]);

  return (
    <group>
      {/* 1. Tiles (1 Draw Call) */}
      <instancedMesh ref={meshRef} args={[undefined, undefined, tiles.length]} receiveShadow>
        <planeGeometry args={[TILE_SIZE, TILE_SIZE]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.9} />
      </instancedMesh>

      {/* 2. Borders (1 Draw Call) */}
      <lineSegments geometry={borderGeometry}>
        <lineBasicMaterial color="#ffffff" linewidth={1} transparent opacity={0.3} />
      </lineSegments>

      {/* 3. Numbers (Still individual, but acceptable for text) */}
      {tiles.map((tile) => (
        <Text
          key={tile.id}
          position={[tile.x, BOARD_OFFSET_Y + 0.02, tile.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.25}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {tile.id}
        </Text>
      ))}
    </group>
  );
});

Board.displayName = 'Board';
