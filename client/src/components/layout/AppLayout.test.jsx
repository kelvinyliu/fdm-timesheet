import { describe, expect, it } from 'vitest'
import { getBreadcrumbs } from './AppLayout.jsx'

describe('getBreadcrumbs', () => {
  it('matches the finance pay-rates route', () => {
    expect(getBreadcrumbs('/finance/pay-rates')).toEqual(['Pay Rates'])
  })

  it('keeps finance timesheet routes mapped to timesheet breadcrumbs', () => {
    expect(getBreadcrumbs('/finance/timesheets')).toEqual(['Timesheets'])
  })
})
