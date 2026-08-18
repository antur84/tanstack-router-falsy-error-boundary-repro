import { createFileRoute, useRouter } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  loader: async () => {
    await new Promise((resolve) => setTimeout(resolve, 10))
    return { loadedAt: Date.now() }
  },
  component: Home,
})

function Home() {
  const router = useRouter()
  const { loadedAt } = Route.useLoaderData()
  return (
    <div style={{ padding: 16 }}>
      <h1>Organic repro: the router throws undefined by itself</h1>
      <p>
        This app contains no throw statements. The route loaded fine (at{' '}
        {new Date(loadedAt).toLocaleTimeString()}). Clicking the button calls
        the documented public API <code>router.invalidate(&#123; forcePending: true &#125;)</code>:
        the match flips back to <code>pending</code>, but its already-settled
        <code> loadPromise</code> was cleared by the loader pipeline — so
        MatchInner executes <code>throw getMatchPromise(match, 'loadPromise')</code>,
        which is <code>throw undefined</code>.
      </p>
      <button
        type="button"
        onClick={() => router.invalidate({ forcePending: true })}
      >
        router.invalidate(&#123; forcePending: true &#125;)
      </button>
    </div>
  )
}
