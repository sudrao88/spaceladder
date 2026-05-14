import { memo, Suspense, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import { Board } from '../components/Board';
import { Rocket } from '../components/Rocket';
import { Starfield } from '../components/Starfield';
import { CameraController } from '../components/CameraController';
import { CanvasErrorBoundary } from '../components/ErrorBoundary';
import { useGameStore } from '../store/useGameStore';
import { ReceiverStatusBanner } from './ReceiverStatusBanner';
import { useReceiverBridge } from '../cast/receiver/useReceiverBridge';

const selectPlayers = (s: ReturnType<typeof useGameStore.getState>) => s.players;

const CAMERA_POSITION: [number, number, number] = [0, 10, 0];
const CAMERA_ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0];
const CANVAS_DPR: [number, number] = [1, 2.5];

const ReceiverScene = memo(() => {
  const players = useGameStore(selectPlayers);
  // No-op: the receiver does not run wormhole / turn logic. It only mirrors
  // state pushed by the sender.
  const noop = useCallback(() => {}, []);

  return (
    <>
      <Board />
      {players.map((player) => (
        <Rocket key={player.id} player={player} onMovementComplete={noop} />
      ))}
    </>
  );
});

ReceiverScene.displayName = 'ReceiverScene';

const LoadingFallback = () => (
  <mesh>
    <planeGeometry args={[1, 1]} />
    <meshBasicMaterial color="#000000" />
  </mesh>
);

export const ReceiverApp = memo(() => {
  useReceiverBridge();

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none">
      <ReceiverStatusBanner />
      <CanvasErrorBoundary>
        <Canvas
          shadows
          dpr={CANVAS_DPR}
          frameloop="always"
          performance={{ min: 0.5 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
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
          <ambientLight intensity={1} />
          <directionalLight position={[5, 10, 5]} intensity={0.5} />
          <Starfield />
          <Suspense fallback={<LoadingFallback />}>
            <group>
              <ReceiverScene />
            </group>
          </Suspense>
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  );
});

ReceiverApp.displayName = 'ReceiverApp';
