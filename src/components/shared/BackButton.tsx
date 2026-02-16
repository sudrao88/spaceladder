import { memo } from 'react';
import { useAppStore } from '../../store/useAppStore';

/**
 * Shared back-to-launcher navigation button.
 * Renders in the top-left corner with consistent styling across all games.
 */
export const BackButton = memo(() => {
  const navigateTo = useAppStore((s) => s.navigateTo);

  return (
    <button
      onClick={() => navigateTo('launcher')}
      className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg border border-white/10 transition-all text-sm z-20"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      Games
    </button>
  );
});

BackButton.displayName = 'BackButton';
