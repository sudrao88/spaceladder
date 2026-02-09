import { memo, useMemo } from 'react';
import { Text, Edges } from '@react-three/drei';
import { getCachedBoardTiles, TILE_SIZE } from '../utils/boardUtils';
import * as THREE from 'three';

// Shared geometry & material instances — created once, reused across all 100 tiles
const sharedTileGeometry = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
const sharedTileMaterial = new THREE.MeshBasicMaterial({ color: '#1e293b' });
const TILE_ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0];
const TEXT_Y_OFFSET = 0.01;

interface TileProps {
    id: number;
    position: [number, number, number];
}

// Individual tile as a memoized component — prevents re-render when parent updates
const Tile = memo(({ id, position }: TileProps) => {
    return (
        <group position={position}>
            <mesh rotation={TILE_ROTATION} receiveShadow geometry={sharedTileGeometry} material={sharedTileMaterial}>
                <Edges color="#475569" linewidth={1} />
            </mesh>
            <Text
                position={[0, TEXT_Y_OFFSET, 0]}
                rotation={TILE_ROTATION}
                fontSize={0.4}
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
    const tiles = useMemo(() => {
        const rawTiles = getCachedBoardTiles();
        return rawTiles.map(tile => ({
            id: tile.id,
            position: [tile.x, 0, tile.z] as [number, number, number],
        }));
    }, []);

    return (
        <group>
            {tiles.map((tile) => (
                <Tile key={tile.id} id={tile.id} position={tile.position} />
            ))}
        </group>
    );
});

Board.displayName = 'Board';
