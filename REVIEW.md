# Code Review: Wormhole Warp — Mobile Performance & Structural Soundness

**Reviewer focus:** Mobile web game performance, architectural correctness, production readiness.

**Scope:** Full codebase audit of `src/`, configuration files, and build pipeline.

---

## Executive Summary

The codebase is well-organized for a small game with good use of memoization, granular Zustand selectors, and shared geometry. However, there are several **critical mobile performance problems** — most notably a dual WebGL context, an over-tessellated sphere, expensive per-frame CPU work, and 100 individual `<Text>` draw calls. The game flow also relies on uncancellable `setTimeout` chains that create race conditions on reset. The build and lint currently fail.

**Severity guide:** P0 = blocks shipping / crashes on mobile, P1 = significant perf/correctness issue, P2 = moderate issue, P3 = minor/style.

---

## 1. Build & Lint Failures (P0)

The project does not compile or lint cleanly.

### 1.1 TypeScript build error

`src/components/Dice.tsx:178` — unused `state` parameter in `useFrame` callback:

```typescript
// Dice.tsx:178
useFrame((state, delta) => {  // ← 'state' is declared but never read
```

Strict `noUnusedLocals` in `tsconfig.app.json` rejects this. Fix: rename to `_state` or destructure only `delta`.

### 1.2 ESLint errors (3 errors, 0 warnings)

| File | Line | Rule | Issue |
|---|---|---|---|
| `App.tsx` | 47 | `react-hooks/immutability` | Direct mutation of `camera.zoom` returned from `useThree()` |
| `Dice.tsx` | 167 | `react-hooks/set-state-in-effect` | Synchronous `setTextures()` inside `useEffect` triggers cascading renders |
| `useGameController.ts` | 29 | `prefer-const` | `let destination` is never reassigned, should be `const` |

The `camera.zoom` mutation is how Three.js orthographic cameras work — the lint rule is overly strict for R3F. The proper fix is either an eslint-disable comment with justification or moving camera manipulation into a `useFrame` or imperative ref.

The `setTextures` in `Dice.tsx` is a legitimate architectural concern — see Section 3.1.

---

## 2. Critical Mobile Performance Issues (P0–P1)

### 2.1 Dual WebGL Context — `HUD.tsx:118-126` (P0)

```tsx
// HUD.tsx — DicePanel creates a SECOND <Canvas>
<div className="h-24 w-24 ...">
  <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
    <ambientLight ... />
    <pointLight ... />
    <pointLight ... />
    <Dice ... />
  </Canvas>
</div>
```

This is the single most impactful mobile performance issue. Two WebGL contexts means:

- **Double GPU memory allocation** (frame buffers, depth buffers, texture pools)
- **Context switching overhead** every frame between the two renderers
- Many mobile browsers (especially older Android WebView) limit total WebGL contexts to 8–16; some low-end devices struggle with 2
- Two independent render loops running via `requestAnimationFrame`
- The dice canvas also has its own scene graph with 2 point lights and an ambient light, each requiring their own shader passes

**Recommendation:** Render the dice in the main Canvas scene (e.g., positioned in camera-space or at a fixed world position) and overlay a transparent HTML click target. Alternatively, replace the 3D dice with a 2D canvas/CSS animation — the moon-ball isn't leveraging complex 3D interaction anyway.

### 2.2 Over-tessellated Sphere — `Dice.tsx:220` (P1)

```tsx
<Sphere args={[2.2, 128, 128]}>
```

128 width × 128 height segments = **32,768 triangles** for a single decorative sphere. At the rendered size of 96×96 CSS pixels (the `h-24 w-24` container), most of these triangles are sub-pixel.

**Recommendation:** 32–48 segments (1,024–2,304 triangles) would be visually indistinguishable at this display size and reduce vertex processing by ~93%.

### 2.3 Expensive Texture Generation — `Dice.tsx:96-173` (P1)

The dice texture pipeline has two expensive operations:

**a) Base moon asset creation** (`createBaseMoonAssets`):
- Two 1024×1024 canvases created
- 50 radial gradient crater fills
- Pixel-by-pixel noise loop over **4,194,304 array elements** (1024² × 4 channels) for EACH canvas
- This runs once via `useMemo` but it's still ~8.4M array accesses at initialization

**b) Per-value texture compositing** (the `useEffect` at line 106):
- Runs on every `value` or `isRolling` change (multiple times per turn)
- Creates 2 new canvases, draws text with 3 overlapping `fillText` calls
- Creates 2 new `THREE.CanvasTexture` objects (GPU uploads)
- Triggers synchronous `setTextures` setState causing a cascading re-render

