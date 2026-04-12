import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import WeeklyMatrix from './WeeklyMatrix.jsx'

describe('WeeklyMatrix', () => {
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

    expect(screen.getByText('Weekly Matrix')).toBeInTheDocument()
    expect(screen.getByText('13.5h Total')).toBeInTheDocument()
    expect(screen.getByText('Client A')).toBeInTheDocument()
    expect(screen.getByText('7.5')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('13.50')).toBeInTheDocument()
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
})
