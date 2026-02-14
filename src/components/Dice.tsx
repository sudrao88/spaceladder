import { useRef, useMemo, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

interface DiceProps {
    value: number | null;
    isRolling: boolean;
}

// Increased resolution for sharper text
const TEX_SIZE = 1024;

/**
 * Pre-generates all possible textures for the dice (Mars base, ROLL, and 1-6).
 * This avoids expensive canvas operations and texture uploads during gameplay.
 */
const generateDiceTextures = () => {
    // 1. Create Base Mars Assets
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = TEX_SIZE;
    colorCanvas.height = TEX_SIZE;
    const colorCtx = colorCanvas.getContext('2d')!;
    
    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = TEX_SIZE;
    heightCanvas.height = TEX_SIZE;
    const heightCtx = heightCanvas.getContext('2d')!;

    // Background - Mars Red
    colorCtx.fillStyle = '#C1440E'; 
    colorCtx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    heightCtx.fillStyle = '#808080';
    heightCtx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

    const drawCrater = (ctxC: CanvasRenderingContext2D, ctxH: CanvasRenderingContext2D, x: number, y: number, r: number, opacity: number) => {
        // Height Map
        ctxH.beginPath();
        ctxH.arc(x, y, r * 1.15, 0, Math.PI * 2);
        ctxH.fillStyle = '#A0A0A0';
        ctxH.fill();

        ctxH.beginPath();
        ctxH.arc(x, y, r, 0, Math.PI * 2);
        const hGrad = ctxH.createRadialGradient(x, y, 0, x, y, r);
        hGrad.addColorStop(0, '#202020');
        hGrad.addColorStop(0.7, '#505050');
        hGrad.addColorStop(0.95, '#808080');
        hGrad.addColorStop(1, '#A0A0A0');
        ctxH.fillStyle = hGrad;
        ctxH.fill();

        // Color Map
        ctxC.beginPath();
        ctxC.arc(x, y, r * 1.1, 0, Math.PI * 2);
        ctxC.fillStyle = `rgba(255, 200, 150, ${opacity * 0.3})`;
        ctxC.fill();

        ctxC.beginPath();
        ctxC.arc(x, y, r, 0, Math.PI * 2);
        const cGrad = ctxC.createRadialGradient(x, y, 0, x, y, r);
        // Darker red/brown for craters
        const shade = Math.floor(Math.random() * 40 + 60); 
        cGrad.addColorStop(0, `rgba(${shade}, ${shade * 0.3}, ${shade * 0.1}, ${opacity})`);
        cGrad.addColorStop(1, `rgba(${shade + 40}, ${(shade + 40) * 0.3}, ${(shade + 40) * 0.1}, ${opacity * 0.5})`);
        ctxC.fillStyle = cGrad;
        ctxC.fill();
    };

    // Scaled crater count and sizes relative to new TEX_SIZE
    for (let i = 0; i < 80; i++) {
        const x = Math.random() * TEX_SIZE;
        const y = Math.random() * TEX_SIZE;
        const r = Math.random() * (TEX_SIZE / 12) + 8; // Slightly larger minimum radius
        const opacity = Math.random() * 0.4 + 0.1;

        const wraps = [[0,0], [TEX_SIZE,0], [-TEX_SIZE,0], [0,TEX_SIZE], [0,-TEX_SIZE], [TEX_SIZE,TEX_SIZE], [TEX_SIZE,-TEX_SIZE], [-TEX_SIZE,TEX_SIZE], [-TEX_SIZE,-TEX_SIZE]];
        wraps.forEach(([ox, oy]) => {
            const tx = x + ox;
            const ty = y + oy;
            if (tx > -r*2 && tx < TEX_SIZE+r*2 && ty > -r*2 && ty < TEX_SIZE+r*2) {
                drawCrater(colorCtx, heightCtx, tx, ty, r, opacity);
            }
        });
    }

    // Apply noise
    const cData = colorCtx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
    const hData = heightCtx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
    for (let i = 0; i < cData.data.length; i += 4) {
        const n = (Math.random() - 0.5) * 15;
        const m = (Math.random() - 0.5) * 20;
        cData.data[i] += m; cData.data[i+1] += m; cData.data[i+2] += m;
        hData.data[i] += n; hData.data[i+1] += n; hData.data[i+2] += n;
    }
    colorCtx.putImageData(cData, 0, 0);
    heightCtx.putImageData(hData, 0, 0);

    // 2. Generate Texture Variants
    const variants: Record<string, { color: THREE.CanvasTexture, bump: THREE.CanvasTexture }> = {};
    const labels = [null, 'ROLL', '1', '2', '3', '4', '5', '6'];

    labels.forEach(label => {
        const cCanvas = document.createElement('canvas');
        cCanvas.width = TEX_SIZE; cCanvas.height = TEX_SIZE;
        const cCtx = cCanvas.getContext('2d')!;
        cCtx.drawImage(colorCanvas, 0, 0);

        const hCanvas = document.createElement('canvas');
        hCanvas.width = TEX_SIZE; hCanvas.height = TEX_SIZE;
        const hCtx = hCanvas.getContext('2d')!;
        hCtx.drawImage(heightCanvas, 0, 0);

        if (label) {
            // Scaled font sizes for 1024x1024 texture (double the previous values relative to canvas size)
            // Previous: 30/60 on 512 -> Now: 60/120 on 1024 to maintain relative visual size but higher resolution
            const fontSize = label === 'ROLL' ? 60 : 120; 
            const font = `900 ${fontSize}px "Iceland", sans-serif`;
            const cx = TEX_SIZE / 2;
            const cy = TEX_SIZE / 2;

            hCtx.textAlign = 'center'; hCtx.textBaseline = 'middle'; hCtx.font = font;
            hCtx.fillStyle = '#000000';
            hCtx.fillText(label, cx, cy);

            cCtx.textAlign = 'center'; cCtx.textBaseline = 'middle'; cCtx.font = font;
            
            // Scaled shadow offset
            cCtx.fillStyle = 'rgba(0, 0, 0, 0.8)'; // Shadow color
            cCtx.fillText(label, cx + 6, cy + 6); // Scaled offset for shadow
            cCtx.fillStyle = '#FFFFFF'; // Main text color set to White
            cCtx.fillText(label, cx, cy);
        }

        const cTex = new THREE.CanvasTexture(cCanvas);
        cTex.colorSpace = THREE.SRGBColorSpace;
        cTex.wrapS = cTex.wrapT = THREE.RepeatWrapping;
        // Improve texture filtering for sharpness
        cTex.minFilter = THREE.LinearMipMapLinearFilter;
        cTex.magFilter = THREE.LinearFilter;
        cTex.anisotropy = 16; // Max anisotropy for sharpness at angles
        
        const hTex = new THREE.CanvasTexture(hCanvas);
        hTex.wrapS = hTex.wrapT = THREE.RepeatWrapping;

        variants[label || 'BASE'] = { color: cTex, bump: hTex };
    });

    return variants;
};

export const Dice = memo(({ value, isRolling }: DiceProps) => {
    const groupRef = useRef<THREE.Group>(null);
    
    // Static textures generated once and reused
    const textureVariants = useMemo(() => generateDiceTextures(), []);
    
    // Select the active texture pair based on game state
    const activeTextures = useMemo(() => {
        if (isRolling) return textureVariants['BASE'];
        if (value === null) return textureVariants['ROLL'];
        return textureVariants[value.toString()] || textureVariants['BASE'];
    }, [isRolling, value, textureVariants]);

    useFrame((_, delta) => {
        if (!groupRef.current) return;

        if (isRolling) {
            groupRef.current.rotation.x += delta * 15;
            groupRef.current.rotation.y += delta * 12;
            groupRef.current.rotation.z += delta * 8;
        } else if (value !== null) {
            const smoothTime = 5;
            groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, 0, smoothTime, delta);
            groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, -Math.PI / 2, smoothTime, delta);
            groupRef.current.rotation.z = THREE.MathUtils.damp(groupRef.current.rotation.z, 0, smoothTime, delta);
        } else {
            groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, 0, 5, delta);
            groupRef.current.rotation.z = THREE.MathUtils.damp(groupRef.current.rotation.z, 0, 5, delta);
            groupRef.current.rotation.y -= delta * 0.5;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Reduced segments from 64 to 48 for better mobile performance without visual loss */}
            <Sphere args={[3.2, 48, 48]}>
                <meshStandardMaterial 
                    map={activeTextures.color}
                    bumpMap={activeTextures.bump}
                    bumpScale={0.2} 
                    roughness={0.6} 
                    metalness={0.0}
                    emissive="#FF4500"
                    emissiveIntensity={0.15} 
                />
            </Sphere>
        </group>
    );
});

Dice.displayName = 'Dice';