**Recommendation:**
- Reduce `TEX_SIZE` from 1024 to 256–512 (the sphere is displayed at 96px)
- Pre-render all 8 textures (null, 1–6, "ROLL") at startup rather than regenerating on each state change
- Use `useMemo` with the textures keyed on `value`/`isRolling` instead of `useEffect` + `setState`

### 2.4 100 Individual `<Text>` Components — `Board.tsx:30-42` (P1)

Each `<Text>` from `@react-three/drei` creates:
- Its own SDF (Signed Distance Field) texture
- Its own geometry buffer
- Its own draw call

100 text instances = 100 additional draw calls per frame. On mobile GPUs where draw call overhead is the primary bottleneck, this is significant.

**Recommendation:** Bake all 100 tile numbers into a single texture atlas at build time or initialization. Use a single instanced plane with UV offsets to index into the atlas — reducing 100 draw calls to 1.

### 2.5 100 `<Edges>` Components — `Board.tsx:28` (P1)

```tsx
<Edges color="#475569" linewidth={1} />
```

Each `<Edges>` generates its own `EdgesGeometry` from the parent mesh, creating 100 additional geometries and draw calls. Combined with the text, each tile has 3 draw calls (plane + edges + text), totaling **300 draw calls** for the board alone.

**Recommendation:** Since all tiles share the same geometry and the edges are all the same color, create a single `LineSegments` object with all 100 tile outlines merged into one geometry.

### 2.6 Per-frame CPU Work in Starfield — `Starfield.tsx:58-78` (P1)

```typescript
useFrame((_state, delta) => {
    // Iterates 300 stars, modifies positions, sets needsUpdate = true
    for (let i = 0; i < STAR_COUNT; i++) { ... }
    posAttr.needsUpdate = true;  // GPU re-upload every frame
});
```

Every frame: 300 position updates + a full buffer re-upload to the GPU. While 900 floats isn't catastrophic, `needsUpdate = true` forces a `bufferSubData` call. On mobile, minimizing CPU-GPU synchronization points is important.

**Recommendation:** Move the drift to a vertex shader uniform (a single float for time), calculating positions on the GPU. This eliminates the per-frame JS loop and GPU upload entirely.

### 2.7 Camera Polling via setInterval — `App.tsx:75-91` (P0/P1)

```typescript
useEffect(() => {
    const interval = setInterval(checkZoom, 500);
    return () => clearInterval(interval);
}, [...]);
```

A 500ms `setInterval` polling loop to detect whether the user has panned/zoomed. This:
- Fires regardless of whether the user is interacting
- Accesses `camera.zoom` and `controlsRef.current.target` on every tick
- Can cause layout thrashing when combined with React state updates

**Recommendation:** Use the `onChange` event that `MapControls` provides:
```tsx
<MapControls ref={controlsRef} onChange={() => checkZoom()} ... />
```

---

## 3. Structural & Architectural Issues (P1–P2)

### 3.1 Timer-Based Game Flow with No Cancellation (P1)

The game flow is a chain of uncancellable `setTimeout`/`await delay()` calls:

```
rollDice:     await delay(1000) → await delay(800) → movePlayer()
                                                        ↓
Rocket animation completes → handleMovementComplete → setTimeout(500) → checkWormhole
                                                                            ↓
                                                        executeTeleport → setTimeout(800) → nextTurn
```

**Problems:**
- `rollDice` uses an `async` IIFE inside a Zustand action — the promises and timeouts are **never cleaned up** if the game resets mid-roll
- `executeTeleport` fires `setTimeout(() => get().nextTurn(), 800)` — if the game resets during those 800ms, `nextTurn()` fires on a reset game, corrupting state
- Calling `get()` after `await delay()` in `rollDice` correctly reads fresh state, but there's no guard that `gameStatus` is still `'playing'`

**Recommendation:**
- Add a `turnId` or monotonic counter to the store, checked before each post-delay action
- Or use `AbortController` / cancellation tokens that are invalidated on `resetGame`
- Guard all post-delay callbacks: `if (get().gameStatus !== 'playing') return`

### 3.2 `GameController` Hook Naming Violation (P2)

```typescript
// useGameController.ts
export const GameController = () => {
  const setMoving = useGameStore(selectSetMoving);
  // ... calls hooks internally
```

This function calls React hooks but isn't named with a `use` prefix. React's rules-of-hooks lint rule identifies hooks by naming convention. Since `GameController` doesn't start with `use`, the linter won't enforce hook rules inside callers:

