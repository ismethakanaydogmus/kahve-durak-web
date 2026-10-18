import { describe, expect, it } from 'vitest'
import { isTokenExpired } from './jwt'

const b64url = (o: object) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const token = (exp: number) => `${b64url({ alg: 'HS256' })}.${b64url({ sub: '1', exp })}.sig`
const now = Date.UTC(2026, 9, 18, 12)

describe('isTokenExpired', () => {
  it('is true when exp is in the past', () => {
    expect(isTokenExpired(token(now / 1000 - 60), now)).toBe(true)
  })

  it('is false when exp is in the future', () => {
    expect(isTokenExpired(token(now / 1000 + 3600), now)).toBe(false)
  })

  it('treats malformed tokens as expired', () => {
    expect(isTokenExpired('abc', now)).toBe(true)
    expect(isTokenExpired('a.b.c', now)).toBe(true)
  })
})
