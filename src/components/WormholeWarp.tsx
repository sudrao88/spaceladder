import { memo, Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import { Board } from './Board';
import { Rocket } from './Rocket';
import { HUD } from './HUD';
import { Starfield } from './Starfield';
import { useGameStore } from '../store/useGameStore';
import { GameController } from '../hooks/useGameController';
import { CameraController } from './CameraController';
import { CanvasErrorBoundary } from './ErrorBoundary';
import { LandscapeEnforcer } from './shared';

// Granular selector — only re-renders when players array reference changes
const selectPlayers = (s: ReturnType<typeof useGameStore.getState>) => s.players;

// Static values hoisted out of render to avoid re-allocation
const CAMERA_POSITION: [number, number, number] = [0, 10, 0];
const CAMERA_ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0];
const AMBIENT_INTENSITY = 1;
const DIR_LIGHT_POS: [number, number, number] = [5, 10, 5];
const DIR_LIGHT_INTENSITY = 0.5;
// Increased max DPR from 2 to 2.5 to sharpen visuals on high-DPI screens
const CANVAS_DPR: [number, number] = [1, 2.5];

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

export const WormholeWarp = memo(() => {
  const containerRef = useRef<HTMLDivElement>(null!);

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-black overflow-hidden select-none touch-none">
      <LandscapeEnforcer />

      <HUD />

      <CanvasErrorBoundary>
        <Canvas
          shadows
          dpr={CANVAS_DPR}
          frameloop="always"
          performance={{ min: 0.5 }}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        >
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
});

WormholeWarp.displayName = 'WormholeWarp';
