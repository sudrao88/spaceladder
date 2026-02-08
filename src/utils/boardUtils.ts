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
        // Start from bottom row (9) up to top row (0)
        // i=0..9 -> row 9.
        // i=90..99 -> row 0.
        const row = (BOARD_HEIGHT - 1) - Math.floor(i / BOARD_WIDTH);
        let col = i % BOARD_WIDTH;
        
        // Snake pattern logic
        // We want 1 (row 9, bottom) at Left. So Row 9 is L->R.
        // Row 8 is R->L.
        // Row 0 is R->L.
        // Parity: 9 is Odd. 8 is Even. 0 is Even.
        // So Even rows are flipped (R->L). Odd rows are L->R.
        
        if (row % 2 === 0) {
            col = BOARD_WIDTH - 1 - col;
        }

        // Calculate world position
        // Center the board around (0,0,0)
        const x = (col - (BOARD_WIDTH - 1) / 2) * (TILE_SIZE + TILE_GAP);
        const z = (row - (BOARD_HEIGHT - 1) / 2) * (TILE_SIZE + TILE_GAP);

        tiles.push({
            id: i + 1,
            col,
            row,
            x,
            z
        });
    }
    return tiles;
};

// Cache the tiles since they are static
let cachedTiles: TileData[] | null = null;

export const getCachedBoardTiles = () => {
    if (!cachedTiles) {
        cachedTiles = getBoardTiles();
    }
    return cachedTiles;
};

export const getTilePosition = (tileId: number): [number, number, number] => {
    const tiles = getCachedBoardTiles();
    const tile = tiles.find(t => t.id === tileId);
    if (tile) {
        return [tile.x, 0, tile.z];
    }
    return [0, 0, 0];
};
