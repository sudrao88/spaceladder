import { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrthographicCamera, MapControls, Html } from '@react-three/drei';
import { Board } from './components/Board';
import { Rocket } from './components/Rocket';
import { HUD } from './components/HUD';
import { useGameStore } from './store/useGameStore';
import { GameController } from './hooks/useGameController';
import type { MapControls as MapControlsType } from 'three-stdlib';

const CameraController = () => {
  const { camera, size } = useThree();
  const controlsRef = useRef<MapControlsType>(null);
  const [isDefaultView, setIsDefaultView] = useState(true);

  const calculateDefaultZoom = useCallback(() => {
     // Center the board (13x13 units) in the viewport
     const boardSize = 13;
     const padding = 40; 
     const availableWidth = Math.max(size.width - padding, 100); 
     const availableHeight = Math.max(size.height - padding, 100);
     
     const zoomW = availableWidth / boardSize;
     const zoomH = availableHeight / boardSize;
     return Math.min(zoomW, zoomH) * 0.95; 
  }, [size]);

  const fitToScreen = useCallback(() => {
     const newZoom = calculateDefaultZoom();
     camera.zoom = newZoom;
     // Center on (0,0,0)
     camera.position.set(0, 10, 0);
     camera.updateProjectionMatrix();
     
     if (controlsRef.current) {
        controlsRef.current.target.set(0,0,0);
        controlsRef.current.update();
     }
     setIsDefaultView(true);
  }, [calculateDefaultZoom, camera]);

  useEffect(() => {
     fitToScreen();
  }, [fitToScreen]); 

  // Check if zoom changed significantly from default
  useEffect(() => {
      const checkZoom = () => {
          if (!camera || !controlsRef.current) return;
          const defaultZoom = calculateDefaultZoom();
          const currentZoom = camera.zoom;
          const currentTarget = controlsRef.current.target;

          const zoomChanged = Math.abs(currentZoom - defaultZoom) > 0.1;
          const posChanged = Math.abs(currentTarget.x) > 0.5 || Math.abs(currentTarget.z) > 0.5;

          if (zoomChanged || posChanged) {
              setIsDefaultView(false);
          } else {
              setIsDefaultView(true);
          }
      };

      const interval = setInterval(checkZoom, 500);
      return () => clearInterval(interval);
  }, [camera, calculateDefaultZoom]);


  return (
     <>
       <MapControls 
          ref={controlsRef} 
          enableRotate={false} 
          enableZoom={true} 
          enablePan={true}
          minZoom={10}
          maxZoom={100}
       />
       
       {!isDefaultView && (
           <Html wrapperClass="pointer-events-none" fullscreen style={{ zIndex: 50 }}>
              <div className="absolute bottom-6 left-6 pointer-events-auto">
                 <button 
                    onClick={fitToScreen}
                    className="bg-gray-800/80 hover:bg-gray-700 text-white px-4 py-2 rounded shadow-lg border border-white/20 transition-all"
                 >
                    Reset View
                 </button>
              </div>
           </Html>
       )}
     </>
  );
};

function App() {
  const { players } = useGameStore();
  const { handleMovementComplete } = GameController();

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden select-none touch-none">
      {/* Landscape Enforcement Overlay */}
      <div className="md:hidden portrait:flex hidden fixed inset-0 z-[100] bg-black text-white items-center justify-center p-8 text-center">
          <p className="text-xl font-bold">Please rotate your device to landscape mode to play.</p>
      </div>

      <HUD />
      
      <Canvas shadows dpr={[1, 2]}>
        <OrthographicCamera 
            makeDefault 
            position={[0, 10, 0]} 
            near={0.1} 
            far={1000}
            rotation={[-Math.PI / 2, 0, 0]} 
        />
        
        <CameraController />
        
        <ambientLight intensity={1} />
        <directionalLight position={[5, 10, 5]} intensity={0.5} />
        
        <group position={[0, 0, 0]}>
            <Board />
            {players.map((player) => (
                <Rocket 
                    key={player.id} 
                    player={player} 
                    onMovementComplete={() => handleMovementComplete(player.id)}
                />
            ))}
        </group>
      </Canvas>
    </div>
  );
}

export default App;
