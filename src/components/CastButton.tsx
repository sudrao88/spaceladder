import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCast } from '../cast/sender/useCast';

const CastGlyph = memo(({ filled }: { filled: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="2.5" y="4.5" width="19" height="14" rx="2" />
    {filled ? (
      <path
        d="M3 9 a8 8 0 0 1 8 8 M3 13 a4 4 0 0 1 4 4 M3 17 h0.01"
        fill="currentColor"
      />
    ) : (
      <path d="M3 9 a8 8 0 0 1 8 8 M3 13 a4 4 0 0 1 4 4 M3 17 h0.01" />
    )}
  </svg>
));

CastGlyph.displayName = 'CastGlyph';

export const CastButton = memo(() => {
  const cast = useCast();
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
      setMenuOpen(false);
    }
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen, handleClickOutside]);

  if (cast.state === 'unavailable') return null;

  const isConnected = cast.state === 'connected';
  const isConnecting = cast.state === 'connecting';

  const onClick = () => {
    if (isConnected) {
      setMenuOpen((v) => !v);
      return;
    }
    cast.requestSession();
  };

  const tooltip = isConnected
    ? `Casting to ${cast.deviceName ?? 'TV'}`
    : isConnecting
      ? 'Connecting…'
      : cast.error
        ? `Cast error: ${cast.error}`
        : 'Cast to TV';

  const color = isConnected
    ? 'text-cyan-300'
    : isConnecting
      ? 'text-cyan-200'
      : 'text-white/80';

  return (
    <div className="relative pointer-events-auto" ref={wrapperRef}>
      <motion.button
        onClick={onClick}
        whileTap={{ scale: 0.92 }}
        title={tooltip}
        aria-label={tooltip}
        aria-pressed={isConnected}
        className={`relative p-2 bg-gray-800/80 hover:bg-gray-700 rounded-full shadow-lg border border-white/20 transition-colors flex items-center justify-center ${color}`}
      >
        <CastGlyph filled={isConnected} />
        {isConnecting && (
          <span className="absolute inset-0 rounded-full ring-2 ring-cyan-400/60 animate-ping" />
        )}
        {isConnected && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
        )}
      </motion.button>

      <AnimatePresence>
        {menuOpen && isConnected && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className="absolute top-12 right-0 w-60 bg-gray-900/95 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-white/10">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Casting
              </div>
              <div className="text-sm text-white truncate">
                {cast.deviceName ?? 'TV'}
              </div>
            </div>
            <button
              onClick={() => {
                cast.endSession();
                setMenuOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-sm text-red-300 hover:bg-red-900/40 transition-colors"
            >
              Stop Casting
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

CastButton.displayName = 'CastButton';
