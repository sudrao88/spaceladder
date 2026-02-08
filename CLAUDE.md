# CLAUDE.md - AI Assistant Guide for Wormhole Warp

## Project Overview

**Wormhole Warp** is a 3D web-based board game built with React and Three.js. It reimagines Snakes & Ladders with a space/cyberpunk theme: players roll dice to move across a 10x10 grid, with a 25% chance of triggering random "wormhole" teleportation on each tile. First player to reach Tile 100 wins.

## Tech Stack

- **Framework:** React 19 with TypeScript (strict mode)
- **Build Tool:** Vite 7
- **3D Engine:** Three.js via @react-three/fiber and @react-three/drei
- **Animation:** @react-spring/three (player movement, dice), Framer Motion (UI)
- **State Management:** Zustand 5 with persist middleware (localStorage key: `wormhole-warp-storage`)
- **Styling:** Tailwind CSS 3 (utility classes for HUD/UI), inline Three.js materials for 3D objects
- **PWA:** vite-plugin-pwa with workbox precaching

## Commands

```bash
npm run dev        # Start Vite dev server with HMR
npm run build      # TypeScript type-check (tsc -b) then Vite production build
npm run lint       # ESLint on all files (flat config, TS + React hooks rules)
npm run preview    # Preview production build locally
```

**No test framework is configured.** There are no test files or test runners.

## Project Structure

```
src/
├── App.tsx                    # Root component: Canvas, camera, scene graph
├── main.tsx                   # Entry point: renders App into DOM
├── components/
│   ├── Board.tsx              # 10x10 tile grid rendered as 3D planes
│   ├── Rocket.tsx             # Player tokens (emoji textures via CanvasTexture)
│   ├── Dice.tsx               # 3D animated dice with spring rotation
│   └── HUD.tsx                # UI overlay: player list, dice button, setup/finish screens
├── hooks/
│   └── useGameController.ts   # Wormhole logic, movement completion, turn management
├── store/
│   └── useGameStore.ts        # Zustand store: all game state and actions
├── utils/
│   └── boardUtils.ts          # Board layout math, tile positions, emoji mappings
├── index.css                  # Tailwind directives and global styles
├── output.css                 # Compiled Tailwind output
└── assets/                    # Static assets (react.svg)
```

### Key Configuration Files

| File | Purpose |
|---|---|
| `vite.config.ts` | Vite + React plugin + PWA manifest configuration |
| `eslint.config.js` | Flat ESLint config: JS recommended, TS recommended, React hooks, React Refresh |
| `tsconfig.app.json` | Strict TS: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` |
| `tailwind.config.js` | Content paths for `index.html` and `src/**/*.{js,ts,jsx,tsx}` |
| `postcss.config.js` | Tailwind + Autoprefixer |

## Architecture

### Data Flow

1. **Zustand Store** (`useGameStore.ts`) is the single source of truth for all game state
2. **HUD** triggers `rollDice()` -> store updates `diceValue` and calls `movePlayer()`
3. **Rocket** component reacts to `player.position` changes via react-spring animation
4. **GameController** hook handles post-movement logic: wormhole check (25% random chance), teleportation, turn advancement

### Game State Machine

```
setup -> playing -> finished
  ^                    |
  |--- resetGame() ----|
```

- `setup`: Player count selection screen
- `playing`: Active gameplay with dice rolling and movement
- `finished`: Winner announcement with restart option

### Store Shape (persisted fields marked with *)

```typescript
{
  players*: Player[]         // id, color, position (1-100), isMoving
  currentPlayerIndex*: number
  gameStatus*: 'setup' | 'playing' | 'finished'
  winner*: Player | null
  diceValue: number | null   // not persisted
  isRolling: boolean         // not persisted
}
```

### 3D Scene Structure

- **OrthographicCamera** looking straight down (top-down 2D view in 3D space)
- **MapControls** for pan/zoom only (rotation disabled)
- **Board** centered at origin `(0, 0, 0)` with tile size 1.2 units and 0.1 unit gaps
- **Rockets** positioned at `y=0` on tile surfaces using `getTilePosition(tileId)`
- Board uses a snake pattern: odd rows left-to-right, even rows right-to-left

### Movement & Animation

- Player positions update immediately in the store
- `react-spring` interpolates the 3D position change (mass=1, tension=170, friction=26)
- After spring animation completes, `handleMovementComplete()` fires wormhole check
- Wormhole teleportation triggers a second spring animation to the new tile
- Bounce-back: if dice roll exceeds Tile 100, player bounces back by the excess

## Conventions

### Code Style

- **Functional components only** - no class components
- **Named exports** for components, **default export** for App
- **TypeScript strict mode** - all types must be explicit at boundaries
- **Zustand actions** live inside the store definition, not in separate files
- **GameController** is a custom hook (exported as `GameController`, not `useGameController`) that encapsulates game logic outside the store
- Tailwind for all 2D UI styling; inline Three.js materials/colors for 3D elements

### File Naming

- Components: PascalCase (`Board.tsx`, `HUD.tsx`)
- Hooks: camelCase starting with `use` (`useGameStore.ts`, `useGameController.ts`)
- Utilities: camelCase (`boardUtils.ts`)

### Player System

- 2-4 players with colors: `red`, `blue`, `green`, `yellow`
- Emoji tokens: `['🚀', '🛰️', '👽', '🛸']` (indexed by player id)
- Players start at position 1, win at position 100

### Theme

- Dark background: `#050510`
- UI: slate/gray palette with `bg-gray-800/80` panels
- Neon accents: cyan and purple for highlights
- Enforces landscape orientation on mobile (portrait shows rotate prompt)

## Common Tasks

### Adding a New Component

1. Create `src/components/ComponentName.tsx` with a named export
2. Use Three.js primitives for 3D elements or Tailwind for UI overlays
3. Access game state via `useGameStore()` hook

### Modifying Game Logic

- Wormhole probability and teleport logic: `src/hooks/useGameController.ts`
- Dice rolling and movement calculation: `src/store/useGameStore.ts` (`rollDice`, `movePlayer`)
- Board layout and tile math: `src/utils/boardUtils.ts`

### Adding New Game State

1. Add the field to the `GameState` interface in `useGameStore.ts`
2. Add it to the initial state in the `create()` call
3. If it should survive page refresh, add it to the `partialize` function in the persist config

## Known Limitations

- No test infrastructure (no Vitest, Jest, or testing library)
- No CI/CD pipeline configured
- No code formatter (Prettier) configured
- Sound effects are marked as TODO in `useGameController.ts:53`
- Wormholes are purely random (no fixed snakes/ladders map)
- `GameController` is named without the `use` prefix but behaves as a hook (calls other hooks internally)
