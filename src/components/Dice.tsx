import { useRef, useEffect, useMemo, useState, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

interface DiceProps {
    value: number | null;
    isRolling: boolean;
}

// Resolution for the texture - High quality for crisp text
const TEX_SIZE = 1024;

// --- ASSET GENERATION ---
// Create the base moon surface (craters + noise)
// Returns two canvases: colorCanvas and heightCanvas (for bump map)
const createBaseMoonAssets = () => {
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = TEX_SIZE;
    colorCanvas.height = TEX_SIZE;
    const colorCtx = colorCanvas.getContext('2d');
    
    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = TEX_SIZE;
    heightCanvas.height = TEX_SIZE;
    const heightCtx = heightCanvas.getContext('2d');

    if (!colorCtx || !heightCtx) return null;

    // 1. Background
    // Color: Brighter Moon
    colorCtx.fillStyle = '#FFFFFF'; 
    colorCtx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    
    // Height: Mid-grey (surface level)
    heightCtx.fillStyle = '#808080';
    heightCtx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

    // 2. Craters
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * TEX_SIZE;
        const y = Math.random() * TEX_SIZE;
        const r = Math.random() * (TEX_SIZE / 10) + 10; // Varied sizes
        
        // --- Color Map ---
        colorCtx.beginPath();
        colorCtx.arc(x, y, r, 0, Math.PI * 2);
        // Lighter craters
        colorCtx.fillStyle = `rgba(200, 200, 200, ${Math.random() * 0.2})`;
        colorCtx.fill();
        
        // --- Height Map (Craters are depressions) ---
        heightCtx.beginPath();
        heightCtx.arc(x, y, r, 0, Math.PI * 2);
        // Gradient for rounded crater bottom
        const g = heightCtx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, '#404040'); // Deep center
        g.addColorStop(0.8, '#707070'); // Slope
        g.addColorStop(1, '#808080'); // Rim/Surface
        heightCtx.fillStyle = g;
        heightCtx.fill();
    }

    // 3. Noise for texture
    const cData = colorCtx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
    const hData = heightCtx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
    
    for (let i = 0; i < cData.data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 10; // Reduced noise for cleaner bright look
        
        // Color noise
        cData.data[i] = Math.min(255, Math.max(0, cData.data[i] + noise));
        cData.data[i+1] = Math.min(255, Math.max(0, cData.data[i+1] + noise));
        cData.data[i+2] = Math.min(255, Math.max(0, cData.data[i+2] + noise));

        // Height noise (roughness)
        const hNoise = noise * 1.5; 
        hData.data[i] = Math.min(255, Math.max(0, hData.data[i] + hNoise));
        hData.data[i+1] = Math.min(255, Math.max(0, hData.data[i+1] + hNoise));
        hData.data[i+2] = Math.min(255, Math.max(0, hData.data[i+2] + hNoise));
    }
    
    colorCtx.putImageData(cData, 0, 0);
    heightCtx.putImageData(hData, 0, 0);

    return { colorCanvas, heightCanvas };
};

