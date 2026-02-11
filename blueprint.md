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
    - `CollisionDialog`: **NEW** A modal handling interactions when two players land on the same tile.
    - `CameraController`: Handles camera movement, following players, and resetting views.
- **State Management (`useGameStore.ts`):**
    - `players`: Array of player objects.
    - `currentPlayerIndex`: Index of the current player.
    - `gameStatus`: Current state of the game (setup, playing, finished).
    - `cameraState`: Flags for controlling camera behavior (follow, reset, default view).
    - `pendingCollision`: **NEW** State for tracking active collisions between players.
- **Game Logic (`useGameController.ts`):**
    - Orchestrates the game flow, responding to player actions.
    - Handles dice rolls, player movement, and interactions with special tiles like wormholes.
    - Handles player-to-player collisions.

## Recent Changes

### Collision System & UI Fixes
- **Collision Handling:** Added a `CollisionDialog` to manage what happens when two players end up on the same tile. One player "holds position" while the other is "ejected" back to a previous tile.
- **Mobile UI Fixes:**
    - Updated `CollisionDialog` to handle small vertical screens.
    - Added `max-h-[90vh]` and `overflow-y-auto` to ensure the "Eject!" button is always accessible.
    - Styled with custom scrollbars and backdrop blur for a premium feel.

### Performance Optimizations
- **Starfield Optimization:**
    - Replaced CPU-bound particle system with a GPU-accelerated custom `shaderMaterial`.
    - Increased star count to 3000 for a denser field.
    - Widened star spread (200x100) to cover the camera view fully.
    - Tuned star size to 6.0 and drift speed to 0.05 for a subtle, deep space effect.
    - Disabled frustum culling to prevent edge popping.
- **Board Optimization:**
    - Implemented `InstancedMesh` for the 100 board tiles, reducing draw calls from 100 to 1.
    - Merged border geometries into a single `LineSegments` object, reducing border draw calls from 100 to 1.
- **Rocket Optimization:**
    - Added global texture caching for emoji textures to prevent expensive canvas regeneration on re-renders.

## Deployment Plan

- **Build Tool:** Vite
- **Deployment Target:** Firebase Hosting
- **Steps:**
    1.  Run `npm run build` to compile the TypeScript code and package the application for production. This will create a `dist` directory with the static assets.
    2.  Deploy the contents of the `dist` directory to Firebase Hosting.
