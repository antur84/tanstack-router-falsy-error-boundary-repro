# Throw-crash hunt against TanStack Router `main`

Findings verified against `TanStack/router@f97188f` (main, 2026-08-15) by
patching `examples/react/start-bare` inside the monorepo — so everything below
runs on main's own source, not published packages.

## Reproduce

```sh
gh repo clone TanStack/router && cd router
git apply path/to/hunt.patch   # the hunt.patch file in this branch
pnpm install
npx nx build @tanstack/react-start
cd examples/react/start-bare && pnpm dev
```

Open the app and click the two links.

## Finding 1 — a loader rejecting without a reason blanks the app

```tsx
export const Route = createFileRoute('/loader-reject')({
  loader: () => Promise.reject(),   // ordinary app code, no throw statements
  component: () => <div>loaded</div>,
})
```

Click the link → **blank page**, console shows uncaught `undefined`. The root
route's `errorComponent` never renders.

Chain, all in main's source:

1. `packages/router-core/src/load-client.ts` — `normalize(value, rejected)`
   passes the raw rejection reason through to `[ERROR, value]`. It already
   special-cases redirects, notFounds, and even wraps thrown *promises* in
   `new Error('A Promise was thrown', { cause })` — but a falsy reason flows
   straight through, so `match.error = undefined`, `status = 'error'`.
2. `packages/react-router/src/Match.tsx:250` — client error branch:
   `throw match.error` → `throw undefined`.
3. `packages/react-router/src/CatchBoundary.tsx` — `getDerivedStateFromError`
   stores it, the `if (error)` truthiness gate fails, the boundary re-renders
   the crashing children, React escalates to an uncaught root error and
   unmounts the app (#8098).

`normalize` looks like the right place for the fix: the same falsy-guard it
already applies to thrown promises (or hardening `CatchBoundary` per #8099,
which fixes the whole class at once).

## Finding 2 — a deferred promise rejecting without a reason blanks the app

```tsx
export const Route = createFileRoute('/await-reject')({
  loader: () => ({ deferred: Promise.reject() }),
  component: () => (
    <Await promise={deferred} fallback={<div>waiting</div>}>
      {() => <div>resolved</div>}
    </Await>
  ),
})
```

Same result: blank page, uncaught `undefined`. Path:
`packages/react-router/src/awaited.tsx` — `useAwaited` rethrows
`promise[TSR_DEFERRED_PROMISE].error` raw (and the React 19 `use()` fast path
rethrows the raw rejection reason likewise) → same CatchBoundary escalation.

## Ruled out while auditing

- `Match.tsx:222` `throw router._tx[5]` — safe: slot 5 is the transaction's
  `done` promise, constructed inline; never absent while `_tx` exists.
- The #7753/#7910 `getMatchPromise` site no longer exists on main.

## Takeaway

Two independent, ordinary userland patterns (`Promise.reject()` with no
reason — common in cancel paths and `.catch(reject)` chains) produce
library-thrown `undefined` on current main. Hardening `CatchBoundary` (#8099)
converts every variant — present and future — from a blank page into the
route's `errorComponent`; normalizing falsy reasons in `normalize()` would
additionally give those errors a useful message.
