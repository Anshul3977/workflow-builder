import { describe, expect, it } from 'vitest'
import { DEMO_INPUT_MAX, USER_INPUT_MAX, inputLimit, inputTooLong } from '@/lib/run-limits'

describe('input limits', () => {
  it('caps guests lower than signed-in users', () => {
    expect(inputLimit(true)).toBe(DEMO_INPUT_MAX)
    expect(inputLimit(false)).toBe(USER_INPUT_MAX)
    expect(DEMO_INPUT_MAX).toBe(2000)
    expect(USER_INPUT_MAX).toBe(8000)
  })

  it('flags trimmed text that the run route would reject', () => {
    expect(inputTooLong('a'.repeat(2000), true)).toBe(false)
    expect(inputTooLong(`  ${'a'.repeat(2001)}  `, true)).toBe(true)
    expect(inputTooLong('a'.repeat(2001), false)).toBe(false)
    expect(inputTooLong('a'.repeat(8001), false)).toBe(true)
  })
})
