// Repro: a route component throwing a falsy value (undefined) bypasses the route
// errorComponent and escalates to React's uncaught-error path.
// Run: npm install && node repro.mjs
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><body></body>", {
  pretendToBeVisual: true,
  url: "http://localhost/",
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } = await import(
  "@tanstack/react-router"
);

async function renderWithThrowingRoute(thrownValue, label) {
  let errorComponentRendered = false;
  let escalatedToRoot = false;

  const rootRoute = createRootRoute({
    errorComponent: () => {
      errorComponentRendered = true;
      return React.createElement("div", null, "caught by route errorComponent");
    },
  });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    errorComponent: () => {
      errorComponentRendered = true;
      return React.createElement("div", null, "caught by route errorComponent");
    },
    component: function Boom() {
      throw thrownValue;
    },
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });

  // Work around an unrelated init-order read (MatchesInner reads router._rendered
  // before the Transitioner initializes it) so this repro isolates the boundary bug.
  router._rendered ??= [];

  const el = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(el);
  const root = createRoot(el, {
    onUncaughtError: (error) => {
      escalatedToRoot = true;
      console.log(`  [onUncaughtError] received value: ${String(error)}`);
    },
    onCaughtError: () => {},
  });
  await router.load();
  root.render(React.createElement(RouterProvider, { router }));
  await new Promise((resolve) => setTimeout(resolve, 500));
  root.unmount();
  el.remove();

  console.log(
    `${label}: errorComponent rendered = ${errorComponentRendered}, escalated to onUncaughtError = ${escalatedToRoot}`,
  );
  return { errorComponentRendered, escalatedToRoot };
}

const realError = await renderWithThrowingRoute(new Error("real failure"), "throw new Error(...)");
const thrownUndefined = await renderWithThrowingRoute(undefined, "throw undefined     ");

if (realError.errorComponentRendered && !thrownUndefined.errorComponentRendered && thrownUndefined.escalatedToRoot) {
  console.error(
    "\nBUG CONFIRMED: a thrown Error reaches the route errorComponent, but a thrown undefined bypasses it and escalates to the root uncaught-error handler.",
  );
  process.exitCode = 1;
} else if (thrownUndefined.errorComponentRendered) {
  console.log("\nNot reproduced: thrown undefined reached the errorComponent (fixed?).");
}
