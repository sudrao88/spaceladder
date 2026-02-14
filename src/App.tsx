import { memo, Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import { Board } from './components/Board';
import { Rocket } from './components/Rocket';
import { HUD } from './components/HUD';
import { Starfield } from './components/Starfield';
import { useGameStore } from './store/useGameStore';
import { GameController } from './hooks/useGameController';
import { CameraController } from './components/CameraController';
import { CanvasErrorBoundary } from './components/ErrorBoundary';

// Granular selector — only re-renders when players array reference changes
const selectPlayers = (s: ReturnType<typeof useGameStore.getState>) => s.players;

// Static values hoisted out of render to avoid re-allocation
const CAMERA_POSITION: [number, number, number] = [0, 10, 0];
const CAMERA_ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0];
const AMBIENT_INTENSITY = 1;
const DIR_LIGHT_POS: [number, number, number] = [5, 10, 5];
const DIR_LIGHT_INTENSITY = 0.5;
// Capped DPR to 2 to balance sharpness on high-DPI screens with mobile performance
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
          onMovementComplete={handleMovementComplete}
        />
      ))}
    </>
  );
});

GameScene.displayName = 'GameScene';

const LoadingFallback = () => (
  <mesh>
    <planeGeometry args={[1, 1]} />
    <meshBasicMaterial color="#000000" />
  </mesh>
);

function App() {
  const containerRef = useRef<HTMLDivElement>(null!);

  return (
    // Changed bg-gray-900 to bg-black for pitch black background
    <div ref={containerRef} className="relative w-full h-screen bg-black overflow-hidden select-none touch-none">
      {/* Landscape Enforcement Overlay */}
      <div className="landscape-enforce fixed inset-0 z-[100] bg-black text-white items-center justify-center p-8 text-center">
          <p className="text-xl font-bold">Please rotate your device to landscape mode to play.</p>
      </div>

      <HUD />

      <CanvasErrorBoundary>
        <Canvas
          shadows
          dpr={CANVAS_DPR}
          frameloop="always" 
          performance={{ min: 0.5 }} // Allow downgrading quality if FPS drops
          gl={{ antialias: true, powerPreference: "high-performance" }} // Enabled antialias and requested high performance
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        >
          {/* Explicitly set Three.js background to black to match DOM container */}
          <color attach="background" args={['#000000']} />

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

          <Suspense fallback={<LoadingFallback />}>
            <group>
              <GameScene />
            </group>
          </Suspense>
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  );
}

export default App;