```tsx
// GameScene in App.tsx
const GameScene = memo(() => {
  const { handleMovementComplete } = GameController(); // ← looks like a regular function call
```

If someone conditionally calls `GameController()`, React won't warn them. Rename to `useGameController` and export as such.

### 3.3 Zustand Subscribe + setState in Rocket (P2)

```typescript
// Rocket.tsx:36-56
useEffect(() => {
    const unsub = useGameStore.subscribe((state, prevState) => {
      // ... multiple setPhase() and setPreMovePos() calls
    });
    return unsub;
}, [player.id]);
```

The subscription callback calls `setPhase` and `setPreMovePos` — React state setters — from an external Zustand subscription. While the cleanup is handled, this pattern:
- Can fire after component unmount if `unsubscribe` races with a synchronous store update
- Makes the data flow harder to trace (store subscription → local state → spring targets)

Consider deriving the phase directly from store state instead of synchronizing via subscription.

### 3.4 `vite-plugin-pwa` in `dependencies` (P2)

```json
"dependencies": {
    "vite-plugin-pwa": "^1.2.0",
    ...
}
```

This is a build-time Vite plugin — it should be in `devDependencies`. Including it in `dependencies` inflates production `npm install` in any deployment that runs `npm install --omit=dev`.

### 3.5 PWA Assets Missing (P2)

`vite.config.ts` references these assets that don't exist in the repo:

- `apple-touch-icon.png`
- `masked-icon.svg`
- `pwa-192x192.png`
- `pwa-512x512.png`

The manifest will 404 for icons on mobile browsers. The `index.html` also references `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`. This means the PWA install prompt will either fail or show a broken icon.

---

## 4. Gameplay Correctness Issues (P1–P2)

### 4.1 Bounce-Back Logic Missing (P1)

`CLAUDE.md` documents: "if dice roll exceeds Tile 100, player bounces back by the excess"

Actual implementation in `useGameStore.ts:103-107`:

```typescript
if (targetPos > 100) {
    // Turn ends immediately if overshot
    get().nextTurn();
    return;
}
```

The player doesn't bounce back — their turn is simply skipped. This is a gameplay deviation from the documented design.

### 4.2 Race Condition in rollDice After Reset (P1)

```typescript
// useGameStore.ts:87-98
rollDice: () => {
    (async () => {
        set({ isRolling: true, diceValue: null });
        await delay(1000);
        const roll = Math.floor(Math.random() * 6) + 1;
        set({ diceValue: roll, isRolling: false });
        await delay(800);
        const { players, currentPlayerIndex } = get();
        const currentPlayer = players[currentPlayerIndex];
        if (currentPlayer) {
            get().movePlayer(currentPlayer.id, roll);
        }
    })();
},
```

If `resetGame()` is called during the 1800ms of delays:
- The `set({ diceValue: roll, isRolling: false })` fires on a reset game
- `get().players` returns the newly-created empty array → `currentPlayer` is undefined → guarded
- But `set({ isRolling: false })` still mutates state unnecessarily

Worse: if a new game is started *and* a new roll is initiated within the 1800ms window, two concurrent async rollDice chains run simultaneously.

### 4.3 Wormhole Can Land on Same Tile (P2)

```typescript
// useGameController.ts:29-32
let destination = Math.floor(Math.random() * 98) + 2;
if (destination === currentTile) {
    nextTurn();
    return;
}
```

If the random destination matches the current tile, the wormhole is silently skipped. The 25% wormhole chance is slightly diluted (by ~1%) because of this bail-out. Not a major issue but worth noting — a re-roll would be more consistent.

---

## 5. Mobile UX Issues (P2)

### 5.1 Touch Targets Too Small

The dice hit area is `h-24 w-24` (96×96 CSS pixels). While this meets Apple's 44pt minimum, on the actual device:
- The 3D sphere inside is visually smaller than the container
- The "Reset View" button (`px-4 py-2`) may be below the 44×44px minimum tap target

### 5.2 No Haptic/Audio Feedback

The game has no haptic feedback (`navigator.vibrate`) on dice roll or wormhole events. Mobile games feel unresponsive without tactile feedback. The TODO for sound effects at `useGameController.ts:53` has been noted but haptic feedback is a separate (and easier) improvement.

### 5.3 Landscape-Only Enforcement Is Disruptive

The overlay blocks the entire screen in portrait with "Please rotate your device." Many users play in portrait. Consider adapting the layout (stacking the board and controls vertically) instead of blocking access entirely.

