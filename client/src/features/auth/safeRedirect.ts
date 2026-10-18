/** Only same-site paths are allowed as post-login targets (blocks //evil.com and absolute URLs). */
export function safeRedirect(target: string | null): string {
  if (!target || !target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) return '/'
  return target
}
