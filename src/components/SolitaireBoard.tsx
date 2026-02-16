import { memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSolitaireStore, BOARD_SIZE } from '../store/useSolitaireStore';
import type { Position } from '../store/useSolitaireStore';

const selectBoard = (s: ReturnType<typeof useSolitaireStore.getState>) => s.board;
const selectSelectedCell = (s: ReturnType<typeof useSolitaireStore.getState>) => s.selectedCell;
const selectValidMoves = (s: ReturnType<typeof useSolitaireStore.getState>) => s.validMoves;
const selectSelectCell = (s: ReturnType<typeof useSolitaireStore.getState>) => s.selectCell;
const selectGamePhase = (s: ReturnType<typeof useSolitaireStore.getState>) => s.gamePhase;

const Cell = memo(({
  row,
  col,
  state,
  isSelected,
  isValidTarget,
  isJumpedStar,
  onClick,
  disabled,
}: {
  row: number;
  col: number;
  state: 'star' | 'hole' | null;
  isSelected: boolean;
  isValidTarget: boolean;
  isJumpedStar: boolean;
  onClick: () => void;
  disabled: boolean;
}) => {
  if (state === null) {
    return <div className="w-14 h-14 sm:w-16 sm:h-16" />;
  }

  const isStar = state === 'star';

  return (
    <motion.button
      layout
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center
        transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
        ${isStar
          ? isSelected
            ? 'bg-cyan-950/60 border-2 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.5)]'
            : 'bg-gray-900/60 border border-cyan-800/40 hover:border-cyan-500/60 hover:bg-cyan-950/40 cursor-pointer'
          : isValidTarget
            ? 'bg-cyan-950/40 border-2 border-cyan-400/70 shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer'
            : 'bg-gray-900/40 border border-gray-700/30'
        }
        ${isJumpedStar ? 'ring-2 ring-purple-400/60' : ''}
      `}
      whileHover={!disabled && (isStar || isValidTarget) ? { scale: 1.08 } : {}}
      whileTap={!disabled && (isStar || isValidTarget) ? { scale: 0.95 } : {}}
      aria-label={`Row ${row + 1}, Column ${col + 1}: ${isStar ? 'Star' : 'Black hole'}${isSelected ? ' (selected)' : ''}${isValidTarget ? ' (valid move target)' : ''}`}
    >
      <AnimatePresence mode="wait">
        {isStar ? (
          <motion.span
            key={`star-${row}-${col}`}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={`text-3xl sm:text-4xl select-none ${isSelected ? 'drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]' : ''}`}
          >
            ⭐
          </motion.span>
        ) : (
          <motion.div
            key={`hole-${row}-${col}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full ${
              isValidTarget
                ? 'bg-gradient-radial from-cyan-900/60 to-gray-950 border border-cyan-500/40'
                : 'bg-gradient-radial from-gray-800/40 to-gray-950 border border-gray-700/20'
            }`}
            style={{
              background: isValidTarget
                ? 'radial-gradient(circle, rgba(8,145,178,0.3) 0%, rgba(3,7,18,0.9) 70%)'
                : 'radial-gradient(circle, rgba(50,50,70,0.3) 0%, rgba(3,7,18,0.9) 70%)',
            }}
          >
            {isValidTarget && (
              <motion.div
                className="w-full h-full rounded-full"
                animate={{ boxShadow: ['0 0 8px rgba(6,182,212,0.3)', '0 0 20px rgba(6,182,212,0.7)', '0 0 8px rgba(6,182,212,0.3)'] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
});

Cell.displayName = 'Cell';

export const SolitaireBoard = memo(() => {
  const board = useSolitaireStore(selectBoard);
  const selectedCell = useSolitaireStore(selectSelectedCell);
  const validMoves = useSolitaireStore(selectValidMoves);
  const selectCell = useSolitaireStore(selectSelectCell);
  const gamePhase = useSolitaireStore(selectGamePhase);

  const disabled = gamePhase !== 'playing';

  const handleCellClick = useCallback((row: number, col: number) => {
    selectCell({ row, col });
  }, [selectCell]);

  const isSelected = useCallback((pos: Position) => {
    return selectedCell !== null && selectedCell.row === pos.row && selectedCell.col === pos.col;
  }, [selectedCell]);

  const isValidTarget = useCallback((pos: Position) => {
    return validMoves.some((m) => m.to.row === pos.row && m.to.col === pos.col);
  }, [validMoves]);

  const isJumpedStar = useCallback((pos: Position) => {
    return validMoves.some((m) => m.jumped.row === pos.row && m.jumped.col === pos.col);
  }, [validMoves]);

  return (
    <div className="flex flex-col items-center gap-1">
      {Array.from({ length: BOARD_SIZE }).map((_, row) => (
        <div key={row} className="flex gap-1">
          {Array.from({ length: BOARD_SIZE }).map((_, col) => (
            <Cell
              key={`${row}-${col}`}
              row={row}
              col={col}
              state={board[row][col]}
              isSelected={isSelected({ row, col })}
              isValidTarget={isValidTarget({ row, col })}
              isJumpedStar={isJumpedStar({ row, col })}
              onClick={() => handleCellClick(row, col)}
              disabled={disabled}
            />
          ))}
        </div>
      ))}
    </div>
  );
});

SolitaireBoard.displayName = 'SolitaireBoard';
