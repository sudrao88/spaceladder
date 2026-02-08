import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera } from '@react-three/drei';
import { Board } from './components/Board';
import { Rocket } from './components/Rocket';
import { HUD } from './components/HUD';
import { useGameStore } from './store/useGameStore';
import { GameController } from './hooks/useGameController';

function App() {
  const { players } = useGameStore();
  const { handleMovementComplete } = GameController();

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden select-none touch-none">
      <HUD />
      
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 10, 12]} fov={50} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} castShadow />
        <spotLight position={[-10, 15, 0]} angle={0.3} penumbra={1} intensity={2} castShadow color="#00ffff" />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
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

        {/* Orbit Controls restricted for gameplay feel */}
        <OrbitControls 
            enablePan={false} 
            minPolarAngle={0} 
            maxPolarAngle={Math.PI / 2.5}
            minDistance={8}
            maxDistance={25}
        />
      </Canvas>
    </div>
  );
}

export default App;