export const Dice = memo(({ value, isRolling }: DiceProps) => {
    const groupRef = useRef<THREE.Group>(null);
    
    // Memoize expensive generation
    const baseAssets = useMemo(() => createBaseMoonAssets(), []);
    
    const [textures, setTextures] = useState<{ colorMap: THREE.CanvasTexture, bumpMap: THREE.CanvasTexture } | null>(null);

    // Regenerate textures when text/value changes
    useEffect(() => {
        if (!baseAssets) return;
        
        const { colorCanvas: baseColor, heightCanvas: baseHeight } = baseAssets;
        
        // Create working canvases
        const cCanvas = document.createElement('canvas');
        cCanvas.width = TEX_SIZE;
        cCanvas.height = TEX_SIZE;
        const cCtx = cCanvas.getContext('2d')!;
        cCtx.drawImage(baseColor, 0, 0);

        const hCanvas = document.createElement('canvas');
        hCanvas.width = TEX_SIZE;
        hCanvas.height = TEX_SIZE;
        const hCtx = hCanvas.getContext('2d')!;
        hCtx.drawImage(baseHeight, 0, 0);

        // Determine what text to carve
        let text = '';
        let fontSize = 200; // Default large
        
        if (!isRolling) {
             if (value !== null) {
                 text = value.toString();
                 fontSize = 250; 
             } else {
                 text = 'ROLL';
                 fontSize = 120;
             }
        }

        if (text) {
            const cx = TEX_SIZE / 2;
            const cy = TEX_SIZE / 2;
            const font = `900 ${fontSize}px "Iceland", "Arial Black", sans-serif`;

            // --- Draw on Height Map (Carve) ---
            hCtx.textAlign = 'center';
            hCtx.textBaseline = 'middle';
            hCtx.font = font;
            
            // We want a deep, sharp carve.
            hCtx.fillStyle = '#101010'; // Very deep carve (almost black in height map)
            hCtx.fillText(text, cx, cy);
            
            // --- Draw on Color Map (Visual depth cues) ---
            cCtx.textAlign = 'center';
            cCtx.textBaseline = 'middle';
            cCtx.font = font;
            
            // 1. Highlight on Bottom-Right edge (far wall catching light)
            cCtx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // Brighter highlight
            cCtx.fillText(text, cx + 4, cy + 4);
            
            // 2. Shadow on Top-Left edge (near wall casting shadow)
            cCtx.fillStyle = 'rgba(0, 0, 0, 0.7)'; // Darker shadow for more contrast
            cCtx.fillText(text, cx - 4, cy - 4);

            // 3. The floor of the carving (darker, shadowed moon dust)
            cCtx.fillStyle = '#333333'; // Darker text for better contrast
            cCtx.fillText(text, cx, cy);
        }

        // Create Textures
        const cTex = new THREE.CanvasTexture(cCanvas);
        cTex.colorSpace = THREE.SRGBColorSpace;
        const hTex = new THREE.CanvasTexture(hCanvas);

        setTextures({ colorMap: cTex, bumpMap: hTex });

        // Cleanup function for old textures
        return () => {
            cTex.dispose();
            hTex.dispose();
        };

    }, [baseAssets, value, isRolling]); // Re-run when these change

    // Frame update for rotation animation
    useFrame((_, delta) => {
        if (!groupRef.current) return;

        if (isRolling) {
            // Spin fast on multiple axes
            groupRef.current.rotation.x += delta * 15;
            groupRef.current.rotation.y += delta * 12;
            groupRef.current.rotation.z += delta * 8;
        } else {
             if (value !== null) {
                // When we have a value, we want to stop and show it.
                // Text is centered at UV (0.5, 0.5)
                // Assuming standard UV mapping where 0.5 is at -90 degrees Y rotation relative to camera Z
                const targetX = 0;
                const targetY = -Math.PI / 2; 
                const targetZ = 0;
                
                // Use Damp for smooth spring-like stop
                const smoothTime = 10;
                
                // Use THREE.MathUtils.damp for frame-rate independent smooth damping
                groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, targetX, smoothTime, delta);
                
                // Simple Y damp
                groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, targetY, smoothTime, delta);
                
                groupRef.current.rotation.z = THREE.MathUtils.damp(groupRef.current.rotation.z, targetZ, smoothTime, delta);
             } else {
                 // Gently damp X and Z to 0 to remove any tilt from rolling
                 groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, 0, 5, delta);
                 groupRef.current.rotation.z = THREE.MathUtils.damp(groupRef.current.rotation.z, 0, 5, delta);
                 
                 // Idle spin clockwise around Y
                 groupRef.current.rotation.y -= delta * 0.5;
             }
        }
    });

    return (
        <group ref={groupRef}>
            {/* High segment count for smooth bump mapping */}
            <Sphere args={[2.2, 64, 64]}>
                {textures && (
                    <meshStandardMaterial 
                        map={textures.colorMap}
                        bumpMap={textures.bumpMap}
                        bumpScale={0.15} // Depth of the carve
                        roughness={0.4} // Reduced roughness for a whiter, shinier look
                        metalness={0.0}
                        emissive="white"
                        emissiveIntensity={0.2} // Increased intensity for a brighter feel
                    />
                )}
            </Sphere>
        </group>
    );
});

Dice.displayName = 'Dice';
