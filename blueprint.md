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
- **State Management (`useGameStore.ts`):**
    - `playerPosition`: The current tile number of the player.
    - `roll`: The result of the last dice roll.
    - `message`: Game messages displayed to the player.
    - `actions`: Functions to manipulate the game state, such as `rollDice` and `movePlayer`.
- **Game Logic (`useGameController.ts`):**
    - Orchestrates the game flow, responding to player actions.
    - Handles dice rolls, player movement, and interactions with special tiles like wormholes.

## Deployment Plan

- **Build Tool:** Vite
- **Deployment Target:** Firebase Hosting
- **Steps:**
    1.  Run `npm run build` to compile the TypeScript code and package the application for production. This will create a `dist` directory with the static assets.
    2.  Deploy the contents of the `dist` directory to Firebase Hosting.
