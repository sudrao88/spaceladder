# Spaceladder Game - Blueprint

## Overview

Spaceladder is an interactive, space-themed board game built with React. This document outlines the project's architecture, components, and the plan for its deployment.

## Project Outline

- **Framework:** React with TypeScript
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **3D Graphics & Animations:** React Three Fiber, React Spring, Framer Motion
- **Core Components:**
    - `Board`: Renders the game board with individual tiles.
    - `Rocket`: Represents the player's piece on the board.
    - `Dice`: A clickable component to simulate a dice roll.
    - `HUD`: Displays game information like the current roll, player position, and messages.
    - `Starfield`: A background component creating a sense of movement through space.
    - `WormholeDialog`: A modal for handling wormhole interactions.
    - `CollisionDialog`: A modal handling interactions when two players land on the same tile.
    - `CameraController`: Handles camera movement, following players, and resetting views.
- **State Management (`useGameStore.ts`):**
    - `players`: Array of player objects.
    - `currentPlayerIndex`: Index of the current player.
    - `gameStatus`: Current state of the game (setup, playing, finished).
    - `cameraState`: Flags for controlling camera behavior (follow, reset, default view).
    - `pendingCollision`: State for tracking active collisions between players.
- **Game Logic (`useGameController.ts`):**
    - Orchestrates the game flow, responding to player actions.
    - Handles dice rolls, player movement, and interactions with special tiles like wormholes.
    - Handles player-to-player collisions.

## Recent Changes

### Visual Enhancements
- **Vibrant Cosmic Tiles:** Updated the board tiles with a bright, space-themed palette featuring Electric Blue, Electric Purple, Vivid Cyan, and Hot Pink.
- **High-Contrast Board Numbers:** Changed tile numbers and borders to crisp white for better legibility against the new vibrant backgrounds.
- **White Pearl Cosmic Dice:** Pushed the visual limits of the dice with a high-fidelity "White Pearl" theme. Features procedural marble veining, ultra-fine stardust sparkles, high-resolution craters, and a glassy/metallic finish.
- **Sharpened Visuals:** Increased texture resolution for the dice to 1024x1024 and bumped the global Canvas DPR to 2.5 for crisp rendering on high-density displays.

### Collision System & UI Fixes
- **Collision Handling:** Added a `CollisionDialog` to manage what happens when two players end up on the same tile. One player "holds position" while the other is "ejected" back to a previous tile.
- **Mobile UI Fixes:**
    - Updated `CollisionDialog` to handle small vertical screens.
    - Added `max-h-[90vh]` and `overflow-y-auto` to ensure the "Eject!" button is always accessible.

### Performance Optimizations
- **Starfield Optimization:** GPU-accelerated custom `shaderMaterial` with 3000 stars.
- **Board Optimization:** Implemented `InstancedMesh` for tiles and merged border geometries.
- **Rocket Optimization:** Global texture caching for emoji textures.

## Deployment Plan

- **Build Tool:** Vite
- **Deployment Target:** Firebase Hosting
- **Steps:**
    1.  Run `npm run build` to compile the TypeScript code and package the application for production.
    2.  Deploy the contents of the `dist` directory to Firebase Hosting.
