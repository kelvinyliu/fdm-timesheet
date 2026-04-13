import { describe, expect, it } from 'vitest'
import { formatCurrency } from './currency.js'

describe('currency utilities', () => {
  it('formats GBP values consistently', () => {
    expect(formatCurrency(12)).toBe('£12.00')
    expect(formatCurrency(12.5)).toBe('£12.50')
  })
})
