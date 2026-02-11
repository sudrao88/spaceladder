import { memo } from 'react';
import { View, PerspectiveCamera } from '@react-three/drei';
import { Dice } from './Dice';
import { useGameStore } from '../store/useGameStore';

const selectDiceValue = (s: ReturnType<typeof useGameStore.getState>) => s.diceValue;
const selectIsRolling = (s: ReturnType<typeof useGameStore.getState>) => s.isRolling;

/**
 * 3D dice scene rendered inside a drei <View>, sharing the main WebGL context.
 * The `trackRef` must point to a DOM element inside the Canvas's eventSource
 * container — App.tsx is responsible for rendering that tracking div.
 */
export const DiceView = memo(({ trackRef }: { trackRef: React.RefObject<HTMLDivElement> }) => {
  const diceValue = useGameStore(selectDiceValue);
  const isRolling = useGameStore(selectIsRolling);

  return (
    <View track={trackRef}>
      <PerspectiveCamera makeDefault position={[0, 0, 6]} fov={45} />
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-5, -5, -5]} intensity={0.5} />
      <Dice value={diceValue} isRolling={isRolling} />
    </View>
  );
});

DiceView.displayName = 'DiceView';
