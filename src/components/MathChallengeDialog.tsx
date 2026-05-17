import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import type { PendingMathChallenge } from '../store/useGameStore';
import { PLAYER_EMOJIS } from '../utils/boardUtils';
import { useFocusTrap } from '../hooks/useFocusTrap';

const selectPendingMathChallenge = (s: ReturnType<typeof useGameStore.getState>) => s.pendingMathChallenge;
const selectResolveMathChallenge = (s: ReturnType<typeof useGameStore.getState>) => s.resolveMathChallenge;
const selectPlayers = (s: ReturnType<typeof useGameStore.getState>) => s.players;
const selectPlayerInitials = (s: ReturnType<typeof useGameStore.getState>) => s.playerInitials;
const selectMathSettings = (s: ReturnType<typeof useGameStore.getState>) => s.mathSettings;
const selectPlayerShields = (s: ReturnType<typeof useGameStore.getState>) => s.playerShields;
const selectShieldSkipAction = (s: ReturnType<typeof useGameStore.getState>) => s.useShieldOnMathChallenge;

type ChallengePhase = 'input' | 'result';

interface ResultState {
  correct: boolean;
  earnedShield: boolean;
}

interface MathChallengeInnerProps {
  challenge: PendingMathChallenge;
}

const MAX_ANSWER_DIGITS = 3;

function getResultCopy(
  challenge: PendingMathChallenge,
  result: ResultState,
  isTimeout: boolean,
): { title: string; titleClass: string; symbol: string; subtitle: string } {
  if (challenge.context === 'wormhole') {
    const isBoost = challenge.wormholeIsBoost === true;
    if (result.correct) {
      return isBoost
        ? { title: 'Boost Locked In!', titleClass: 'text-cyan-400', symbol: '✓', subtitle: 'Teleport ready.' }
        : { title: 'Glitch Dodged!', titleClass: 'text-green-400', symbol: '✓', subtitle: 'You stay put.' };
    }
    return isBoost
      ? { title: isTimeout ? "Time's Up!" : 'Not Quite!', titleClass: 'text-red-400', symbol: '✘', subtitle: 'The boost slipped away.' }
      : { title: isTimeout ? "Time's Up!" : 'Not Quite!', titleClass: 'text-red-400', symbol: '✘', subtitle: 'The glitch pulls you down...' };
  }

  if (result.earnedShield) {
    return { title: 'Glitch Shield Earned!', titleClass: 'text-cyan-400', symbol: '', subtitle: 'You answered correctly in time!' };
  }
  if (result.correct) {
    return { title: 'Correct!', titleClass: 'text-green-400', symbol: '✓', subtitle: 'But not fast enough for a shield.' };
  }
  return {
    title: isTimeout ? "Time's Up!" : 'Not Quite!',
    titleClass: 'text-red-400',
    symbol: '✘',
    subtitle: 'Your turn has been skipped!',
  };
}

