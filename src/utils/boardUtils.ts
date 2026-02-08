export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 10;
export const TILE_SIZE = 1.2;
export const TILE_GAP = 0.1;

export const PLAYER_EMOJIS = ['🚀', '🛰️', '👽', '🛸'];

export interface TileData {
    id: number;
    col: number;
    row: number;
    x: number;
    z: number;
}

export const getBoardTiles = (): TileData[] => {
    const tiles: TileData[] = [];

    for (let i = 0; i < 100; i++) {
        const row = (BOARD_HEIGHT - 1) - Math.floor(i / BOARD_WIDTH);
        let col = i % BOARD_WIDTH;

        // Snake pattern: even rows are R->L, odd rows are L->R
        if (row % 2 === 0) {
            col = BOARD_WIDTH - 1 - col;
        }

        const x = (col - (BOARD_WIDTH - 1) / 2) * (TILE_SIZE + TILE_GAP);
        const z = (row - (BOARD_HEIGHT - 1) / 2) * (TILE_SIZE + TILE_GAP);

        tiles.push({ id: i + 1, col, row, x, z });
    }
    return tiles;
};

// Cache tiles since they are static
let cachedTiles: TileData[] | null = null;
// O(1) position lookup map: tileId -> [x, y, z]
let tilePositionMap: Map<number, [number, number, number]> | null = null;

export const getCachedBoardTiles = (): TileData[] => {
    if (!cachedTiles) {
        cachedTiles = getBoardTiles();
    }
    return cachedTiles;
};

const ensurePositionMap = (): Map<number, [number, number, number]> => {
    if (!tilePositionMap) {
        const tiles = getCachedBoardTiles();
        tilePositionMap = new Map();
        for (const tile of tiles) {
            tilePositionMap.set(tile.id, [tile.x, 0, tile.z]);
        }
    }
    return tilePositionMap;
};

const DEFAULT_POS: [number, number, number] = [0, 0, 0];

export const getTilePosition = (tileId: number): [number, number, number] => {
    return ensurePositionMap().get(tileId) ?? DEFAULT_POS;
};
