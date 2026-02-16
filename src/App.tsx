import { lazy, Suspense } from 'react';
import { useAppStore } from './store/useAppStore';
import { GameLauncher } from './components/GameLauncher';

// Lazy-load game screens so the initial bundle only contains the launcher.
// WormholeWarp pulls in Three.js/R3F — no need to load that until the user clicks in.
// StarSolitaire is lighter but still benefits from separate chunking.
const WormholeWarp = lazy(() =>
  import('./components/WormholeWarp').then((m) => ({ default: m.WormholeWarp }))
);
const StarSolitaire = lazy(() =>
  import('./components/StarSolitaire').then((m) => ({ default: m.StarSolitaire }))
);

const selectActiveScreen = (s: ReturnType<typeof useAppStore.getState>) => s.activeScreen;

/** Full-screen loading state shown while a game chunk downloads. */
const GameLoadingFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-[#050510]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-400 text-sm tracking-wider uppercase">Loading</p>
    </div>
  </div>
);

function App() {
  const activeScreen = useAppStore(selectActiveScreen);

  if (activeScreen === 'launcher') {
    return <GameLauncher />;
  }

  return (
    <Suspense fallback={<GameLoadingFallback />}>
      {activeScreen === 'wormhole-warp' ? <WormholeWarp /> : <StarSolitaire />}
    </Suspense>
  );
}

export default App;