const MathChallengeInner = memo(({ challenge }: MathChallengeInnerProps) => {
  const resolveMathChallenge = useGameStore(selectResolveMathChallenge);
  const players = useGameStore(selectPlayers);
  const playerInitials = useGameStore(selectPlayerInitials);
  const mathSettings = useGameStore(selectMathSettings);
  const playerShields = useGameStore(selectPlayerShields);
  const spendShieldToSkip = useGameStore(selectShieldSkipAction);

  const answerLength = Math.min(MAX_ANSWER_DIGITS, Math.max(1, String(challenge.correctAnswer).length));
  const [digits, setDigits] = useState<string[]>([]);
  const [phase, setPhase] = useState<ChallengePhase>('input');
  const [result, setResult] = useState<ResultState | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(mathSettings.countdownSeconds);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolvedRef = useRef(false);
  const focusTrapRef = useFocusTrap<HTMLDivElement>([phase]);

  const isWormhole = challenge.context === 'wormhole';
  const isGlitchMath = isWormhole && challenge.wormholeIsBoost === false;
  const shieldsOwned = playerShields[challenge.playerId] ?? 0;
  const canUseShield = isGlitchMath && shieldsOwned > 0 && digits.length === 0 && phase === 'input';

  useEffect(() => {
    if (phase !== 'input') return;

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - challenge.startTime) / 1000;
      const remaining = Math.max(0, mathSettings.countdownSeconds - elapsed);
      setSecondsLeft(Math.ceil(remaining));

      if (remaining <= 0 && !resolvedRef.current) {
        resolvedRef.current = true;
        clearInterval(timerRef.current!);
        setResult({ correct: false, earnedShield: false });
        setPhase('result');
      }
    }, 200);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, mathSettings.countdownSeconds, challenge.startTime]);

  useEffect(() => {
    if (phase !== 'input' || digits.length !== answerLength || resolvedRef.current) return;

    const answer = parseInt(digits.join(''), 10);
    const elapsed = (Date.now() - challenge.startTime) / 1000;
    const correct = answer === challenge.correctAnswer;
    const earnedShield = correct && elapsed <= mathSettings.shieldThresholdSeconds;

    resolvedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setResult({ correct, earnedShield });
    setPhase('result');
  }, [digits, phase, answerLength, challenge.startTime, challenge.correctAnswer, mathSettings.shieldThresholdSeconds]);

  const handleDigitPress = useCallback((digit: string) => {
    if (phase !== 'input' || resolvedRef.current) return;
    setDigits(prev => (prev.length >= answerLength ? prev : [...prev, digit]));
  }, [phase, answerLength]);

  const handleClear = useCallback(() => {
    if (phase !== 'input' || resolvedRef.current) return;
    setDigits([]);
  }, [phase]);

  const handleProceed = useCallback(() => {
    if (!result) return;
    resolveMathChallenge(result.earnedShield, challenge.playerId, challenge.diceValue, result.correct);
  }, [result, resolveMathChallenge, challenge.playerId, challenge.diceValue]);

  const handleUseShield = useCallback(() => {
    if (!canUseShield) return;
    resolvedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    spendShieldToSkip();
  }, [canUseShield, spendShieldToSkip]);

  const player = players.find(p => p.id === challenge.playerId);
  const emoji = player ? PLAYER_EMOJIS[player.id % PLAYER_EMOJIS.length] : '';
  const label = player ? (playerInitials[player.id] || `P${player.id + 1}`) : '';
  const { operandA, operandB, operator, correctAnswer } = challenge;

  const timerColor = secondsLeft <= 5 ? '#ef4444'
    : secondsLeft <= mathSettings.shieldThresholdSeconds ? '#facc15'
    : '#22d3ee';

  const accentColor = isWormhole
    ? (challenge.wormholeIsBoost ? '#22d3ee' : '#a855f7')
    : '#22d3ee';
  const contextBadge = isWormhole
    ? (challenge.wormholeIsBoost ? 'Wormhole Boost!' : 'Glitch Incoming!')
    : null;

  return (
    <motion.div
      ref={focusTrapRef}
      key="math-challenge-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Math Challenge"
      className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <motion.div
        className="relative z-10 flex flex-col items-center max-w-sm w-[90%] overflow-hidden rounded-2xl border shadow-2xl"
        style={{
          borderColor: `${accentColor}66`,
          background: 'radial-gradient(ellipse at center, #0f172a 0%, #020617 100%)',
          boxShadow: `0 0 60px ${accentColor}26, 0 0 120px ${accentColor}0d`,
        }}
        initial={{ scale: 0.7, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: -30 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        <AnimatePresence mode="wait">
          {phase === 'input' && (
            <motion.div
              key="math-input"
              className="flex flex-col items-center p-5 w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between w-full mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{emoji}</span>
                  <span className="text-white font-mono font-bold text-sm" style={{ color: player?.color }}>{label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={timerColor} strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12,6 12,12 16,14" />
                  </svg>
                  <span className="font-mono font-bold text-sm" style={{ color: timerColor }}>
                    {secondsLeft}s
                  </span>
                </div>
              </div>

              {contextBadge ? (
                <p
                  className="text-xs font-bold uppercase tracking-wider mb-3"
                  style={{ color: accentColor }}
                >
                  {contextBadge}
                </p>
              ) : (
                <p className="text-gray-500 text-xs mb-3">
                  Solve within {mathSettings.shieldThresholdSeconds}s to earn a shield!
                </p>
              )}

              <div className="flex items-center gap-2 mb-4">
                <span className="font-mono font-bold text-2xl" style={{ color: accentColor }}>{operandA}</span>
                <span className="text-gray-400 font-mono font-bold text-2xl">{operator}</span>
                <span className="font-mono font-bold text-2xl" style={{ color: accentColor }}>{operandB}</span>
                <span className="text-gray-400 font-mono font-bold text-2xl">=</span>
                <div className="flex gap-1">
                  {Array.from({ length: answerLength }).map((_, i) => {
                    const filled = digits[i];
                    return (
                      <div
                        key={i}
                        className={`w-10 h-12 flex items-center justify-center rounded-lg border-2 font-mono font-bold text-2xl transition-colors ${
                          filled ? 'text-white' : 'text-gray-600 bg-gray-800/50 border-gray-600'
                        }`}
                        style={filled ? {
                          borderColor: accentColor,
                          backgroundColor: `${accentColor}1a`,
                        } : undefined}
                      >
                        {filled || '_'}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2 w-full max-w-[280px] mb-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => (
                  <button
                    key={n}
                    onClick={() => handleDigitPress(String(n))}
                    className="h-11 rounded-lg bg-gray-800 hover:bg-gray-700 active:bg-cyan-800 border border-white/10 text-white font-mono font-bold text-lg transition-all active:scale-95"
                  >
                    {n}
                  </button>
                ))}
              </div>

              <button
                onClick={handleClear}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors mt-1"
              >
                Clear
              </button>

              {canUseShield && (
                <button
                  onClick={handleUseShield}
                  className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan-500/50 bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-200 font-bold text-sm transition-all active:scale-95"
                  title="Spend a Glitch Shield to skip the question and the wormhole"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"
                      fill="#22d3ee"
                      stroke="#06b6d4"
                      strokeWidth={1.5}
                    />
                  </svg>
                  Use Shield ({shieldsOwned})
                </button>
              )}
            </motion.div>
          )}

          {phase === 'result' && result && (() => {
            const isTimeout = secondsLeft <= 0;
            const copy = getResultCopy(challenge, result, isTimeout);
            const showShieldArt = result.earnedShield;
            return (
              <motion.div
                key="math-result"
                className="flex flex-col items-center p-6 w-full"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {showShieldArt ? (
                  <div className="relative mb-3">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.3, 1] }}
                      transition={{ duration: 0.5 }}
                    >
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"
                          fill="#22d3ee"
                          stroke="#06b6d4"
                          strokeWidth={1.5}
                        />
                        <path d="M9 12l2 2 4-4" stroke="#0f172a" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </motion.div>
                  </div>
                ) : (
                  copy.symbol && <span className="text-4xl mb-2">{copy.symbol}</span>
                )}

                <h3 className={`text-lg font-bold mb-1 ${copy.titleClass}`}>{copy.title}</h3>
                <p className="text-gray-400 text-sm text-center mb-1">
                  {operandA} {operator} {operandB} = {correctAnswer}
                </p>
                <p className={`text-xs text-center mb-4 ${result.correct ? 'text-gray-500' : 'text-red-400 font-semibold'}`}>
                  {copy.subtitle}
                </p>

                <button
                  onClick={handleProceed}
                  className="group relative px-8 py-3 rounded-xl font-bold text-white text-base transition-all active:scale-95"
                  style={{
                    background: result.earnedShield
                      ? 'linear-gradient(135deg, #0891b2, #06b6d4, #22d3ee)'
                      : 'linear-gradient(135deg, #475569, #64748b)',
                    boxShadow: result.earnedShield
                      ? '0 0 20px rgba(6,182,212,0.5)'
                      : '0 0 10px rgba(100,116,139,0.3)',
                  }}
                >
                  <span className="relative z-10">Continue</span>
                </button>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
});

MathChallengeInner.displayName = 'MathChallengeInner';

export const MathChallengeDialog = memo(() => {
  const pendingChallenge = useGameStore(selectPendingMathChallenge);

  if (!pendingChallenge) return null;

  return (
    <AnimatePresence>
      <MathChallengeInner key={pendingChallenge.startTime} challenge={pendingChallenge} />
    </AnimatePresence>
  );
});

MathChallengeDialog.displayName = 'MathChallengeDialog';
