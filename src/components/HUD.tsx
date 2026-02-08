import { useGameStore } from '../store/useGameStore';

export const HUD = () => {
  const { 
    gameStatus, 
    players, 
    currentPlayerIndex, 
    diceValue, 
    rollDice, 
    isRolling, 
    winner,
    setupGame,
    resetGame
  } = useGameStore();

  if (gameStatus === 'setup') {
    return (
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 text-white backdrop-blur-sm">
        <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600 mb-8 neon-text">
          WORMHOLE WARP
        </h1>
        <div className="flex gap-4">
          {[2, 3, 4].map(num => (
            <button
              key={num}
              onClick={() => setupGame(num)}
              className="px-8 py-4 bg-gray-800 hover:bg-cyan-900 border border-cyan-500 rounded-lg text-xl font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:shadow-[0_0_25px_rgba(6,182,212,0.8)]"
            >
              {num} Players
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (gameStatus === 'finished') {
     return (
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90 text-white">
        <h1 className="text-5xl font-bold text-yellow-400 mb-4 animate-pulse">GAME OVER</h1>
        <h2 className="text-3xl mb-8">
            Player <span style={{color: winner?.color}}>{winner?.id! + 1}</span> Wins!
        </h2>
        <button
          onClick={resetGame}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded text-white font-bold"
        >
          Play Again
        </button>
      </div>
     );
  }

  const currentPlayer = players[currentPlayerIndex];

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">
      {/* Top Bar: Player List */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
            {players.map((p, idx) => (
                <div 
                    key={p.id} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-black/50 backdrop-blur-md border-l-4 transition-all
                        ${idx === currentPlayerIndex ? 'border-white scale-105 shadow-lg' : 'border-transparent opacity-70'}
                    `}
                    style={{ borderColor: idx === currentPlayerIndex ? 'white' : 'transparent', borderLeftColor: p.color }}
                >
                    <div className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                    <span className="text-white font-mono font-bold">P{p.id + 1}</span>
                    <span className="text-cyan-300 ml-2">Tile: {p.position}</span>
                </div>
            ))}
        </div>
      </div>

      {/* Bottom Bar: Controls */}
      <div className="flex flex-col items-center pointer-events-auto pb-8">
        <div className="mb-4 h-16 flex items-center justify-center">
            {diceValue && (
                <div className="text-6xl font-bold text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]">
                    {diceValue}
                </div>
            )}
            {isRolling && (
                <div className="text-2xl text-cyan-400 animate-bounce">Rolling...</div>
            )}
        </div>
        
        <button
          onClick={rollDice}
          disabled={isRolling}
          className={`
            w-24 h-24 rounded-full border-4 flex items-center justify-center text-white font-bold text-xl transition-all
            ${isRolling 
                ? 'border-gray-600 bg-gray-800 cursor-not-allowed' 
                : 'border-cyan-500 bg-cyan-900/80 hover:bg-cyan-700 hover:scale-110 shadow-[0_0_30px_rgba(6,182,212,0.6)]'
            }
          `}
        >
          ROLL
        </button>
        <div className="mt-2 text-sm text-gray-400">
            Player {currentPlayer?.id + 1}'s Turn
        </div>
      </div>
    </div>
  );
};