### 5.4 No `user-scalable=no` in Viewport

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

Missing `maximum-scale=1, user-scalable=no`. On mobile, double-tap and pinch gestures will trigger browser zoom instead of being captured by the game. While accessibility guidelines discourage disabling zoom, for a full-screen game PWA, browser zoom conflicts with `MapControls` pinch-to-zoom.

---

## 6. Bundle & Loading (P2)

### 6.1 Heavy Dependency: `framer-motion` (~40KB gzipped)

`framer-motion` is imported only in `WormholeDialog.tsx` for:
- Fade-in/out of the overlay
- Scale/spring animation on the dialog card
- Emoji scale + shake animation
- "Warping..." text fade

These are all achievable with CSS animations (the codebase already uses CSS keyframes for the warp stars). Removing `framer-motion` would save ~40KB gzipped from the critical bundle.

### 6.2 `@react-spring/web` Unused

```json
"@react-spring/web": "^10.0.3"
```

Only `@react-spring/three` is imported anywhere in the codebase. `@react-spring/web` is never imported. This is dead weight in `node_modules` and would be included in the bundle if tree-shaking doesn't fully eliminate it.

### 6.3 `clsx` and `tailwind-merge` Unused

Neither `clsx` nor `tailwind-merge` is imported anywhere in the source code. They should be removed from dependencies.

### 6.4 Google Fonts Loaded Synchronously

```html
<link href="https://fonts.googleapis.com/css2?family=Iceland&display=swap" rel="stylesheet">
```

This is render-blocking on mobile networks. Use `<link rel="preload" as="style">` with an `onload` handler, or inline the font-face declarations and self-host the font file.

---

## 7. Positive Observations

Credit where due — several patterns are well-executed:

- **Shared geometry/material** in `Board.tsx` (module-scope `PlaneGeometry` and `MeshBasicMaterial`) avoids 100 geometry allocations
- **Cached tile positions** with O(1) `Map` lookup in `boardUtils.ts`
- **Granular Zustand selectors** throughout — the HUD and scene don't re-render on unrelated state changes
- **`memo` usage** is thorough and correctly applied on every component
- **DPR capping** at `[1, 2]` prevents 3× rendering on high-DPI phones
- **PWA configuration** with workbox precaching and font runtime caching is well-structured
- **Vendor chunk splitting** (`three-core`, `r3f`, `animation`) enables independent cache invalidation
- **Texture disposal** in `Rocket.tsx` useEffect cleanup prevents GPU memory leaks
- **`persist` + `partialize`** correctly excludes transient state (`diceValue`, `isRolling`) from localStorage

---

## 8. Prioritized Action Items

| Priority | Issue | Section | Impact |
|----------|-------|---------|--------|
| **P0** | Fix build failure (unused `state` param) | 1.1 | Blocks deployment |
| **P0** | Fix lint errors (3 errors) | 1.2 | Blocks CI |
| **P0** | Remove dual WebGL context | 2.1 | Mobile crashes/OOM |
| **P1** | Reduce sphere segments (128→32) | 2.2 | ~93% fewer vertices |
| **P1** | Reduce texture size (1024→256) | 2.3 | ~16× less GPU upload |
| **P1** | Batch tile text into texture atlas | 2.4 | 100 draw calls → 1 |
| **P1** | Merge tile edges into single geometry | 2.5 | 100 draw calls → 1 |
| **P1** | Add timeout cancellation on reset | 3.1 | Prevents race conditions |
| **P1** | Implement bounce-back logic | 4.1 | Gameplay correctness |
| **P1** | Guard post-delay callbacks | 4.2 | Prevents state corruption |
| **P2** | Replace setInterval with onChange | 2.7 | Eliminates polling |
| **P2** | Move starfield drift to shader | 2.6 | Eliminates per-frame CPU work |
| **P2** | Rename GameController → useGameController | 3.2 | Hook rule enforcement |
| **P2** | Move vite-plugin-pwa to devDependencies | 3.4 | Correct packaging |
| **P2** | Add missing PWA icon assets | 3.5 | PWA install works |
| **P2** | Remove framer-motion, use CSS animations | 6.1 | ~40KB bundle savings |
| **P2** | Remove unused deps (clsx, tailwind-merge, @react-spring/web) | 6.2–6.3 | Clean dependencies |
| **P3** | Self-host Google Font | 6.4 | Faster first paint |
| **P3** | Add haptic feedback | 5.2 | Better mobile feel |
