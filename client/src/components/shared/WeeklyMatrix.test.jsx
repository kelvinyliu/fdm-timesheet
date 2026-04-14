import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import WeeklyMatrix from './WeeklyMatrix.jsx'

const mocks = vi.hoisted(() => ({
  useMediaQuery: vi.fn(),
}))

vi.mock('@mui/material/useMediaQuery', () => ({
  default: mocks.useMediaQuery,
}))

describe('WeeklyMatrix', () => {
  beforeEach(() => {
    mocks.useMediaQuery.mockReset()
    mocks.useMediaQuery.mockReturnValue(false)
  })

  it('renders week headers, row values, and totals', () => {
    render(
      <WeeklyMatrix
        weekDates={['2026-04-06', '2026-04-07']}
        totalHours={13.5}
        rows={[
          {
            id: 'assignment-1',
            bucketLabel: 'Client A',
            hours: {
              '2026-04-06': 7.5,
              '2026-04-07': 6,
            },
          },
        ]}
      />
    )

    expect(screen.getByText('Weekly Timesheet')).toBeInTheDocument()
    expect(screen.getByText('Total Hours')).toBeInTheDocument()
    expect(screen.getByText('Client A')).toBeInTheDocument()
    expect(screen.getAllByText('7.50').length).toBeGreaterThan(0)
    expect(screen.getAllByText('6.00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('13.50').length).toBeGreaterThan(0)
  })

  it('renders an empty state when requested', () => {
    render(
      <WeeklyMatrix
        weekDates={[]}
        totalHours={0}
        rows={[]}
        emptyMessage="No entries recorded for this timesheet."
      />
    )

    expect(screen.getByText('No entries recorded for this timesheet.')).toBeInTheDocument()
  })

  it('renders day cards on mobile with muted and active day totals', () => {
    mocks.useMediaQuery.mockReturnValue(true)

    render(
      <WeeklyMatrix
        weekDates={['2026-04-06', '2026-04-07']}
        totalHours={8.5}
        rows={[
          {
            id: 'assignment-1',
            bucketLabel: 'Client A',
            hours: {
              '2026-04-06': 7.5,
            },
          },
          {
            id: 'INTERNAL',
            bucketLabel: 'Internal',
            hours: {
              '2026-04-06': 1,
            },
          },
        ]}
      />
    )

    expect(screen.getByText('Monday')).toBeInTheDocument()
    expect(screen.getByText('Tuesday')).toBeInTheDocument()
    expect(screen.getAllByText('8.50').length).toBeGreaterThan(1)
    expect(screen.getByText('0.00')).toBeInTheDocument()
    expect(screen.getAllByText('Client A')).toHaveLength(2)
    expect(screen.getAllByText('Internal')).toHaveLength(2)
  })

  it('shows exact mobile totals when a day exceeds 24 hours', () => {
    mocks.useMediaQuery.mockReturnValue(true)

    render(
      <WeeklyMatrix
        weekDates={['2026-04-06']}
        totalHours={26.5}
        rows={[
          {
            id: 'assignment-1',
            bucketLabel: 'Client A',
            hours: {
              '2026-04-06': 16,
            },
          },
          {
            id: 'INTERNAL',
            bucketLabel: 'Internal',
            hours: {
              '2026-04-06': 10.5,
            },
          },
        ]}
      />
    )

    expect(screen.getAllByText('26.50').length).toBeGreaterThan(1)
    expect(screen.getByText('Over daily limit')).toBeInTheDocument()
  })
})
