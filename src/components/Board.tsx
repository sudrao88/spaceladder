import { memo, useMemo, useRef, useLayoutEffect } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { getBoardTiles, TILE_SIZE } from '../utils/boardUtils';

const BOARD_OFFSET_Y = 0;
const TILE_HALF = TILE_SIZE / 2;
const BORDER_THICKNESS = 0.05;

const BRIGHT_COSMIC_COLORS = [
  new THREE.Color('#0066ff'), // Bright Electric Blue
  new THREE.Color('#7000ff'), // Electric Purple
  new THREE.Color('#00f2ff'), // Vivid Cyan
  new THREE.Color('#ff00e5'), // Hot Pink
];

export const Board = memo(() => {
  const tiles = useMemo(() => getBoardTiles(), []);
  const tileMeshRef = useRef<THREE.InstancedMesh>(null);
  const borderMeshRef = useRef<THREE.InstancedMesh>(null);

  // Set up instance matrices for the tiles and borders
  useLayoutEffect(() => {
    if (tileMeshRef.current && borderMeshRef.current) {
      const tempObject = new THREE.Object3D();
      
      tiles.forEach((tile, i) => {
        // 1. Tile Instance
        tempObject.position.set(tile.x, BOARD_OFFSET_Y, tile.z);
        tempObject.rotation.set(-Math.PI / 2, 0, 0);
        tempObject.scale.set(1, 1, 1);
        tempObject.updateMatrix();
        tileMeshRef.current!.setMatrixAt(i, tempObject.matrix);
        tileMeshRef.current!.setColorAt(i, BRIGHT_COSMIC_COLORS[i % BRIGHT_COSMIC_COLORS.length]);

        // 2. Border Instances (4 per tile)
        const y = BOARD_OFFSET_Y + 0.01;
        const bIdx = i * 4;

        // Top Border
        tempObject.position.set(tile.x, y, tile.z - TILE_HALF);
        tempObject.scale.set(TILE_SIZE + BORDER_THICKNESS, BORDER_THICKNESS, 1);
        tempObject.updateMatrix();
        borderMeshRef.current!.setMatrixAt(bIdx, tempObject.matrix);

        // Bottom Border
        tempObject.position.set(tile.x, y, tile.z + TILE_HALF);
        tempObject.scale.set(TILE_SIZE + BORDER_THICKNESS, BORDER_THICKNESS, 1);
        tempObject.updateMatrix();
        borderMeshRef.current!.setMatrixAt(bIdx + 1, tempObject.matrix);

        // Left Border
        tempObject.position.set(tile.x - TILE_HALF, y, tile.z);
        tempObject.scale.set(BORDER_THICKNESS, TILE_SIZE + BORDER_THICKNESS, 1);
        tempObject.updateMatrix();
        borderMeshRef.current!.setMatrixAt(bIdx + 2, tempObject.matrix);

        // Right Border
        tempObject.position.set(tile.x + TILE_HALF, y, tile.z);
        tempObject.scale.set(BORDER_THICKNESS, TILE_SIZE + BORDER_THICKNESS, 1);
        tempObject.updateMatrix();
        borderMeshRef.current!.setMatrixAt(bIdx + 3, tempObject.matrix);
      });

      tileMeshRef.current.instanceMatrix.needsUpdate = true;
      if (tileMeshRef.current.instanceColor) {
        tileMeshRef.current.instanceColor.needsUpdate = true;
      }
      borderMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [tiles]);

  return (
    <group>
      {/* 1. Tiles */}
      <instancedMesh ref={tileMeshRef} args={[undefined, undefined, tiles.length]} receiveShadow>
        <planeGeometry args={[TILE_SIZE, TILE_SIZE]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.9} />
      </instancedMesh>

      {/* 2. Thicker Borders (Using InstancedMesh for performance and consistent thickness) */}
      <instancedMesh ref={borderMeshRef} args={[undefined, undefined, tiles.length * 4]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </instancedMesh>

      {/* 3. Numbers */}
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
