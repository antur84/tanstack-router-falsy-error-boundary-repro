# Organic repro: the router throws `undefined` by itself (react-router 1.170.15)

Branch companion to the main-branch repro for TanStack/router#8098. The main
branch shows the CatchBoundary half with an explicit `throw undefined`; this
branch shows the whole chain **with no throw statements in app code at all** —
the library produces the falsy throw on its own.

Pinned to `@tanstack/react-router` 1.170.15 / `@tanstack/router-core` 1.171.13
(pre-#7805, the versions where the internal throw-site existed — see #7753).

## Run

```
pnpm install
pnpm dev
```

Open http://localhost:3000, wait for the route to load, then click the button.

The button calls a single documented public API:

```js
router.invalidate({ forcePending: true })
```

What happens, step by step:

1. `invalidate({ forcePending: true })` synchronously flips the settled match
   back to `status: 'pending'` in the store.
2. The store update re-renders `MatchInner`, which sees `pending` and runs
   `throw getMatchPromise(match, 'loadPromise')` — the Suspense "throw a
   promise" idiom.
3. But the match already settled, and the loader pipeline cleared
   `_nonReactive.loadPromise = void 0` on settle. The lookup returns
   `undefined`, so the library executes `throw undefined`.
4. `CatchBoundary` catches it, stores it — and its `if (error)` truthiness
   gate is false, so it re-renders the crashing children. React sees a boundary
   failing identically on retry and escalates to an uncaught root error.
5. The root unmounts: **blank page**, console shows an uncaught error whose
   value is literally `undefined`.

The same end state occurs in production without `forcePending`, via a timing
race: an async `beforeLoad` throwing `redirect()` can leave a component
rendering a stale `pending`/`redirected` snapshot after the promise was
cleared (#7753). `forcePending` just makes the identical internal state
reachable deterministically, in one click.

The internal throw-site was removed by the #7805 rewrite (≥1.170.29), but the
CatchBoundary gate that turns any such throw into a blank page is still
present on latest — that's what #8098 / the main branch of this repo is about.
