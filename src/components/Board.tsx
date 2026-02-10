import { memo, useMemo, useEffect, useRef } from 'react';
import { getCachedBoardTiles, TILE_SIZE } from '../utils/boardUtils';
import * as THREE from 'three';

// Board configuration constants
const TILES_PER_ROW = 10;
const TILE_COUNT = TILES_PER_ROW * TILES_PER_ROW;
const ATLAS_RESOLUTION_PER_TILE = 128;
const ATLAS_UV_SCALE = 1 / TILES_PER_ROW; // 0.1 for 10x10 grid

// Visual styling constants
const TILE_BG_COLOR = '#1e293b';
const TILE_BORDER_COLOR = '#475569';
const TILE_TEXT_COLOR = '#94a3b8';
const TILE_BORDER_WIDTH = 2;
const TILE_TEXT_SIZE_RATIO = 0.3;

const TILE_ROTATION = -Math.PI / 2;

// Create geometry once and reuse across all renders
const tileGeometry = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);

// Create a texture atlas with all 100 tile numbers and edges
const createTileAtlas = (): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = TILES_PER_ROW * ATLAS_RESOLUTION_PER_TILE;
    canvas.height = TILES_PER_ROW * ATLAS_RESOLUTION_PER_TILE;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');

    // Fill entire atlas with background color once
    ctx.fillStyle = TILE_BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw each tile
    for (let i = 0; i < TILE_COUNT; i++) {
        const tileId = i + 1;
        const atlasCol = i % TILES_PER_ROW;
        const atlasRow = Math.floor(i / TILES_PER_ROW);
        const x = atlasCol * ATLAS_RESOLUTION_PER_TILE;
        const y = atlasRow * ATLAS_RESOLUTION_PER_TILE;

        // Draw edges
        ctx.strokeStyle = TILE_BORDER_COLOR;
        ctx.lineWidth = TILE_BORDER_WIDTH;
        ctx.strokeRect(x + 1, y + 1, ATLAS_RESOLUTION_PER_TILE - 2, ATLAS_RESOLUTION_PER_TILE - 2);

        // Draw tile number
        ctx.fillStyle = TILE_TEXT_COLOR;
        ctx.font = `bold ${ATLAS_RESOLUTION_PER_TILE * TILE_TEXT_SIZE_RATIO}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            tileId.toString(),
            x + ATLAS_RESOLUTION_PER_TILE / 2,
            y + ATLAS_RESOLUTION_PER_TILE / 2
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

            // Calculate UV offset for this tile in the atlas
            const atlasCol = (tile.id - 1) % TILES_PER_ROW;
            const atlasRow = Math.floor((tile.id - 1) / TILES_PER_ROW);
            const uvOffsetX = atlasCol * ATLAS_UV_SCALE;
            const uvOffsetY = atlasRow * ATLAS_UV_SCALE;

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
        const uvOffsets = new Float32Array(instancedData.length * 2);
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
                atlasUvScale: { value: ATLAS_UV_SCALE },
            },
            vertexShader: `
                uniform float atlasUvScale;
                attribute vec2 uvOffset;
                varying vec2 vUv;

                void main() {
                    // Map UV to the correct tile in the atlas
                    vUv = uvOffset + uv * atlasUvScale;
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
        <instancedMesh ref={meshRef} args={[tileGeometry, material, TILE_COUNT]} />
    );
});

Board.displayName = 'Board';
