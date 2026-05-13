import { memo } from 'react';
import { useGameStore } from '../store/useGameStore';
import { PLAYER_EMOJIS } from '../utils/boardUtils';

const selectGameStatus = (s: ReturnType<typeof useGameStore.getState>) => s.gameStatus;
const selectPlayers = (s: ReturnType<typeof useGameStore.getState>) => s.players;
const selectCurrentPlayerIndex = (s: ReturnType<typeof useGameStore.getState>) => s.currentPlayerIndex;
const selectDiceValue = (s: ReturnType<typeof useGameStore.getState>) => s.diceValue;
const selectIsRolling = (s: ReturnType<typeof useGameStore.getState>) => s.isRolling;
const selectWinner = (s: ReturnType<typeof useGameStore.getState>) => s.winner;
const selectPlayerInitials = (s: ReturnType<typeof useGameStore.getState>) => s.playerInitials;

export const ReceiverStatusBanner = memo(() => {
  const gameStatus = useGameStore(selectGameStatus);
  const players = useGameStore(selectPlayers);
  const currentPlayerIndex = useGameStore(selectCurrentPlayerIndex);
  const diceValue = useGameStore(selectDiceValue);
  const isRolling = useGameStore(selectIsRolling);
  const winner = useGameStore(selectWinner);
  const playerInitials = useGameStore(selectPlayerInitials);

  if (gameStatus === 'setup' || players.length === 0) {
    return (
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white pointer-events-none">
        <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600 mb-4">
          SPACE & LADDERS
        </h1>
        <p className="text-gray-400">Waiting for game to start on the controller…</p>
      </div>
    );
  }

  if (gameStatus === 'finished' && winner) {
    const winnerLabel = playerInitials[winner.id] || `P${winner.id + 1}`;
    const winnerEmoji = PLAYER_EMOJIS[winner.id % PLAYER_EMOJIS.length];
    return (
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white pointer-events-none bg-black/40">
        <h1 className="text-7xl font-bold text-yellow-400 mb-6 animate-pulse">GAME OVER</h1>
        <h2 className="text-5xl">
          {winnerEmoji} <span style={{ color: winner.color }}>{winnerLabel}</span> Wins!
        </h2>
      </div>
    );
  }

  const currentPlayer = players[currentPlayerIndex];
  const currentLabel = currentPlayer
    ? playerInitials[currentPlayer.id] || `P${currentPlayer.id + 1}`
    : '';
  const currentEmoji = currentPlayer
    ? PLAYER_EMOJIS[currentPlayer.id % PLAYER_EMOJIS.length]
    : '';

  return (
    <>
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-2 pointer-events-none">
        {players.map((p, idx) => {
          const label = playerInitials[p.id] || `P${p.id + 1}`;
          const emoji = PLAYER_EMOJIS[p.id % PLAYER_EMOJIS.length];
          const active = idx === currentPlayerIndex;
          return (
            <div
              key={p.id}
              className={`flex items-center gap-3 px-4 py-2 rounded-xl backdrop-blur-md border ${
                active
                  ? 'border-white scale-105 shadow-lg bg-gray-900/90'
                  : 'border-transparent opacity-70 bg-gray-900/60'
              }`}
            >
              <span className="text-3xl">{emoji}</span>
              <span className="text-white font-mono font-bold text-lg">{label}</span>
              <span className="text-cyan-300 ml-2 text-base">Tile: {p.position}</span>
            </div>
          );
        })}
      </div>

      {currentPlayer && (
        <div className="absolute bottom-6 right-6 z-10 flex items-center gap-4 px-6 py-3 rounded-2xl backdrop-blur-md bg-gray-900/80 border border-white/20 text-white pointer-events-none">
          <span className="text-3xl">{currentEmoji}</span>
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-widest text-gray-400">
              {isRolling ? 'Rolling…' : 'Now Rolling'}
            </span>
            <span className="font-mono font-bold text-2xl" style={{ color: currentPlayer.color }}>
              {currentLabel}
            </span>
          </div>
          {diceValue != null && (
            <div className="ml-4 flex items-center justify-center w-16 h-16 rounded-2xl border-2 border-white/30 bg-black/40 text-4xl font-bold">
              {diceValue}
            </div>
          )}
        </div>
      )}
    </>
  );
});

ReceiverStatusBanner.displayName = 'ReceiverStatusBanner';
