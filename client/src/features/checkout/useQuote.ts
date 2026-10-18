import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { CheckoutRequest } from '../../lib/types'
import { fetchQuote } from './checkoutApi'

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}

/** Server-priced preview of the order. Debounced so typing a note doesn't fire a request per key. */
export function useQuote(request: CheckoutRequest, enabled: boolean) {
  const debounced = useDebounced(request, 300)
  const stale = JSON.stringify(debounced) !== JSON.stringify(request)
  const query = useQuery({
    queryKey: ['quote', debounced],
    queryFn: () => fetchQuote(debounced),
    enabled: enabled && debounced.items.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 0,
  })
  return { ...query, isUpdating: stale || query.isFetching }
}
