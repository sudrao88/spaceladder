import { useRef, useEffect, useCallback, memo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import * as THREE from 'three';
import type { MapControls as MapControlsImpl } from 'three-stdlib';
import { useGameStore } from '../store/useGameStore';
import { getTilePosition } from '../utils/boardUtils';
import { activeRocketRef } from '../utils/sceneRefs';

// Constants
const BOARD_SIZE = 13;
const CLOSE_ZOOM_LEVEL_MIN = 35;
const CLOSE_ZOOM_LEVEL_MULTIPLIER = 2.5;

// Animation Constants
// Increased damping lambda for snappier follow
const CAMERA_DAMPING_LAMBDA = 5.0; 
const CAMERA_FOLLOW_LAMBDA = 8.0; 
const ZOOM_EPSILON = 0.05;
const POSITION_SNAP_EPSILON = 0.05;
const POSITION_COMPLETION_EPSILON = 0.1;
const MANUAL_MOVE_THRESHOLD = 0.5;

// Granular selectors to prevent re-renders
const selectPlayers = (s: ReturnType<typeof useGameStore.getState>) => s.players;
const selectCurrentPlayerIndex = (s: ReturnType<typeof useGameStore.getState>) => s.currentPlayerIndex;
const selectShouldFollow = (s: ReturnType<typeof useGameStore.getState>) => s.shouldFollowPlayer;
const selectShouldReset = (s: ReturnType<typeof useGameStore.getState>) => s.shouldResetCamera;

export const CameraController = memo(() => {
  const { camera, size, invalidate } = useThree();
  const controlsRef = useRef<MapControlsImpl>(null);
  
  // Store actions
  const setIsDefaultView = useGameStore(state => state.setIsDefaultView);
  const acknowledgeCameraReset = useGameStore(state => state.acknowledgeCameraReset);
  
  // Store state
  const shouldFollowPlayer = useGameStore(selectShouldFollow);
  const shouldResetCamera = useGameStore(selectShouldReset);
  const players = useGameStore(selectPlayers);
  const currentPlayerIndex = useGameStore(selectCurrentPlayerIndex);

  // Local state
  const lastIsDefaultRef = useRef(true);
  const isResettingRef = useRef(false);
  const targetVec = useRef(new THREE.Vector3());

  // Calculate the optimal "full board" zoom based on screen size
  const calculateDefaultZoom = useCallback(() => {
     const padding = 40;
     const availableWidth = Math.max(size.width - padding, 100);
     const availableHeight = Math.max(size.height - padding, 100);

     const zoomW = availableWidth / BOARD_SIZE;
     const zoomH = availableHeight / BOARD_SIZE;
     // Add a slight margin (0.95)
     return Math.min(zoomW, zoomH) * 0.95;
  }, [size.width, size.height]);

  const getCloseZoomLevel = useCallback((currentDefaultZoom: number) => {
    return Math.max(currentDefaultZoom * CLOSE_ZOOM_LEVEL_MULTIPLIER, CLOSE_ZOOM_LEVEL_MIN);
  }, []);

  // Sync internal state when following starts to prevent snap-back on resize
  useEffect(() => {
      if (shouldFollowPlayer) {
          lastIsDefaultRef.current = false;
      }
  }, [shouldFollowPlayer]);

  // Initial setup and resize handler
  useEffect(() => {
     const newZoom = calculateDefaultZoom();
     
     // Only force set if we are in "default view" mode. 
     // We DO NOT include shouldFollowPlayer in deps to avoid snapping when it changes.
     if (lastIsDefaultRef.current && !shouldFollowPlayer) {
         camera.zoom = newZoom;
         camera.position.set(0, 10, 0);
         camera.updateProjectionMatrix();

         if (controlsRef.current) {
            controlsRef.current.target.set(0, 0, 0);
            controlsRef.current.update();
         }
         invalidate(); 
     }
  }, [calculateDefaultZoom, camera, invalidate]); // Removed shouldFollowPlayer from deps
  
  // Handle reset trigger from store
  useEffect(() => {
    if (shouldResetCamera) {
      isResettingRef.current = true;
      acknowledgeCameraReset();
    }
  }, [shouldResetCamera, acknowledgeCameraReset]);

  // Main animation loop
  useFrame((_, delta) => {
    if (!controlsRef.current) return;

    // Use a capped delta to prevent huge jumps if the tab was inactive
    // Slightly more aggressive cap for smoother recovery
    const dt = Math.min(delta, 0.05);

    // 1. FOLLOW MODE
    if (shouldFollowPlayer && !isResettingRef.current) {
        const currentPlayer = players[currentPlayerIndex];
        
        if (currentPlayer) {
            let targetX = 0;
            let targetZ = 0;

            // Priority: Follow the active mesh for smooth animation tracking
            // We check activeRocketRef first which is updated via useLayoutEffect in Rocket.tsx
            if (activeRocketRef.current && currentPlayer.isMoving) {
                activeRocketRef.current.getWorldPosition(targetVec.current);
                targetX = targetVec.current.x;
                targetZ = targetVec.current.z;
            } else {
                // Fallback: Tile position
                // Use the memoized tile position helper
                const pos = getTilePosition(currentPlayer.position);
                targetX = pos[0];
                targetZ = pos[2];
            }

            // Exponential smoothing for position
            // Increased lambda for tighter tracking
            const alphaPos = 1 - Math.exp(-CAMERA_FOLLOW_LAMBDA * dt);
            
            controlsRef.current.target.x = THREE.MathUtils.lerp(controlsRef.current.target.x, targetX, alphaPos);
            controlsRef.current.target.z = THREE.MathUtils.lerp(controlsRef.current.target.z, targetZ, alphaPos);
            
            // Zoom interpolation
            const defaultZoom = calculateDefaultZoom();
            const targetZoom = getCloseZoomLevel(defaultZoom);
            const currentZoom = camera.zoom;

            if (Math.abs(currentZoom - targetZoom) > ZOOM_EPSILON) {
                // Slower zoom for less disorientation
                const alphaZoom = 1 - Math.exp(-CAMERA_DAMPING_LAMBDA * 0.8 * dt);
                camera.zoom = THREE.MathUtils.lerp(currentZoom, targetZoom, alphaZoom);
                camera.updateProjectionMatrix();
            }

            // Sync camera position immediately to avoid frame lag
            camera.position.x = controlsRef.current.target.x;
            camera.position.z = controlsRef.current.target.z;
        }
    } 
    
    // 2. RESET MODE
    else if (isResettingRef.current) {
        const targetZoom = calculateDefaultZoom();
        const alpha = 1 - Math.exp(-CAMERA_DAMPING_LAMBDA * dt);
        
        // Zoom
        if (Math.abs(camera.zoom - targetZoom) > ZOOM_EPSILON) {
            camera.zoom = THREE.MathUtils.lerp(camera.zoom, targetZoom, alpha);
            camera.updateProjectionMatrix();
        } else {
            camera.zoom = targetZoom;
            camera.updateProjectionMatrix();
        }

        // Pan to center (0,0,0)
        const cx = controlsRef.current.target.x;
        const cz = controlsRef.current.target.z;
        
        if (Math.abs(cx) > POSITION_SNAP_EPSILON || Math.abs(cz) > POSITION_SNAP_EPSILON) {
             controlsRef.current.target.x = THREE.MathUtils.lerp(cx, 0, alpha);
             controlsRef.current.target.z = THREE.MathUtils.lerp(cz, 0, alpha);
        } else {
             controlsRef.current.target.set(0, 0, 0);
        }

        // Sync camera
        camera.position.x = controlsRef.current.target.x;
        camera.position.z = controlsRef.current.target.z;

        // Check completion
        const zoomDone = Math.abs(camera.zoom - targetZoom) < ZOOM_EPSILON;
        const posDone = Math.abs(controlsRef.current.target.x) < POSITION_COMPLETION_EPSILON && Math.abs(controlsRef.current.target.z) < POSITION_COMPLETION_EPSILON;

        if (zoomDone && posDone) {
            isResettingRef.current = false;
            setIsDefaultView(true);
            lastIsDefaultRef.current = true;
        }
    }

    // Always update controls for damping to work during manual interaction
    controlsRef.current.update();
  });


  // Optimized event-driven check for manual movement
  const handleControlsChange = useCallback(() => {
      // If we are automating movement, don't interfere with "default view" logic here
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
  }, [shouldFollowPlayer, camera, calculateDefaultZoom, setIsDefaultView]);


  return (
       <MapControls
          ref={controlsRef}
          enableRotate={false}
          enableZoom={!shouldFollowPlayer && !isResettingRef.current}
          enablePan={!shouldFollowPlayer && !isResettingRef.current}
          minZoom={10}
          maxZoom={100}
          enableDamping={true} 
          dampingFactor={0.1}
          onChange={handleControlsChange}
       />
  );
});

CameraController.displayName = 'CameraController';
