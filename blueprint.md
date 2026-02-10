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
    - `CameraController`: **NEW** Handles camera movement, following players, and resetting views.
- **State Management (`useGameStore.ts`):**
    - `players`: Array of player objects.
    - `currentPlayerIndex`: Index of the current player.
    - `gameStatus`: Current state of the game (setup, playing, finished).
    - `cameraState`: Flags for controlling camera behavior (follow, reset, default view).
- **Game Logic (`useGameController.ts`):**
    - Orchestrates the game flow, responding to player actions.
    - Handles dice rolls, player movement, and interactions with special tiles like wormholes.

## Recent Changes (Camera Refactor & Fixes)

- **New Component:** `CameraController` encapsulated in `src/components/CameraController.tsx`.
- **Logic Improvement:** Replaced complex `useFrame` logic in `App.tsx` with a dedicated controller using frame-independent damping for smoother camera transitions.
- **Performance:** Optimized camera updates to only run when necessary and use granular state selectors. Replaced polling `setInterval` with event-driven `onChange` for camera state detection.
- **Structure:** Moved `activeRocketRef` to `src/utils/sceneRefs.ts` to avoid circular dependencies.
- **Fixes:** 
    - Resolved camera snapping issue by managing internal state (`lastIsDefaultRef`) correctly.
    - Enabled correct damping for manual camera movement by ensuring `controls.update()` is called every frame.

## Deployment Plan

- **Build Tool:** Vite
- **Deployment Target:** Firebase Hosting
- **Steps:**
    1.  Run `npm run build` to compile the TypeScript code and package the application for production. This will create a `dist` directory with the static assets.
    2.  Deploy the contents of the `dist` directory to Firebase Hosting.
