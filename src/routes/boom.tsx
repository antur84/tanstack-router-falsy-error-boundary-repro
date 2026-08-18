import { createFileRoute } from '@tanstack/react-router'

type BoomSearch = { value: 'error' | 'undefined' }

export const Route = createFileRoute('/boom')({
  validateSearch: (search): BoomSearch => ({
    value: search.value === 'error' ? 'error' : 'undefined',
  }),
  component: Boom,
})

function Boom(): never {
  const { value } = Route.useSearch()
  if (value === 'error') {
    throw new Error('real failure')
  }
  // eslint-disable-next-line no-throw-literal
  throw undefined
}
