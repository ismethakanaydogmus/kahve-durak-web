/** Full-page navigation to another site (the payment page). Wrapped so tests can mock it. */
export function redirectTo(url: string) {
  window.location.assign(url)
}
