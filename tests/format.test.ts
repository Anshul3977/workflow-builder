import { describe, it, expect } from 'vitest'
import { usd, ms } from '@/components/results/trace'

describe('display formatters', () => {
  it('shows tiny costs with 3 significant digits', () => {
    expect(usd(0.00006855)).toMatch(/^\$0\.00006(85|86)$/)
    expect(usd(0.0123)).toBe('$0.0123')
    expect(usd(1.5)).toBe('$1.50')
    expect(usd(null)).toBe('–')
  })
  it('formats durations', () => {
    expect(ms(860)).toBe('860 ms')
    expect(ms(1127)).toBe('1.13 s')
  })
})
