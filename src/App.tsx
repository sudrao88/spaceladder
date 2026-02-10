import { useRef, useEffect, useCallback, memo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrthographicCamera, MapControls } from '@react-three/drei';
import { Board } from './components/Board';
import { Rocket } from './components/Rocket';
import { HUD } from './components/HUD';
import { Starfield } from './components/Starfield';
import { useGameStore } from './store/useGameStore';
import { GameController } from './hooks/useGameController';
import { getTilePosition } from './utils/boardUtils';
import type { MapControls as MapControlsType } from 'three-stdlib';
import * as THREE from 'three';

// Granular selector — only re-renders when players array reference changes
const selectPlayers = (s: ReturnType<typeof useGameStore.getState>) => s.players;
const selectCurrentPlayerIndex = (s: ReturnType<typeof useGameStore.getState>) => s.currentPlayerIndex;

// Static values hoisted out of render to avoid re-allocation
const CAMERA_POSITION: [number, number, number] = [0, 10, 0];
const CAMERA_ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0];
const AMBIENT_INTENSITY = 1;
const DIR_LIGHT_POS: [number, number, number] = [5, 10, 5];
const DIR_LIGHT_INTENSITY = 0.5;
const BOARD_SIZE = 13;
const CANVAS_DPR: [number, number] = [1, 2];

// Camera Constants
const CLOSE_ZOOM_LEVEL = 35; // How close to zoom when following player

const CameraController = memo(() => {
  const { camera, size } = useThree();
  const controlsRef = useRef<MapControlsType>(null);
  
  const setIsDefaultView = useGameStore(state => state.setIsDefaultView);
  const shouldResetCamera = useGameStore(state => state.shouldResetCamera);
  const acknowledgeCameraReset = useGameStore(state => state.acknowledgeCameraReset);
  
  const shouldFollowPlayer = useGameStore(state => state.shouldFollowPlayer);
  const players = useGameStore(selectPlayers);
  const currentPlayerIndex = useGameStore(selectCurrentPlayerIndex);

  // Keep track of last emitted state to avoid spamming the store
  const lastIsDefaultRef = useRef(true);
  
  // Track if we are currently animating a reset
  const isResettingRef = useRef(false);

  const calculateDefaultZoom = useCallback(() => {
     const padding = 40;
     const availableWidth = Math.max(size.width - padding, 100);
     const availableHeight = Math.max(size.height - padding, 100);

     const zoomW = availableWidth / BOARD_SIZE;
     const zoomH = availableHeight / BOARD_SIZE;
     return Math.min(zoomW, zoomH) * 0.95;
  }, [size]);

  // Initial fit
  useEffect(() => {
     const newZoom = calculateDefaultZoom();
     camera.zoom = newZoom;
     camera.position.set(0, 10, 0);
     camera.updateProjectionMatrix();

     if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
     }
  }, [calculateDefaultZoom, camera]);
  
  // Handle external reset trigger
  useEffect(() => {
    if (shouldResetCamera) {
      isResettingRef.current = true;
      acknowledgeCameraReset();
    }
  }, [shouldResetCamera, acknowledgeCameraReset]);

  // Camera Logic Loop (Follow + Smooth Reset)
  useFrame((state, delta) => {
    if (!controlsRef.current) return;

    // 1. FOLLOW MODE
    if (shouldFollowPlayer && !isResettingRef.current) {
        const currentPlayer = players[currentPlayerIndex];
        if (currentPlayer) {
            // Get position of current player
            const playerPos = getTilePosition(currentPlayer.position);
            const targetX = playerPos[0];
            const targetZ = playerPos[2];

            // Smoothly move controls target to player
            const dampSpeed = 3.0; 
            
            // Current target
            const cx = controlsRef.current.target.x;
            const cz = controlsRef.current.target.z;

            // Lerp target
            controlsRef.current.target.x = THREE.MathUtils.lerp(cx, targetX, dampSpeed * delta);
            controlsRef.current.target.z = THREE.MathUtils.lerp(cz, targetZ, dampSpeed * delta);
            
            // Smoothly interpolate zoom
            const currentZoom = camera.zoom;
            // Target zoom is closer
            const targetZoom = Math.min(CLOSE_ZOOM_LEVEL, 100); 

            if (Math.abs(currentZoom - targetZoom) > 0.1) {
                camera.zoom = THREE.MathUtils.lerp(currentZoom, targetZoom, dampSpeed * delta);
                camera.updateProjectionMatrix();
            }

            // Sync camera position to match target
            camera.position.x = controlsRef.current.target.x;
            camera.position.z = controlsRef.current.target.z;

            controlsRef.current.update();
        }
    } 
    
    // 2. RESET MODE (Smooth transition back to full board)
    else if (isResettingRef.current) {
        const targetZoom = calculateDefaultZoom();
        const targetPos = new THREE.Vector3(0, 0, 0);
        
        const dampSpeed = 3.0;

        // Interpolate Zoom
        if (Math.abs(camera.zoom - targetZoom) > 0.1) {
            camera.zoom = THREE.MathUtils.lerp(camera.zoom, targetZoom, dampSpeed * delta);
            camera.updateProjectionMatrix();
        } else {
            camera.zoom = targetZoom;
            camera.updateProjectionMatrix();
        }

        // Interpolate Target (Center of board)
        const cx = controlsRef.current.target.x;
        const cz = controlsRef.current.target.z;
        
        if (Math.abs(cx) > 0.05 || Math.abs(cz) > 0.05) {
             controlsRef.current.target.x = THREE.MathUtils.lerp(cx, 0, dampSpeed * delta);
             controlsRef.current.target.z = THREE.MathUtils.lerp(cz, 0, dampSpeed * delta);
        } else {
             controlsRef.current.target.set(0, 0, 0);
        }

        // Sync Camera Position
        camera.position.x = controlsRef.current.target.x;
        camera.position.z = controlsRef.current.target.z;
        
        controlsRef.current.update();

        // Check completion
        const zoomDone = Math.abs(camera.zoom - targetZoom) < 0.1;
        const posDone = Math.abs(controlsRef.current.target.x) < 0.1 && Math.abs(controlsRef.current.target.z) < 0.1;

        if (zoomDone && posDone) {
            isResettingRef.current = false;
            setIsDefaultView(true);
            lastIsDefaultRef.current = true;
        }
    }
  });


  // Check if zoom/pan changed significantly from default (only when NOT following and NOT resetting)
  useEffect(() => {
      const checkZoom = () => {
          if (shouldFollowPlayer || isResettingRef.current) return;

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
  }, [camera, calculateDefaultZoom, setIsDefaultView, shouldFollowPlayer]);


  return (
       <MapControls
          ref={controlsRef}
          enableRotate={false}
          enableZoom={!shouldFollowPlayer && !isResettingRef.current} // Disable manual input during auto-movement
          enablePan={!shouldFollowPlayer && !isResettingRef.current}
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

        <Starfield />

        <group>
          <GameScene />
        </group>
      </Canvas>
    </div>
  );
}

export default App;
