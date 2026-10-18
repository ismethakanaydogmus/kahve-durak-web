import { useEffect } from 'react'
import { useLocation } from 'react-router'

/** Scrolls to the element named by the URL hash once the page's data has rendered. */
export function useHashScroll(ready: boolean) {
  const { hash } = useLocation()
  useEffect(() => {
    if (ready && hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [ready, hash])
}
