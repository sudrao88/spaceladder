import { useRef, useEffect, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';

interface DiceProps {
    value: number | null;
    isRolling: boolean;
}

const SPRING_CONFIG = { mass: 2, tension: 150, friction: 40 };

// Pre-computed face positions/rotations (static, no allocations per render)
const FACE_1 = { position: [0, 0, 1.26] as const, rotation: undefined };
const FACE_6 = { position: [0, 0, -1.26] as const, rotation: [0, Math.PI, 0] as const };
const FACE_2 = { position: [0, 1.26, 0] as const, rotation: [-Math.PI / 2, 0, 0] as const };
const FACE_5 = { position: [0, -1.26, 0] as const, rotation: [Math.PI / 2, 0, 0] as const };
const FACE_3 = { position: [1.26, 0, 0] as const, rotation: [0, Math.PI / 2, 0] as const };
const FACE_4 = { position: [-1.26, 0, 0] as const, rotation: [0, -Math.PI / 2, 0] as const };

// Target rotation for each dice value
const TARGET_ROTATIONS: Record<number, [number, number]> = {
    1: [0, 0],
    2: [Math.PI / 2, 0],
    3: [0, -Math.PI / 2],
    4: [0, Math.PI / 2],
    5: [-Math.PI / 2, 0],
    6: [0, Math.PI],
};

const normalize = (current: number, target: number): number => {
    const cycle = Math.PI * 2;
    const currentMod = current % cycle;
    const diff = target - currentMod;
    if (diff > Math.PI) return current + diff - cycle;
    if (diff < -Math.PI) return current + diff + cycle;
    return current + diff;
};

export const Dice = memo(({ value, isRolling }: DiceProps) => {
    const [springs, api] = useSpring(() => ({
        rotation: [0, 0, 0],
        config: SPRING_CONFIG
    }));

    const rotationRef = useRef([0, 0, 0]);

    useFrame((_, delta) => {
        if (isRolling) {
             rotationRef.current[0] += delta * 15;
             rotationRef.current[1] += delta * 12;
             api.set({ rotation: rotationRef.current });
        }
    });

    useEffect(() => {
        if (!isRolling && value) {
            const [targetX, targetY] = TARGET_ROTATIONS[value] ?? [0, 0];

            const finalX = normalize(rotationRef.current[0], targetX);
            const finalY = normalize(rotationRef.current[1], targetY);
            const finalZ = normalize(rotationRef.current[2], 0);

            api.start({
                rotation: [finalX, finalY, finalZ],
                onChange: (result) => {
                    rotationRef.current = result.value.rotation as number[];
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

               <Text position={FACE_1.position} fontSize={1.5} color="#22d3ee" anchorX="center" anchorY="middle">1</Text>
               <Text position={FACE_6.position} rotation={FACE_6.rotation} fontSize={1.5} color="#22d3ee" anchorX="center" anchorY="middle">6</Text>
               <Text position={FACE_2.position} rotation={FACE_2.rotation} fontSize={1.5} color="#22d3ee" anchorX="center" anchorY="middle">2</Text>
               <Text position={FACE_5.position} rotation={FACE_5.rotation} fontSize={1.5} color="#22d3ee" anchorX="center" anchorY="middle">5</Text>
               <Text position={FACE_3.position} rotation={FACE_3.rotation} fontSize={1.5} color="#22d3ee" anchorX="center" anchorY="middle">3</Text>
               <Text position={FACE_4.position} rotation={FACE_4.rotation} fontSize={1.5} color="#22d3ee" anchorX="center" anchorY="middle">4</Text>
           </animated.group>
        </group>
    );
});

Dice.displayName = 'Dice';
