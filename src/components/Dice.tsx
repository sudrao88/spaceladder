import { useRef, useMemo, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

interface DiceProps {
    value: number | null;
    isRolling: boolean;
}

const TEX_SIZE = 1024;

/**
 * Pre-generates high-fidelity procedural textures for a "White Pearl Cosmic" dice.
 * Pushes the visual limits using multi-layered canvas effects.
 */
const generateDiceTextures = () => {
    // 1. Create Base Layer (White Pearl & Marble base)
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = TEX_SIZE;
    colorCanvas.height = TEX_SIZE;
    const colorCtx = colorCanvas.getContext('2d')!;
    
    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = TEX_SIZE;
    heightCanvas.height = TEX_SIZE;
    const heightCtx = heightCanvas.getContext('2d')!;

    // Background — Bright Full Moon. Pure white core with a barely-perceptible
    // cool-grey edge so the sphere reads as round without dulling the brightness.
    const bgGrad = colorCtx.createRadialGradient(TEX_SIZE/2, TEX_SIZE/2, 0, TEX_SIZE/2, TEX_SIZE/2, TEX_SIZE);
    bgGrad.addColorStop(0, '#ffffff');   // Pure white center
    bgGrad.addColorStop(0.55, '#f8f9fb'); // Near-white
    bgGrad.addColorStop(1, '#e4e6ec');   // Faint cool grey edge
    colorCtx.fillStyle = bgGrad;
    colorCtx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    
    heightCtx.fillStyle = '#808080';
    heightCtx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

    // Layer 1: Maria patches — soft neutral-grey blotches simulating the moon's
    // dark "seas". Two close cool-grey tones at low alpha for subtle variation.
    colorCtx.globalAlpha = 0.18;
    for (let i = 0; i < 22; i++) {
        colorCtx.beginPath();
        const mariaAlpha = Math.random() * 0.35 + 0.25;
        colorCtx.strokeStyle = Math.random() > 0.5
            ? `rgba(150, 155, 168, ${mariaAlpha})`   // mid cool grey
            : `rgba(170, 174, 184, ${mariaAlpha})`;  // light cool grey
        colorCtx.lineWidth = Math.random() * 24 + 6;
        let x = Math.random() * TEX_SIZE;
        let y = Math.random() * TEX_SIZE;
        colorCtx.moveTo(x, y);
        for (let j = 0; j < 6; j++) {
            x += (Math.random() - 0.5) * 400;
            y += (Math.random() - 0.5) * 400;
            colorCtx.lineTo(x, y);
        }
        colorCtx.stroke();
    }
    colorCtx.globalAlpha = 1.0;

    // Layer 2: Surface flecks — fine, neutral cool-grey speckle that adds subtle
    // texture to the regolith without introducing chroma. Density reduced because
    // dense specks would just noise up a bright base.
    for (let i = 0; i < 800; i++) {
        const x = Math.random() * TEX_SIZE;
        const y = Math.random() * TEX_SIZE;
        const size = Math.random() * 1.2 + 0.3;
        const opacity = Math.random() * 0.4 + 0.2;
        colorCtx.fillStyle = `rgba(190, 195, 205, ${opacity})`;
        colorCtx.beginPath();
        colorCtx.arc(x, y, size, 0, Math.PI * 2);
        colorCtx.fill();
    }

    const drawCrater = (ctxC: CanvasRenderingContext2D, ctxH: CanvasRenderingContext2D, x: number, y: number, r: number, opacity: number) => {
        // Height Map - Crisp Deep Craters
        ctxH.beginPath();
        ctxH.arc(x, y, r * 1.1, 0, Math.PI * 2);
        ctxH.fillStyle = '#B0B0B0'; // Rim
        ctxH.fill();

        ctxH.beginPath();
        ctxH.arc(x, y, r, 0, Math.PI * 2);
        const hGrad = ctxH.createRadialGradient(x, y, 0, x, y, r);
        hGrad.addColorStop(0, '#101010'); // Deep center
        hGrad.addColorStop(0.7, '#606060');
        hGrad.addColorStop(1, '#808080');
        ctxH.fillStyle = hGrad;
        ctxH.fill();

        // Color Map — Classic lunar crater: bright white rim highlight, neutral grey
        // depression. No colour tint so it reads as a real moon crater.
        ctxC.beginPath();
        ctxC.arc(x, y, r * 1.15, 0, Math.PI * 2);
        ctxC.fillStyle = `rgba(255, 255, 255, ${opacity * 0.6})`; // Bright white rim
        ctxC.fill();

        ctxC.beginPath();
        ctxC.arc(x, y, r, 0, Math.PI * 2);
        const cGrad = ctxC.createRadialGradient(x, y, 0, x, y, r);

        // Crater interior: dark cool grey center → mid grey → transparent fade
        cGrad.addColorStop(0, `rgba(70, 75, 88, ${opacity * 0.85})`);
        cGrad.addColorStop(0.6, `rgba(140, 145, 158, ${opacity * 0.45})`);
        cGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctxC.fillStyle = cGrad;
        ctxC.fill();

        // Inner spark — bright white pinpoint highlight.
        if (Math.random() > 0.8) {
            ctxC.fillStyle = '#ffffff';
            ctxC.globalAlpha = 0.6;
            ctxC.beginPath();
            ctxC.arc(x + (Math.random()-0.5)*r, y + (Math.random()-0.5)*r, r*0.15, 0, Math.PI*2);
            ctxC.fill();
            ctxC.globalAlpha = 1.0;
        }
    };

    // Distribute Craters
    for (let i = 0; i < 80; i++) {
        const x = Math.random() * TEX_SIZE;
        const y = Math.random() * TEX_SIZE;
        const r = Math.random() * (TEX_SIZE / 16) + 8; 
        const opacity = Math.random() * 0.4 + 0.2;

        const wraps = [[0,0], [TEX_SIZE,0], [-TEX_SIZE,0], [0,TEX_SIZE], [0,-TEX_SIZE]];
        wraps.forEach(([ox, oy]) => {
            const tx = x + ox;
            const ty = y + oy;
            if (tx > -r*2 && tx < TEX_SIZE+r*2 && ty > -r*2 && ty < TEX_SIZE+r*2) {
                drawCrater(colorCtx, heightCtx, tx, ty, r, opacity);
            }
        });
    }

    // 2. Generate Texture Variants
    const variants: Record<string, { color: THREE.CanvasTexture, bump: THREE.CanvasTexture, emissive: THREE.CanvasTexture }> = {};
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

        // Emissive canvas — solid black baseline so non-glyph texels emit nothing.
        // The glyph is painted pure white below (if a label exists), making the text
        // self-lit and unaffected by scene lighting.
        const eCanvas = document.createElement('canvas');
        eCanvas.width = TEX_SIZE; eCanvas.height = TEX_SIZE;
        const eCtx = eCanvas.getContext('2d')!;
        eCtx.fillStyle = '#000000';
        eCtx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

        if (label) {
            // Further reduced font sizes as requested - Reduced from 80/180 to 50/110
            const fontSize = label === 'ROLL' ? 50 : 110;
            const font = `900 ${fontSize}px "Iceland", sans-serif`;
            const cx = TEX_SIZE / 2;
            const cy = TEX_SIZE / 2;

            // Height mapping for text depth
            hCtx.textAlign = 'center'; hCtx.textBaseline = 'middle'; hCtx.font = font;
            hCtx.shadowColor = 'rgba(0,0,0,0.5)';
            hCtx.shadowBlur = 10;
            hCtx.fillStyle = '#000000';
            hCtx.fillText(label, cx, cy);

            // White numerals on the bright moon — readability comes from the dark
            // drop-shadow underneath, which acts as the de-facto outline.
            cCtx.textAlign = 'center'; cCtx.textBaseline = 'middle'; cCtx.font = font;

            // White halo stroke (subtle bloom)
            cCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            cCtx.lineWidth = 6;
            cCtx.strokeText(label, cx, cy);

            // Dark drop-shadow — bumped from 0.4 → 0.5 so the white glyph still
            // reads against the white surface via the shadowed edge.
            cCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            cCtx.shadowBlur = 8;
            cCtx.shadowOffsetX = 2;
            cCtx.shadowOffsetY = 2;

            // Main fill — pure white
            cCtx.fillStyle = '#ffffff';
            cCtx.fillText(label, cx, cy);

            // Bevel — also white; the layer is kept for structure parity but is
            // a visual no-op since fill is already max-luminance.
            cCtx.shadowBlur = 0;
            cCtx.shadowOffsetX = 0;
            cCtx.shadowOffsetY = 0;
            cCtx.fillStyle = '#ffffff';
            cCtx.fillText(label, cx - 1, cy - 1);

            // Emissive map — pure white glyph on the black canvas. No stroke, no
            // shadow, no bevel: a crisp shape that emits independent of lighting.
            eCtx.textAlign = 'center';
            eCtx.textBaseline = 'middle';
            eCtx.font = font;
            eCtx.fillStyle = '#ffffff';
            eCtx.fillText(label, cx, cy);
        }

        const cTex = new THREE.CanvasTexture(cCanvas);
        cTex.colorSpace = THREE.SRGBColorSpace;
        cTex.wrapS = cTex.wrapT = THREE.RepeatWrapping;
        cTex.generateMipmaps = true;
        cTex.minFilter = THREE.LinearMipMapLinearFilter;
        cTex.magFilter = THREE.LinearFilter;
        cTex.anisotropy = 16;
        
        const hTex = new THREE.CanvasTexture(hCanvas);
        hTex.wrapS = hTex.wrapT = THREE.RepeatWrapping;

        const eTex = new THREE.CanvasTexture(eCanvas);
        eTex.colorSpace = THREE.SRGBColorSpace;
        eTex.wrapS = eTex.wrapT = THREE.RepeatWrapping;
        eTex.generateMipmaps = true;
        eTex.minFilter = THREE.LinearMipMapLinearFilter;
        eTex.magFilter = THREE.LinearFilter;
        eTex.anisotropy = 16;

        variants[label || 'BASE'] = { color: cTex, bump: hTex, emissive: eTex };
    });

    return variants;
};

export const Dice = memo(({ value, isRolling }: DiceProps) => {
    const groupRef = useRef<THREE.Group>(null);
    const textureVariants = useMemo(() => generateDiceTextures(), []);
    
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
            <Sphere args={[3.2, 64, 64]}> 
                <meshStandardMaterial
                    map={activeTextures.color}
                    bumpMap={activeTextures.bump}
                    emissiveMap={activeTextures.emissive}
                    bumpScale={0.25} // Crater dimples cast real shadows under directional light
                    roughness={0.08} // Glassy pearl finish
                    metalness={0.15} // Pearlescent sheen
                    emissive="#ffffff" // Multiplied per-texel by emissiveMap (black elsewhere, white on glyph)
                    emissiveIntensity={1.0} // Glyph emits at full white regardless of scene lighting
                />
            </Sphere>
        </group>
    );
});

Dice.displayName = 'Dice';
