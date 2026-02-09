import { useRef, useEffect, useCallback, memo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrthographicCamera, MapControls } from '@react-three/drei';
import { Board } from './components/Board';
import { Rocket } from './components/Rocket';
import { HUD } from './components/HUD';
import { useGameStore } from './store/useGameStore';
import { GameController } from './hooks/useGameController';
import type { MapControls as MapControlsType } from 'three-stdlib';

// Granular selector — only re-renders when players array reference changes
const selectPlayers = (s: ReturnType<typeof useGameStore.getState>) => s.players;

// Static values hoisted out of render to avoid re-allocation
const CAMERA_POSITION: [number, number, number] = [0, 10, 0];
const CAMERA_ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0];
const AMBIENT_INTENSITY = 1;
const DIR_LIGHT_POS: [number, number, number] = [5, 10, 5];
const DIR_LIGHT_INTENSITY = 0.5;
const BOARD_SIZE = 13;
const CANVAS_DPR: [number, number] = [1, 2];

const CameraController = memo(() => {
  const { camera, size } = useThree();
  const controlsRef = useRef<MapControlsType>(null);
  
  const setIsDefaultView = useGameStore(state => state.setIsDefaultView);
  const shouldResetCamera = useGameStore(state => state.shouldResetCamera);
  const acknowledgeCameraReset = useGameStore(state => state.acknowledgeCameraReset);

  // Keep track of last emitted state to avoid spamming the store
  const lastIsDefaultRef = useRef(true);

  const calculateDefaultZoom = useCallback(() => {
     const padding = 40;
     const availableWidth = Math.max(size.width - padding, 100);
     const availableHeight = Math.max(size.height - padding, 100);

     const zoomW = availableWidth / BOARD_SIZE;
     const zoomH = availableHeight / BOARD_SIZE;
     return Math.min(zoomW, zoomH) * 0.95;
  }, [size]);

  const fitToScreen = useCallback(() => {
     const newZoom = calculateDefaultZoom();
     camera.zoom = newZoom;
     camera.position.set(0, 10, 0);
     camera.updateProjectionMatrix();

     if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
     }
     
     setIsDefaultView(true);
     lastIsDefaultRef.current = true;
  }, [calculateDefaultZoom, camera, setIsDefaultView]);

  useEffect(() => {
     fitToScreen();
  }, [fitToScreen]);
  
  // Handle external reset trigger
  useEffect(() => {
    if (shouldResetCamera) {
      fitToScreen();
      acknowledgeCameraReset();
    }
  }, [shouldResetCamera, fitToScreen, acknowledgeCameraReset]);

  // Check if zoom/pan changed significantly from default
  useEffect(() => {
      const checkZoom = () => {
          if (!camera || !controlsRef.current) return;
          const defaultZoom = calculateDefaultZoom();
          const currentZoom = camera.zoom;
          const currentTarget = controlsRef.current.target;

          const zoomChanged = Math.abs(currentZoom - defaultZoom) > 0.1;
          const posChanged = Math.abs(currentTarget.x) > 0.5 || Math.abs(currentTarget.z) > 0.5;

          const isDefault = !zoomChanged && !posChanged;
          
          if (isDefault !== lastIsDefaultRef.current) {
             setIsDefaultView(isDefault);
             lastIsDefaultRef.current = isDefault;
          }
      };

      const interval = setInterval(checkZoom, 500);
      return () => clearInterval(interval);
  }, [camera, calculateDefaultZoom, setIsDefaultView]);


  return (
       <MapControls
          ref={controlsRef}
          enableRotate={false}
          enableZoom={true}
          enablePan={true}
          minZoom={10}
          maxZoom={100}
       />
  );
});

CameraController.displayName = 'CameraController';

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

        <group>
          <GameScene />
        </group>
      </Canvas>
    </div>
  );
}

export default App;
