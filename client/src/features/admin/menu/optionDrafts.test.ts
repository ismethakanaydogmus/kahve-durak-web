import { describe, expect, it } from 'vitest'
import { parseMoney } from './optionDrafts'

describe('parseMoney', () => {
  it.each([
    ['180', 180],
    ['180,50', 180.5],
    ['180.5', 180.5],
    ['1.250', 1250],
    ['1.000,50', 1000.5],
    ['12.345.678', 12345678],
    [' 30 ', 30],
    ['0', 0],
  ])('reads %j as %d', (input, expected) => {
    expect(parseMoney(input)).toBe(expected)
  })

  it.each(['', 'abc', '12,345', '1,2,3', '-5', '1.25.0'])('rejects %j', (input) => {
    expect(Number.isNaN(parseMoney(input))).toBe(true)
  })
})
