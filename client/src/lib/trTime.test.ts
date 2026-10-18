import { describe, expect, it } from 'vitest'
import { trTimeWithSuffix } from './trTime'

describe('trTimeWithSuffix', () => {
  it.each([
    ['03:00', "03:00'e"],
    ['10:00', "10:00'a"],
    ['02:00', "02:00'ye"],
    ['06:00', "06:00'ya"],
    ['23:00', "23:00'e"],
    ['10:30', "10:30'a"],
    ['09:45', "09:45'e"],
    ['00:00', "00:00'a"],
  ])('dative %s → %s', (time, expected) => {
    expect(trTimeWithSuffix(time, 'dative')).toBe(expected)
  })

  it.each([
    ['10:00', "10:00'da"],
    ['03:00', "03:00'te"],
    ['04:00', "04:00'te"],
    ['05:00', "05:00'te"],
    ['08:00', "08:00'de"],
    ['09:00', "09:00'da"],
    ['10:40', "10:40'ta"],
    ['07:00', "07:00'de"],
  ])('locative %s → %s', (time, expected) => {
    expect(trTimeWithSuffix(time, 'locative')).toBe(expected)
  })
})
