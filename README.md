# TanStack Start repro: thrown falsy values bypass the route errorComponent

TanStack/router#8098 — a route component throwing a falsy value (`undefined`,
`null`, `0`, `''`) is caught by `CatchBoundary` but fails its truthiness gate,
so the boundary re-renders the crashing children and React escalates to an
uncaught root error: the app unmounts to a blank page instead of rendering the
errorComponent.

Minimal TanStack Start app (based on the `start-bare` example).

There is also an [`organic-1.170.15` branch](../../tree/organic-1.170.15) with
**no throw statements in app code at all**: pinned to react-router 1.170.15
(pre-#7805), a single click on the documented `router.invalidate({ forcePending:
true })` API makes the library itself execute `throw undefined` and blank the
page — the full production chain from #7753.

## Run

```
pnpm install
pnpm dev
```

Open http://localhost:3000 and click the two links:

- **throw new Error('real failure')** — works: an error UI renders.
- **throw undefined** — bug: the page goes completely blank (React unmounts
  the root) and the console shows an uncaught error whose value is literally
  `undefined`.

The bug is client-side (`CatchBoundary`), so use the links (client-side
navigation) rather than loading `/boom?value=undefined` directly.

Confirmed with `@tanstack/react-router` 1.170.29, `@tanstack/react-start`
1.168.46, react 19.

## Where it goes wrong

`packages/react-router/src/CatchBoundary.tsx`:

```js
static getDerivedStateFromError(error) { return { error } }
// render():
if (error) { /* render errorComponent */ }
return this.props.children
```

`getDerivedStateFromError` stores the thrown `undefined`, `if (error)` is
false, the children re-crash, and React promotes the error to the root.
