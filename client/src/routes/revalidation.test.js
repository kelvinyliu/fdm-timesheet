import { describe, expect, it } from 'vitest'
import { skipRevalidationOnSearchChange } from './revalidation.js'

describe('skipRevalidationOnSearchChange', () => {
  it('skips loader revalidation for same-path search-only changes', () => {
    expect(
      skipRevalidationOnSearchChange({
        currentUrl: new URL('http://localhost/finance/pay-rates?q=alice'),
        nextUrl: new URL('http://localhost/finance/pay-rates?q=bob'),
        defaultShouldRevalidate: true,
      })
    ).toBe(false)
  })

  it('defers to the router default for submissions and route changes', () => {
    expect(
      skipRevalidationOnSearchChange({
        currentUrl: new URL('http://localhost/finance/pay-rates?q=alice'),
        nextUrl: new URL('http://localhost/finance/pay-rates?q=bob'),
        defaultShouldRevalidate: true,
        formMethod: 'post',
      })
    ).toBe(true)

    expect(
      skipRevalidationOnSearchChange({
        currentUrl: new URL('http://localhost/finance/pay-rates?q=alice'),
        nextUrl: new URL('http://localhost/finance/timesheets'),
        defaultShouldRevalidate: true,
      })
    ).toBe(true)
  })
})
