import { create } from 'zustand';

export type ActiveScreen = 'launcher' | 'wormhole-warp' | 'star-solitaire';

interface AppState {
  activeScreen: ActiveScreen;
  navigateTo: (screen: ActiveScreen) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  activeScreen: 'launcher',
  navigateTo: (screen) => set({ activeScreen: screen }),
}));
