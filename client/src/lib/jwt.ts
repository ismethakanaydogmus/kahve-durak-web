/** True when the JWT's exp has passed or the token can't be read. The server still decides; this only avoids showing a stale session. */
export function isTokenExpired(token: string, nowMs: number = Date.now()): boolean {
  try {
    const payload = token.split('.')[1]
    if (!payload) return true
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const exp = (JSON.parse(json) as { exp?: unknown }).exp
    return typeof exp !== 'number' || exp * 1000 <= nowMs
  } catch {
    return true
  }
}
