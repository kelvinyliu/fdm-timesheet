import { describe, expect, it } from 'vitest'
import { getRouteMeta } from '../../routes/routeMeta.js'

describe('route breadcrumbs', () => {
  it('matches the finance pay-rates route', () => {
    expect(getRouteMeta('/finance/pay-rates').breadcrumbs).toEqual(['Pay Rates'])
  })

  it('keeps finance timesheet routes mapped to timesheet breadcrumbs', () => {
    expect(getRouteMeta('/finance/timesheets').breadcrumbs).toEqual(['Timesheets'])
  })
})
