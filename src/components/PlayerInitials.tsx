import { memo, useState, useRef, useCallback, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { PLAYER_EMOJIS } from '../utils/boardUtils';

const selectPlayers = (s: ReturnType<typeof useGameStore.getState>) => s.players;
const selectFinalizeSetup = (s: ReturnType<typeof useGameStore.getState>) => s.finalizeSetup;

type Phase = 'input' | 'shuffling' | 'reveal';

/** Fisher-Yates shuffle (returns new array) */
function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const PlayerInitials = memo(() => {
  const players = useGameStore(selectPlayers);
  const finalizeSetup = useGameStore(selectFinalizeSetup);

  const [initials, setInitials] = useState<Record<number, string[]>>(() => {
    const map: Record<number, string[]> = {};
    for (const p of players) map[p.id] = ['', '', ''];
    return map;
  });

  const [phase, setPhase] = useState<Phase>('input');
  const [displayOrder, setDisplayOrder] = useState<number[]>(() => players.map(p => p.id));
  const [finalOrder, setFinalOrder] = useState<number[]>([]);
  const shuffleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs for the 3 input boxes per player
  const inputRefs = useRef<Record<number, (HTMLInputElement | null)[]>>({});

  const allFilled = players.every(p => {
    const chars = initials[p.id];
    return chars && chars.some(c => c !== '');
  });

  const handleCharInput = useCallback((playerId: number, charIndex: number, value: string) => {
    const char = value.toUpperCase().replace(/[^A-Z]/g, '');
    setInitials(prev => {
      const chars = [...(prev[playerId] || ['', '', ''])];
      chars[charIndex] = char;
      return { ...prev, [playerId]: chars };
    });

    // Auto-advance to next input box
    if (char && charIndex < 2) {
      const nextInput = inputRefs.current[playerId]?.[charIndex + 1];
      nextInput?.focus();
    }
  }, []);

  const handleKeyDown = useCallback((playerId: number, charIndex: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const chars = initials[playerId] || ['', '', ''];

      if (chars[charIndex] === '' && charIndex > 0) {
        // Move to previous box and clear it
        const prevInput = inputRefs.current[playerId]?.[charIndex - 1];
        prevInput?.focus();
        setInitials(prev => {
          const c = [...(prev[playerId] || ['', '', ''])];
          c[charIndex - 1] = '';
          return { ...prev, [playerId]: c };
        });
        e.preventDefault();
      }
    }
  }, [initials]);

  const handleLaunch = useCallback(() => {
    if (!allFilled) return;

    // Determine the final shuffled order
    const shuffled = shuffleArray(players.map(p => p.id));
    setFinalOrder(shuffled);
    setPhase('shuffling');

    // Animate: rapidly shuffle display order several times
    let count = 0;
    const totalShuffles = 8;
    const interval = 150;

    const doShuffle = () => {
      count++;
      if (count < totalShuffles) {
        setDisplayOrder(shuffleArray(players.map(p => p.id)));
        shuffleTimerRef.current = setTimeout(doShuffle, interval);
      } else {
        // Final: set to the real shuffled order
        setDisplayOrder(shuffled);
        setTimeout(() => setPhase('reveal'), 300);
      }
    };

    shuffleTimerRef.current = setTimeout(doShuffle, interval);
  }, [allFilled, players]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (shuffleTimerRef.current) clearTimeout(shuffleTimerRef.current);
    };
  }, []);

  const handleStartGame = useCallback(() => {
    const finalInitials = Object.fromEntries(
      Object.entries(initials).map(([id, chars]) => [id, chars.join('')])
    );
    finalizeSetup(finalInitials, finalOrder);
  }, [finalizeSetup, initials, finalOrder]);

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center overflow-y-auto bg-black/80 text-white backdrop-blur-sm pointer-events-auto">
      <div className="my-auto flex flex-col items-center py-8 px-4 w-full">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600 mb-2 neon-text">
          WORMHOLE WARP
        </h1>
        <p className="text-gray-400 mb-6 text-sm">
          {phase === 'input' && 'Enter your initials (up to 3 letters)'}
          {phase === 'shuffling' && 'Randomizing turn order...'}
          {phase === 'reveal' && 'Turn order decided!'}
        </p>

        <div className="flex flex-col gap-4 mb-8">
          {displayOrder.map((playerId, idx) => {
            const emoji = PLAYER_EMOJIS[playerId % PLAYER_EMOJIS.length];
            const chars = initials[playerId] || ['', '', ''];
            const playerInitialsStr = chars.join('');

            // Ensure ref array exists
            if (!inputRefs.current[playerId]) {
              inputRefs.current[playerId] = [null, null, null];
            }

            return (
              <div
                key={playerId}
                className={`flex items-center gap-4 px-6 py-3 rounded-xl bg-gray-900/80 border transition-all duration-300
                  ${phase === 'shuffling' ? 'border-cyan-500/50 animate-pulse' : ''}
                  ${phase === 'reveal' ? 'border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'border-white/10'}
                `}
              >
                {phase === 'reveal' && (
                  <span className="text-cyan-400 font-mono font-bold text-lg w-8">
                    {idx + 1}.
                  </span>
                )}

                <span className="text-3xl" role="img" aria-label="player-token">
                  {emoji}
                </span>

                <span className="text-gray-500 text-xl font-mono">—</span>

                {phase === 'input' ? (
                  <div className="flex gap-2">
                    {[0, 1, 2].map(charIdx => (
                      <input
                        key={charIdx}
                        ref={el => { inputRefs.current[playerId][charIdx] = el; }}
                        type="text"
                        maxLength={1}
                        value={chars[charIdx]}
                        onChange={e => handleCharInput(playerId, charIdx, e.target.value)}
                        onKeyDown={e => handleKeyDown(playerId, charIdx, e)}
                        className="w-10 h-12 text-center text-2xl font-mono font-bold bg-gray-800 border-b-2 border-cyan-500/50 focus:border-cyan-400 focus:outline-none text-white rounded-sm uppercase caret-cyan-400 transition-colors"
                        autoFocus={playerId === displayOrder[0] && charIdx === 0}
                      />
                    ))}
                  </div>
                ) : (
                  <span className="text-2xl font-mono font-bold text-white tracking-widest min-w-[5rem]">
                    {playerInitialsStr}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {phase === 'input' && (
          <button
            onClick={handleLaunch}
            disabled={!allFilled}
            className={`px-8 py-4 rounded-lg text-xl font-bold transition-all
              ${allFilled
                ? 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:shadow-[0_0_30px_rgba(6,182,212,0.8)] cursor-pointer'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            LAUNCH
          </button>
        )}

        {phase === 'reveal' && (
          <button
            onClick={handleStartGame}
            className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 rounded-lg text-xl font-bold transition-all shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:shadow-[0_0_30px_rgba(6,182,212,0.8)]"
          >
            START GAME
          </button>
        )}
      </div>
    </div>
  );
});

PlayerInitials.displayName = 'PlayerInitials';
