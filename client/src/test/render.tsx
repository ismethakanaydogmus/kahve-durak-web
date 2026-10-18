import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { RouteObject } from 'react-router'
import { createMemoryRouter, RouterProvider } from 'react-router'

interface Options {
  /** Initial URL. */
  route?: string
  /** Path the element is mounted at. */
  path?: string
  /** Extra routes, e.g. redirect targets. */
  routes?: RouteObject[]
  /** Pass one in to inspect the cache from the test. */
  queryClient?: QueryClient
}

export function renderWithProviders(
  ui: ReactElement,
  { route = '/', path = '*', routes = [], queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }) }: Options = {},
) {
  const router = createMemoryRouter([{ path, element: ui }, ...routes], { initialEntries: [route] })
  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { ...result, router, queryClient }
}
