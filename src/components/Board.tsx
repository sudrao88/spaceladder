import { memo, useMemo, useRef, useLayoutEffect } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { getBoardTiles, TILE_SIZE, TILE_GAP, BOARD_WIDTH, BOARD_HEIGHT, type TileData } from '../utils/boardUtils';

const BOARD_OFFSET_Y = 0;
const TILE_HALF = TILE_SIZE / 2;
const BORDER_THICKNESS = 0.03;
const FRAME_THICKNESS = 0.08;

// Tile colors live on an HSL hue gradient that runs from the player's start row
// (icy cyan-blue) to the finish row (magenta), matching the game's title gradient.
// Adjacent tiles checkerboard via a visible-but-not-jarring lightness step.
// Milestone tiles (1 and every 10th) get a brighter lightness so they read as
// checkpoints — and because the snake layout puts them at row-ends, they form
// a zigzag "ladder of progress" up the left and right edges of the board.
const HUE_START = 195;
const HUE_END = 320;
const TILE_SATURATION = 0.55;
const TILE_L_LIGHT = 0.30;
const TILE_L_DARK = 0.22;
const TILE_L_MILESTONE = 0.40;

const isMilestoneTile = (id: number) => id === 1 || id % 10 === 0;

const getTileColor = (tile: TileData): THREE.Color => {
  // tile.row=9 is the bottom (start), tile.row=0 is the top (finish).
  const climbProgress = (BOARD_HEIGHT - 1 - tile.row) / (BOARD_HEIGHT - 1);
  const hue = (HUE_START + climbProgress * (HUE_END - HUE_START)) / 360;
  const isLight = (tile.row + tile.col) % 2 === 0;
  const lightness = isMilestoneTile(tile.id)
    ? TILE_L_MILESTONE
    : isLight ? TILE_L_LIGHT : TILE_L_DARK;
  return new THREE.Color().setHSL(hue, TILE_SATURATION, lightness);
};

const TILE_OPACITY = 1;
const BORDER_COLOR = '#06b6d4';
const BORDER_OPACITY = 0.55;
const FRAME_OPACITY = 0.9;
const TEXT_COLOR = '#dbe4f0';
const MILESTONE_TEXT_COLOR = '#22e3ff';
const NUMBER_FONT_SIZE = 0.18;
const MILESTONE_FONT_SIZE = 0.22;
const NUMBER_MARGIN = 0.08;

const GRID_HALF_EXTENT = ((BOARD_WIDTH - 1) * (TILE_SIZE + TILE_GAP)) / 2 + TILE_HALF;
const FRAME_SPAN = GRID_HALF_EXTENT * 2 + FRAME_THICKNESS;
const FRAME_INSET = GRID_HALF_EXTENT + FRAME_THICKNESS / 2;

export const Board = memo(() => {
  const tiles = useMemo(() => getBoardTiles(), []);
  const tileMeshRef = useRef<THREE.InstancedMesh>(null);
  const borderMeshRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (tileMeshRef.current && borderMeshRef.current) {
      const tempObject = new THREE.Object3D();

      tiles.forEach((tile, i) => {
        // 1. Tile instance + checkerboard color keyed on (row + col)
        tempObject.position.set(tile.x, BOARD_OFFSET_Y, tile.z);
        tempObject.rotation.set(-Math.PI / 2, 0, 0);
        tempObject.scale.set(1, 1, 1);
        tempObject.updateMatrix();
        tileMeshRef.current!.setMatrixAt(i, tempObject.matrix);
        tileMeshRef.current!.setColorAt(i, getTileColor(tile));

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
        <meshStandardMaterial color="#ffffff" opacity={TILE_OPACITY} />
      </instancedMesh>

      {/* 2. Tile borders — thin neon cyan */}
      <instancedMesh ref={borderMeshRef} args={[undefined, undefined, tiles.length * 4]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={BORDER_COLOR} transparent opacity={BORDER_OPACITY} toneMapped={false} />
      </instancedMesh>

      {/* 3. Outer board frame — slightly bolder cyan */}
      <mesh position={[0, BOARD_OFFSET_Y + 0.011, -FRAME_INSET]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[FRAME_SPAN, FRAME_THICKNESS]} />
        <meshBasicMaterial color={BORDER_COLOR} transparent opacity={FRAME_OPACITY} toneMapped={false} />
      </mesh>
      <mesh position={[0, BOARD_OFFSET_Y + 0.011, FRAME_INSET]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[FRAME_SPAN, FRAME_THICKNESS]} />
        <meshBasicMaterial color={BORDER_COLOR} transparent opacity={FRAME_OPACITY} toneMapped={false} />
      </mesh>
      <mesh position={[-FRAME_INSET, BOARD_OFFSET_Y + 0.011, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[FRAME_THICKNESS, FRAME_SPAN]} />
        <meshBasicMaterial color={BORDER_COLOR} transparent opacity={FRAME_OPACITY} toneMapped={false} />
      </mesh>
      <mesh position={[FRAME_INSET, BOARD_OFFSET_Y + 0.011, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[FRAME_THICKNESS, FRAME_SPAN]} />
        <meshBasicMaterial color={BORDER_COLOR} transparent opacity={FRAME_OPACITY} toneMapped={false} />
      </mesh>

      {/* 4. Tile numbers — top-left corner. Milestones (1, 10, 20, …) pop in cyan. */}
      {tiles.map((tile) => {
        const milestone = isMilestoneTile(tile.id);
        return (
          <Text
            key={tile.id}
            position={[tile.x - TILE_HALF + NUMBER_MARGIN, BOARD_OFFSET_Y + 0.02, tile.z - TILE_HALF + NUMBER_MARGIN]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={milestone ? MILESTONE_FONT_SIZE : NUMBER_FONT_SIZE}
            color={milestone ? MILESTONE_TEXT_COLOR : TEXT_COLOR}
            fillOpacity={milestone ? 0.95 : 0.5}
            anchorX="left"
            anchorY="top"
          >
            {tile.id}
          </Text>
        );
      })}
    </group>
  );
});

Board.displayName = 'Board';
