import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';

interface DiceProps {
    value: number | null;
    isRolling: boolean;
}

export const Dice = ({ value, isRolling }: DiceProps) => {
    // Rotation state
    const [springs, api] = useSpring(() => ({
        rotation: [0, 0, 0],
        config: { mass: 2, tension: 150, friction: 40 }
    }));

    // We use a ref to track current rotation for smooth transition
    const rotationRef = useRef([0, 0, 0]);

    useFrame((_, delta) => {
        if (isRolling) {
             // Continuous rotation
             rotationRef.current[0] += delta * 15;
             rotationRef.current[1] += delta * 12;
             
             // Directly set rotation on the spring (immediate) to bypass spring physics for the spin
             // @ts-expect-error react-spring types for api.set are complex
             api.set({ rotation: rotationRef.current });
        }
    });

    useEffect(() => {
        if (!isRolling && value) {
            // Determine target rotation based on value
            // We want the face 'value' to be pointing +Z (towards camera)
            
            // Layout:
            // Front (+Z): 1
            // Back (-Z): 6
            // Top (+Y): 2
            // Bottom (-Y): 5
            // Right (+X): 3
            // Left (-X): 4
            
            let targetX = 0;
            let targetY = 0;
            
            switch(value) {
                case 1: targetX = 0; targetY = 0; break;
                case 6: targetX = 0; targetY = Math.PI; break; // Rotate Y 180
                case 2: targetX = Math.PI/2; targetY = 0; break; // Rotate X 90 (Top comes front)
                case 5: targetX = -Math.PI/2; targetY = 0; break; // Rotate X -90
                case 3: targetX = 0; targetY = -Math.PI/2; break; // Rotate Y -90
                case 4: targetX = 0; targetY = Math.PI/2; break; // Rotate Y 90
            }

            // We need to find the multiple of 2PI closest to current rotationRef
            // to avoid spinning back wildly.
            
            const normalize = (current: number, target: number) => {
                const cycle = Math.PI * 2;
                const currentMod = current % cycle;
                const diff = target - currentMod;
                // Find shortest path
                if (diff > Math.PI) return current + diff - cycle;
                if (diff < -Math.PI) return current + diff + cycle;
                return current + diff;
            };

            const finalX = normalize(rotationRef.current[0], targetX);
            const finalY = normalize(rotationRef.current[1], targetY);
            const finalZ = normalize(rotationRef.current[2], 0); // Always 0 for Z

            // Animate to final
            api.start({
                rotation: [finalX, finalY, finalZ],
                onChange: (result) => {
                    // Keep ref in sync
                    const r = result.value.rotation as number[];
                    rotationRef.current = r;
                }
            });
        }
    }, [isRolling, value, api]);

    return (
        <group>
           {/* @ts-expect-error react-spring animated props */}
           <animated.group rotation={springs.rotation}>
               <RoundedBox args={[2.5, 2.5, 2.5]} radius={0.2} smoothness={4}>
                   <meshStandardMaterial color="#1f2937" roughness={0.3} metalness={0.6} />
               </RoundedBox>
               
               <Text position={[0, 0, 1.26]} fontSize={1.5} color="#22d3ee" anchorX="center" anchorY="middle">1</Text>
               <Text position={[0, 0, -1.26]} rotation={[0, Math.PI, 0]} fontSize={1.5} color="#22d3ee" anchorX="center" anchorY="middle">6</Text>
               <Text position={[0, 1.26, 0]} rotation={[-Math.PI/2, 0, 0]} fontSize={1.5} color="#22d3ee" anchorX="center" anchorY="middle">2</Text>
               <Text position={[0, -1.26, 0]} rotation={[Math.PI/2, 0, 0]} fontSize={1.5} color="#22d3ee" anchorX="center" anchorY="middle">5</Text>
               <Text position={[1.26, 0, 0]} rotation={[0, Math.PI/2, 0]} fontSize={1.5} color="#22d3ee" anchorX="center" anchorY="middle">3</Text>
               <Text position={[-1.26, 0, 0]} rotation={[0, -Math.PI/2, 0]} fontSize={1.5} color="#22d3ee" anchorX="center" anchorY="middle">4</Text>
           </animated.group>
        </group>
    );
}
