import { memo, useMemo, useEffect, useRef } from 'react';
import { getCachedBoardTiles, TILE_SIZE } from '../utils/boardUtils';
import * as THREE from 'three';

const TILE_ROTATION = -Math.PI / 2;

// Create a texture atlas with all 100 tile numbers and edges
const createTileAtlas = (): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    const tilesPerRow = 10;
    const tileResolution = 128; // pixels per tile in atlas
    canvas.width = tilesPerRow * tileResolution;
    canvas.height = tilesPerRow * tileResolution;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');

    // Fill with background color
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw each tile
    for (let i = 0; i < 100; i++) {
        const tileId = i + 1;
        const atlasCol = i % tilesPerRow;
        const atlasRow = Math.floor(i / tilesPerRow);
        const x = atlasCol * tileResolution;
        const y = atlasRow * tileResolution;

        // Draw tile background
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x, y, tileResolution, tileResolution);

        // Draw edges
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, tileResolution - 2, tileResolution - 2);

        // Draw tile number
        ctx.fillStyle = '#94a3b8';
        ctx.font = `bold ${tileResolution * 0.3}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            tileId.toString(),
            x + tileResolution / 2,
            y + tileResolution / 2
        );
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
};

// Create instanced mesh with custom UVs for each tile
export const Board = memo(() => {
    const meshRef = useRef<THREE.InstancedMesh>(null);

    const { texture, instancedData } = useMemo(() => {
        const tiles = getCachedBoardTiles();
        const texture = createTileAtlas();

        // Prepare instance matrices and UV offsets
        const instancedData = tiles.map(tile => {
            const matrix = new THREE.Matrix4();
            matrix.makeRotationX(TILE_ROTATION);
            matrix.setPosition(tile.x, 0, tile.z);

            // Calculate UV offset for this tile in the atlas (10x10 grid)
            const atlasCol = (tile.id - 1) % 10;
            const atlasRow = Math.floor((tile.id - 1) / 10);
            const uvOffsetX = atlasCol / 10;
            const uvOffsetY = atlasRow / 10;

            return { matrix, uvOffset: new THREE.Vector2(uvOffsetX, uvOffsetY) };
        });

        return { texture, instancedData };
    }, []);

    // Set up instanced mesh on mount
    useEffect(() => {
        if (!meshRef.current) return;

        const mesh = meshRef.current;

        // Set instance matrices
        instancedData.forEach((data, i) => {
            mesh.setMatrixAt(i, data.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;

        // Set up instanced attributes for UV offsets
        const uvOffsets = new Float32Array(100 * 2);
        instancedData.forEach((data, i) => {
            uvOffsets[i * 2] = data.uvOffset.x;
            uvOffsets[i * 2 + 1] = data.uvOffset.y;
        });

        const uvOffsetAttribute = new THREE.InstancedBufferAttribute(uvOffsets, 2);
        mesh.geometry.setAttribute('uvOffset', uvOffsetAttribute);
    }, [instancedData]);

    // Custom shader material that applies UV offset per instance
    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                map: { value: texture },
            },
            vertexShader: `
                attribute vec2 uvOffset;
                varying vec2 vUv;

                void main() {
                    // Map UV to the correct tile in the 10x10 atlas
                    vUv = uvOffset + uv * 0.1; // 0.1 = 1/10 (10 tiles per row/column)
                    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D map;
                varying vec2 vUv;

                void main() {
                    gl_FragColor = texture2D(map, vUv);
                }
            `,
        });
    }, [texture]);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, 100]} material={material}>
            <planeGeometry args={[TILE_SIZE, TILE_SIZE]} />
        </instancedMesh>
    );
});

Board.displayName = 'Board';
