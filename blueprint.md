# Wormhole Warp - Project Blueprint

## Overview
Wormhole Warp is a modern, 3D/2D web-based board game built with React, Three.js (React Three Fiber), and Tailwind CSS. It reimagines the classic "Snakes and Ladders" mechanic in a space theme, featuring rocket ships, wormholes, and a sleek dark aesthetic.

## Current Features & Implementation

### Core Gameplay
*   **Board:** 10x10 grid (100 tiles).
*   **Layout:** "Snake" pattern starting from Tile 1 at the Bottom-Left corner, winding up to Tile 100 at the Top-Left corner.
*   **Movement:** Players roll a dice and move automatically.
*   **Wormholes:** Random chance (25%) to trigger a "wormhole" upon landing, which can teleport the player forward (Boost) or backward (Glitch).
*   **Win Condition:** First player to reach Tile 100 wins.

### Visuals & UI
*   **View:** 2D Orthographic Top-Down view for a clear, board-game feel.
*   **Theme:** Dark space theme with neon accents (Cyan, Purple).
*   **Board Rendering:** 2D flat tiles with outlines and numbering.
*   **Player Tokens:** 
    *   Represented by Emojis (🚀, 🛰️, 👽, 🛸).
    *   Rendered as 3D Planes using `CanvasTexture` for crisp visibility and correct sorting in the 3D scene.
    *   Animated movement using `react-spring`.
*   **HUD (Heads-Up Display):**
    *   **Player List:** Top-Left corner, showing active player and positions.
    *   **Controls:** Right sidebar (compact width), containing the Dice and Roll button.
    *   **Dice:** A fully 3D animated dice embedded in the HUD using a separate `Canvas`.
*   **Responsiveness:**
    *   **Centering:** Board is always centered in the viewport.
    *   **Mobile:** Enforces landscape mode via an overlay on portrait screens.
    *   **Zoom:** "Reset View" button appears when the user pans/zooms away from the default view.

### Technical Stack
*   **Framework:** React (Vite).
*   **3D Engine:** @react-three/fiber, @react-three/drei.
*   **Animation:** @react-spring/three.
*   **State Management:** Zustand (persisted state).
*   **Styling:** Tailwind CSS.

## Recent Changes (Session Log)

1.  **Board Layout Overhaul:**
    *   Changed from 14x10 Spiral back to 10x10 Snake pattern.
    *   Aligned Tile 1 to Bottom-Left and Tile 100 to Top-Left.
    *   Centered the board in the 3D viewport (0,0,0).

2.  **UI/HUD Refinement:**
    *   Moved HUD controls to a smaller right sidebar (`w-40`).
    *   Replaced the simple "Roll" text with a 3D animated Dice component inside the HUD.
    *   Added player emojis to the HUD player list.

3.  **Player Token Upgrade:**
    *   Converted tokens from simple shapes to Emoji-based textures.
    *   Implemented `CanvasTexture` generation for Emojis to ensure they render correctly in the 3D scene without CSS layering issues.
    *   Removed text labels from the tokens on the board (kept in HUD).

4.  **Bug Fixes & Polish:**
    *   Fixed `useGameController` import error (Type-only import).
    *   Fixed HUD style conflict (shorthand vs longhand border properties).
    *   Ensured "Reset View" button position is stable.
