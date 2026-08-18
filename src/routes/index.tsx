import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div style={{ padding: 16 }}>
      <h1>Repro: thrown falsy values bypass the route errorComponent</h1>
      <p>
        Both links navigate to a route whose component throws during render.
        Expected: the root route&apos;s errorComponent renders for both.
      </p>
      <ul>
        <li>
          <Link to="/boom" search={{ value: 'error' }}>
            throw new Error(&apos;real failure&apos;) — works: error UI renders
          </Link>
        </li>
        <li>
          <Link to="/boom" search={{ value: 'undefined' }}>
            throw undefined — bug: blank page, uncaught error in console
          </Link>
        </li>
      </ul>
    </div>
  )
}
