import { memo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import { Board } from './components/Board';
import { Rocket } from './components/Rocket';
import { HUD } from './components/HUD';
import { Starfield } from './components/Starfield';
import { useGameStore } from './store/useGameStore';
import { GameController } from './hooks/useGameController';
import { CameraController } from './components/CameraController';

// Granular selector — only re-renders when players array reference changes
const selectPlayers = (s: ReturnType<typeof useGameStore.getState>) => s.players;

// Static values hoisted out of render to avoid re-allocation
const CAMERA_POSITION: [number, number, number] = [0, 10, 0];
const CAMERA_ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0];
const AMBIENT_INTENSITY = 1;
const DIR_LIGHT_POS: [number, number, number] = [5, 10, 5];
const DIR_LIGHT_INTENSITY = 0.5;
const CANVAS_DPR: [number, number] = [1, 2];

// Separate scene contents to isolate 3D render tree from HUD re-renders
const GameScene = memo(() => {
  const players = useGameStore(selectPlayers);
  const { handleMovementComplete } = GameController();

  return (
    <>
      <Board />
      {players.map((player) => (
        <Rocket
          key={player.id}
          player={player}
          onMovementComplete={() => handleMovementComplete(player.id)}
        />
      ))}
    </>
  );
});

GameScene.displayName = 'GameScene';

function App() {
  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden select-none touch-none">
      {/* Landscape Enforcement Overlay */}
      <div className="md:hidden portrait:flex hidden fixed inset-0 z-[100] bg-black text-white items-center justify-center p-8 text-center">
          <p className="text-xl font-bold">Please rotate your device to landscape mode to play.</p>
      </div>

      <HUD />

      <Canvas shadows dpr={CANVAS_DPR}>
        <OrthographicCamera
            makeDefault
            position={CAMERA_POSITION}
            near={0.1}
            far={1000}
            rotation={CAMERA_ROTATION}
        />

        <CameraController />

        <ambientLight intensity={AMBIENT_INTENSITY} />
        <directionalLight position={DIR_LIGHT_POS} intensity={DIR_LIGHT_INTENSITY} />

        <Starfield />

        <group>
          <GameScene />
        </group>
      </Canvas>
    </div>
  );
}

export default App;
