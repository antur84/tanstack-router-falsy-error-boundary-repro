# TanStack Router: thrown falsy values bypass the route errorComponent

`CatchBoundary` stores the caught value in state and gates rendering on its
truthiness:

```js
static getDerivedStateFromError(error) { return { error }; }
// ...
children: ({ error, reset }) => {
  if (error) return createElement(errorComponent, { error, reset });
  return props.children;
}
```

When a component throws a falsy value (`throw undefined`, `null`, `0`, `""`),
the boundary catches it but `if (error)` is false — so it re-renders the same
crashing children. React sees an error boundary that failed identically on
retry and promotes the error to an uncaught root error (`onUncaughtError` /
`window.reportError`), bypassing the route's `errorComponent` entirely.

## Run

```
npm install
node repro.mjs
```

Renders the same throwing route twice (jsdom + `react-dom/client`):

```
throw new Error(...): errorComponent rendered = true, escalated to onUncaughtError = false
  [onUncaughtError] received value: undefined
throw undefined     : errorComponent rendered = false, escalated to onUncaughtError = true

BUG CONFIRMED: a thrown Error reaches the route errorComponent, but a thrown
undefined bypasses it and escalates to the root uncaught-error handler.
```

Exits 1 while the bug reproduces. Confirmed with @tanstack/react-router 1.170.29
and react 19.2.8. (The `router._rendered ??= []` line in the script works around
an unrelated init-order read so the repro isolates this bug.)

Observed in production: react-router ≤ 1.170.15 could throw a cleared
(undefined) `loadPromise` from `MatchInner` during a settle race — that throw
site was removed by the match-rendering rewrite in 1.170.29, but any thrown
falsy value still reproduces the boundary escalation on latest.
