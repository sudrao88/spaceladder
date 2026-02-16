import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Standard English Peg Solitaire (Brainvita) board.
 *
 * The board is a 7x7 grid with corners cut off, forming a cross shape.
 * Valid cells are represented in a bitmask-like manner via VALID_CELLS.
 *
 * Cell states:
 *   'star'  — occupied by a star (⭐️)
 *   'hole'  — empty black hole (available for jumps)
 *   null    — invalid cell (not part of the board)
 */
export type CellState = 'star' | 'hole' | null;

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  from: Position;
  jumped: Position;
  to: Position;
}

export type GamePhase = 'idle' | 'playing' | 'won' | 'lost';

// Standard English board: cross shape on 7x7 grid
// 1 = valid cell, 0 = invalid (corner)
const BOARD_MASK: number[][] = [
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
];

export const BOARD_SIZE = 7;

function createInitialBoard(): CellState[][] {
  const board: CellState[][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row: CellState[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (BOARD_MASK[r][c] === 0) {
        row.push(null);
      } else if (r === 3 && c === 3) {
        // Center starts as a hole
        row.push('hole');
      } else {
        row.push('star');
      }
    }
    board.push(row);
  }
  return board;
}

function isValidCell(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE && BOARD_MASK[row][col] === 1;
}

function getValidMoves(board: CellState[][], from: Position): Move[] {
  const moves: Move[] = [];
  const directions = [
    [-2, 0], [2, 0], [0, -2], [0, 2], // up, down, left, right
  ];

  for (const [dr, dc] of directions) {
    const jumpedRow = from.row + dr / 2;
    const jumpedCol = from.col + dc / 2;
    const toRow = from.row + dr;
    const toCol = from.col + dc;

    if (
      isValidCell(toRow, toCol) &&
      board[jumpedRow][jumpedCol] === 'star' &&
      board[toRow][toCol] === 'hole'
    ) {
      moves.push({
        from,
        jumped: { row: jumpedRow, col: jumpedCol },
        to: { row: toRow, col: toCol },
      });
    }
  }

  return moves;
}

function hasAnyValidMoves(board: CellState[][]): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 'star') {
        if (getValidMoves(board, { row: r, col: c }).length > 0) {
          return true;
        }
      }
    }
  }
  return false;
}

function countStars(board: CellState[][]): number {
  let count = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 'star') count++;
    }
  }
  return count;
}

const STORAGE_KEY = 'star-solitaire-storage';

interface SolitaireState {
  board: CellState[][];
  selectedCell: Position | null;
  validMoves: Move[];
  moveCount: number;
  starsRemaining: number;
  gamePhase: GamePhase;
  moveHistory: Move[];
  bestScore: number | null;

  // Actions
  startGame: () => void;
  selectCell: (pos: Position) => void;
  executeMove: (move: Move) => void;
  undoMove: () => void;
  resetGame: () => void;
}

export const useSolitaireStore = create<SolitaireState>()(
  persist(
    (set, get) => ({
      board: createInitialBoard(),
      selectedCell: null,
      validMoves: [],
      moveCount: 0,
      starsRemaining: 32,
      gamePhase: 'idle',
      moveHistory: [],
      bestScore: null,

      startGame: () => {
        set({
          board: createInitialBoard(),
          selectedCell: null,
          validMoves: [],
          moveCount: 0,
          starsRemaining: 32,
          gamePhase: 'playing',
          moveHistory: [],
        });
      },

      selectCell: (pos) => {
        const { board, gamePhase, selectedCell, validMoves } = get();
        if (gamePhase !== 'playing') return;

        const cell = board[pos.row][pos.col];

        // If clicking a valid move destination, execute the move
        if (selectedCell && cell === 'hole') {
          const matchingMove = validMoves.find(
            (m) => m.to.row === pos.row && m.to.col === pos.col
          );
          if (matchingMove) {
            get().executeMove(matchingMove);
            return;
          }
        }

        // If clicking a star, select it and show valid moves
        if (cell === 'star') {
          const moves = getValidMoves(board, pos);
          set({
            selectedCell: pos,
            validMoves: moves,
          });
          return;
        }

        // Clicking anything else deselects
        set({ selectedCell: null, validMoves: [] });
      },

      executeMove: (move) => {
        const { board, moveCount, moveHistory, bestScore } = get();

        // Apply the move
        const newBoard = board.map((row) => [...row]);
        newBoard[move.from.row][move.from.col] = 'hole';
        newBoard[move.jumped.row][move.jumped.col] = 'hole';
        newBoard[move.to.row][move.to.col] = 'star';

        const stars = countStars(newBoard);
        const hasMovesLeft = hasAnyValidMoves(newBoard);

        let phase: GamePhase = 'playing';
        let newBest = bestScore;

        if (!hasMovesLeft) {
          if (stars === 1 && newBoard[3][3] === 'star') {
            // Perfect win: single star in center
            phase = 'won';
          } else {
            phase = 'lost';
          }
          // Update best score
          if (newBest === null || stars < newBest) {
            newBest = stars;
          }
        }

        set({
          board: newBoard,
          selectedCell: null,
          validMoves: [],
          moveCount: moveCount + 1,
          starsRemaining: stars,
          gamePhase: phase,
          moveHistory: [...moveHistory, move],
          bestScore: newBest,
        });
      },

      undoMove: () => {
        const { board, moveHistory, moveCount } = get();
        if (moveHistory.length === 0) return;

        const lastMove = moveHistory[moveHistory.length - 1];
        const newBoard = board.map((row) => [...row]);

        // Reverse the move
        newBoard[lastMove.from.row][lastMove.from.col] = 'star';
        newBoard[lastMove.jumped.row][lastMove.jumped.col] = 'star';
        newBoard[lastMove.to.row][lastMove.to.col] = 'hole';

        set({
          board: newBoard,
          selectedCell: null,
          validMoves: [],
          moveCount: moveCount - 1,
          starsRemaining: countStars(newBoard),
          gamePhase: 'playing',
          moveHistory: moveHistory.slice(0, -1),
        });
      },

      resetGame: () => {
        set({
          board: createInitialBoard(),
          selectedCell: null,
          validMoves: [],
          moveCount: 0,
          starsRemaining: 32,
          gamePhase: 'idle',
          moveHistory: [],
        });
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        board: state.board,
        moveCount: state.moveCount,
        starsRemaining: state.starsRemaining,
        gamePhase: state.gamePhase,
        moveHistory: state.moveHistory,
        bestScore: state.bestScore,
      }),
    }
  )
);
