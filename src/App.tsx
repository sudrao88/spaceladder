import { useAppStore } from './store/useAppStore';
import { GameLauncher } from './components/GameLauncher';
import { WormholeWarp } from './components/WormholeWarp';
import { StarSolitaire } from './components/StarSolitaire';

const selectActiveScreen = (s: ReturnType<typeof useAppStore.getState>) => s.activeScreen;

function App() {
  const activeScreen = useAppStore(selectActiveScreen);

  switch (activeScreen) {
    case 'wormhole-warp':
      return <WormholeWarp />;
    case 'star-solitaire':
      return <StarSolitaire />;
    default:
      return <GameLauncher />;
  }
}

export default App;
