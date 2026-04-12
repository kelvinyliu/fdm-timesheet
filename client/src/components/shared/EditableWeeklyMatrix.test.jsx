import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EditableWeeklyMatrix from './EditableWeeklyMatrix.jsx'

const mocks = vi.hoisted(() => ({
  useMediaQuery: vi.fn(),
}))

vi.mock('@mui/material/useMediaQuery', () => ({
  default: mocks.useMediaQuery,
}))

describe('EditableWeeklyMatrix', () => {
  beforeEach(() => {
    mocks.useMediaQuery.mockReset()
    mocks.useMediaQuery.mockReturnValue(false)
  })

  it('renders mobile day cards and adjusts hours through steppers', () => {
    mocks.useMediaQuery.mockReturnValue(true)

    const onAddRow = vi.fn()
    const onRemoveRow = vi.fn()
    const onRowCategoryChange = vi.fn()
    const onRowHoursChange = vi.fn()

    render(
      <EditableWeeklyMatrix
        rows={[
          {
            id: 'row-1',
            entryKind: 'CLIENT',
            assignmentId: 'assignment-1',
            hours: {
              '2026-04-06': '',
            },
          },
        ]}
        weekDates={['2026-04-06', '2026-04-07']}
        totalHours={0}
        availableAssignments={[{ id: 'assignment-1', clientName: 'Client A' }]}
        canChangeBuckets
        isBusy={false}
        onAddRow={onAddRow}
        onRemoveRow={onRemoveRow}
        onRowCategoryChange={onRowCategoryChange}
        onRowHoursChange={onRowHoursChange}
      />
    )

    expect(screen.getByText('Work Categories')).toBeInTheDocument()
    expect(screen.getByText('Monday')).toBeInTheDocument()
    expect(screen.getByText('Tuesday')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Increase hours for 2026-04-06' }))
    expect(onRowHoursChange).toHaveBeenCalledWith('row-1', '2026-04-06', '0.25')

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Hours for 2026-04-06' }), {
      target: { value: '1.25' },
    })
    expect(onRowHoursChange).toHaveBeenCalledWith('row-1', '2026-04-06', '1.25')

    fireEvent.click(screen.getByRole('button', { name: 'Add Category' }))
    expect(onAddRow).toHaveBeenCalledTimes(1)
  })

  it('disables decrement when a mobile cell is already at zero', () => {
    mocks.useMediaQuery.mockReturnValue(true)

    render(
      <EditableWeeklyMatrix
        rows={[
          {
            id: 'row-1',
            entryKind: 'INTERNAL',
            assignmentId: null,
            hours: {
              '2026-04-06': '',
            },
          },
        ]}
        weekDates={['2026-04-06']}
        totalHours={0}
        availableAssignments={[]}
        canChangeBuckets
        isBusy={false}
        onAddRow={vi.fn()}
        onRemoveRow={vi.fn()}
        onRowCategoryChange={vi.fn()}
        onRowHoursChange={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: 'Decrease hours for 2026-04-06' })).toBeDisabled()
  })

  it('shows the exact mobile day total and over-limit state when a day exceeds 24 hours', () => {
    mocks.useMediaQuery.mockReturnValue(true)

    render(
      <EditableWeeklyMatrix
        rows={[
          {
            id: 'row-1',
            entryKind: 'CLIENT',
            assignmentId: 'assignment-1',
            hours: {
              '2026-04-06': '16',
            },
          },
          {
            id: 'row-2',
            entryKind: 'INTERNAL',
            assignmentId: null,
            hours: {
              '2026-04-06': '10.5',
            },
          },
        ]}
        weekDates={['2026-04-06']}
        totalHours={26.5}
        availableAssignments={[{ id: 'assignment-1', clientName: 'Client A' }]}
        canChangeBuckets
        isBusy={false}
        onAddRow={vi.fn()}
        onRemoveRow={vi.fn()}
        onRowCategoryChange={vi.fn()}
        onRowHoursChange={vi.fn()}
      />
    )

    expect(screen.getByText('26.5')).toBeInTheDocument()
    expect(screen.getByText('Over daily limit')).toBeInTheDocument()
  })
})
