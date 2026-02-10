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
const CLOSE_ZOOM_LEVEL_MIN = 35; 
const CLOSE_ZOOM_LEVEL_MULTIPLIER = 2.5;

// Animation Constants - REDUCED SPEEDS FOR SMOOTHER FEEL
const CAMERA_DAMPING_SPEED = 1.5; // Reduced from 3.0
const CAMERA_FOLLOW_SPEED_MULTIPLIER = 1.2; // Adjusted relative speed
const ZOOM_EPSILON = 0.1;
const POSITION_SNAP_EPSILON = 0.05;
const POSITION_COMPLETION_EPSILON = 0.1;
const MANUAL_MOVE_THRESHOLD = 0.5;

// Use a function to calculate zoom level to ensure we are always "zooming in" relative to the current view size.
const getCloseZoomLevel = (currentDefaultZoom: number) => {
    return Math.max(currentDefaultZoom * CLOSE_ZOOM_LEVEL_MULTIPLIER, CLOSE_ZOOM_LEVEL_MIN);
};

// GLOBAL REF to track the active rocket mesh for camera following
// This is a bit of a hack to bridge the gap between React state and the Three.js scene graph 
// without complex context passing or imperative handles for every rocket.
// Since only one player moves at a time, we can track the "active" mesh.
export const activeRocketRef: React.MutableRefObject<THREE.Group | null> = { current: null };


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
  useFrame((_state, delta) => {
    if (!controlsRef.current) return;

    // 1. FOLLOW MODE
    if (shouldFollowPlayer && !isResettingRef.current) {
        const currentPlayer = players[currentPlayerIndex];
        
        if (currentPlayer) {
            let targetX, targetZ;

            // PREFERRED: Follow the actual rocket mesh if available (handles animation interpolation)
            if (activeRocketRef.current && currentPlayer.isMoving) {
                const worldPos = new THREE.Vector3();
                activeRocketRef.current.getWorldPosition(worldPos);
                targetX = worldPos.x;
                targetZ = worldPos.z;
            } else {
                // FALLBACK: Follow the target tile position (teleport, static state, etc.)
                const playerPos = getTilePosition(currentPlayer.position);
                targetX = playerPos[0];
                targetZ = playerPos[2];
            }

            // Smoothly move controls target to player
            
            // Current target
            const cx = controlsRef.current.target.x;
            const cz = controlsRef.current.target.z;

            // Lerp target
            // Use a slightly faster damping speed for following the mesh to keep it in frame
            const followSpeed = CAMERA_DAMPING_SPEED * CAMERA_FOLLOW_SPEED_MULTIPLIER; 
            controlsRef.current.target.x = THREE.MathUtils.lerp(cx, targetX, followSpeed * delta);
            controlsRef.current.target.z = THREE.MathUtils.lerp(cz, targetZ, followSpeed * delta);
            
            // Smoothly interpolate zoom
            const currentZoom = camera.zoom;
            // Calculate target zoom dynamically based on screen size
            const defaultZoom = calculateDefaultZoom();
            const targetZoom = getCloseZoomLevel(defaultZoom);

            if (Math.abs(currentZoom - targetZoom) > ZOOM_EPSILON) {
                // Slower zoom interpolation for smoother effect
                camera.zoom = THREE.MathUtils.lerp(currentZoom, targetZoom, CAMERA_DAMPING_SPEED * 0.8 * delta);
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
        
        // Interpolate Zoom
        if (Math.abs(camera.zoom - targetZoom) > ZOOM_EPSILON) {
            camera.zoom = THREE.MathUtils.lerp(camera.zoom, targetZoom, CAMERA_DAMPING_SPEED * delta);
            camera.updateProjectionMatrix();
        } else {
            camera.zoom = targetZoom;
            camera.updateProjectionMatrix();
        }

        // Interpolate Target (Center of board)
        const cx = controlsRef.current.target.x;
        const cz = controlsRef.current.target.z;
        
        if (Math.abs(cx) > POSITION_SNAP_EPSILON || Math.abs(cz) > POSITION_SNAP_EPSILON) {
             controlsRef.current.target.x = THREE.MathUtils.lerp(cx, 0, CAMERA_DAMPING_SPEED * delta);
             controlsRef.current.target.z = THREE.MathUtils.lerp(cz, 0, CAMERA_DAMPING_SPEED * delta);
        } else {
             controlsRef.current.target.set(0, 0, 0);
        }

        // Sync Camera Position
        camera.position.x = controlsRef.current.target.x;
        camera.position.z = controlsRef.current.target.z;
        
        controlsRef.current.update();

        // Check completion
        const zoomDone = Math.abs(camera.zoom - targetZoom) < ZOOM_EPSILON;
        const posDone = Math.abs(controlsRef.current.target.x) < POSITION_COMPLETION_EPSILON && Math.abs(controlsRef.current.target.z) < POSITION_COMPLETION_EPSILON;

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

          const zoomChanged = Math.abs(currentZoom - defaultZoom) > ZOOM_EPSILON;
          const posChanged = Math.abs(currentTarget.x) > MANUAL_MOVE_THRESHOLD || Math.abs(currentTarget.z) > MANUAL_MOVE_THRESHOLD;

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
