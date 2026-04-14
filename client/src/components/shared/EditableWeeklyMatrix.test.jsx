import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EditableWeeklyMatrix from './EditableWeeklyMatrix.jsx'

const mocks = vi.hoisted(() => ({
  useMediaQuery: vi.fn(),
}))

vi.mock('@mui/material/useMediaQuery', () => ({
  default: mocks.useMediaQuery,
}))

vi.mock('@mui/material/TextField', () => ({
  default: function MockTextField({
    children,
    disabled,
    onChange,
    placeholder,
    select,
    slotProps,
    type = 'text',
    value,
  }) {
    const htmlInputProps = slotProps?.htmlInput ?? {}

    if (select) {
      return (
        <select disabled={disabled} onChange={onChange} value={value}>
          {children}
        </select>
      )
    }

    return (
      <input
        aria-label={htmlInputProps['aria-label']}
        disabled={disabled}
        max={htmlInputProps.max}
        min={htmlInputProps.min}
        onChange={onChange}
        placeholder={placeholder}
        step={htmlInputProps.step}
        style={htmlInputProps.style}
        type={type}
        value={value}
      />
    )
  },
}))

vi.mock('@mui/material/MenuItem', () => ({
  default: function MockMenuItem({ children, disabled, value }) {
    return (
      <option disabled={disabled} value={value}>
        {children}
      </option>
    )
  },
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

  it('disables duplicate category options on desktop', () => {
    render(
      <EditableWeeklyMatrix
        rows={[
          {
            id: 'row-1',
            entryKind: 'CLIENT',
            assignmentId: 'assignment-1',
            hours: {},
          },
          {
            id: 'row-2',
            entryKind: 'INTERNAL',
            assignmentId: null,
            hours: {},
          },
        ]}
        weekDates={['2026-04-06']}
        totalHours={0}
        availableAssignments={[
          { id: 'assignment-1', clientName: 'Client A' },
          { id: 'assignment-2', clientName: 'Client B' },
        ]}
        canChangeBuckets
        isBusy={false}
        onAddRow={vi.fn()}
        onRemoveRow={vi.fn()}
        onRowCategoryChange={vi.fn()}
        onRowHoursChange={vi.fn()}
      />
    )

    const [firstSelect, secondSelect] = screen.getAllByRole('combobox')

    expect(within(firstSelect).getByRole('option', { name: 'Client A' })).toBeEnabled()
    expect(within(firstSelect).getByRole('option', { name: 'Client B' })).toBeEnabled()
    expect(within(firstSelect).getByRole('option', { name: 'Internal' })).toBeDisabled()

    expect(within(secondSelect).getByRole('option', { name: 'Client A' })).toBeDisabled()
    expect(within(secondSelect).getByRole('option', { name: 'Internal' })).toBeEnabled()
  })

  it('disables duplicate category options on mobile', () => {
    mocks.useMediaQuery.mockReturnValue(true)

    render(
      <EditableWeeklyMatrix
        rows={[
          {
            id: 'row-1',
            entryKind: 'CLIENT',
            assignmentId: 'assignment-1',
            hours: {},
          },
          {
            id: 'row-2',
            entryKind: 'INTERNAL',
            assignmentId: null,
            hours: {},
          },
        ]}
        weekDates={['2026-04-06']}
        totalHours={0}
        availableAssignments={[
          { id: 'assignment-1', clientName: 'Client A' },
          { id: 'assignment-2', clientName: 'Client B' },
        ]}
        canChangeBuckets
        isBusy={false}
        onAddRow={vi.fn()}
        onRemoveRow={vi.fn()}
        onRowCategoryChange={vi.fn()}
        onRowHoursChange={vi.fn()}
      />
    )

    const [firstSelect, secondSelect] = screen.getAllByRole('combobox')

    expect(within(firstSelect).getByRole('option', { name: 'Internal' })).toBeDisabled()
    expect(within(secondSelect).getByRole('option', { name: 'Client A' })).toBeDisabled()
  })

  it('disables add row controls when all available work categories are already present', () => {
    render(
      <EditableWeeklyMatrix
        rows={[
          {
            id: 'row-1',
            entryKind: 'CLIENT',
            assignmentId: 'assignment-1',
            hours: {},
          },
          {
            id: 'row-2',
            entryKind: 'INTERNAL',
            assignmentId: null,
            hours: {},
          },
        ]}
        weekDates={['2026-04-06']}
        totalHours={0}
        availableAssignments={[{ id: 'assignment-1', clientName: 'Client A' }]}
        canChangeBuckets
        isBusy={false}
        onAddRow={vi.fn()}
        onRemoveRow={vi.fn()}
        onRowCategoryChange={vi.fn()}
        onRowHoursChange={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: 'Add Row' })).toBeDisabled()
    expect(
      screen.getByText('All available work categories have already been added.')
    ).toBeInTheDocument()
  })

  it('renders desktop daily totals in the footer row', () => {
    render(
      <EditableWeeklyMatrix
        rows={[
          {
            id: 'row-1',
            entryKind: 'CLIENT',
            assignmentId: 'assignment-1',
            hours: {
              '2026-04-06': '7.5',
            },
          },
          {
            id: 'row-2',
            entryKind: 'INTERNAL',
            assignmentId: null,
            hours: {
              '2026-04-06': '1',
            },
          },
        ]}
        weekDates={['2026-04-06', '2026-04-07']}
        totalHours={8.5}
        availableAssignments={[{ id: 'assignment-1', clientName: 'Client A' }]}
        canChangeBuckets
        isBusy={false}
        onAddRow={vi.fn()}
        onRemoveRow={vi.fn()}
        onRowCategoryChange={vi.fn()}
        onRowHoursChange={vi.fn()}
      />
    )

    expect(screen.getByText('Daily Total')).toBeInTheDocument()
    expect(screen.getAllByText('8.50').length).toBeGreaterThan(1)
    expect(screen.getByText('0.00')).toBeInTheDocument()
  })

  it('keeps the desktop matrix on a fixed table layout with stable numeric input sizing', () => {
    render(
      <EditableWeeklyMatrix
        rows={[
          {
            id: 'row-1',
            entryKind: 'CLIENT',
            assignmentId: 'assignment-1',
            hours: {
              '2026-04-06': '',
              '2026-04-07': '10.5',
            },
          },
        ]}
        weekDates={['2026-04-06', '2026-04-07']}
        totalHours={10.5}
        availableAssignments={[{ id: 'assignment-1', clientName: 'Client A' }]}
        canChangeBuckets
        isBusy={false}
        onAddRow={vi.fn()}
        onRemoveRow={vi.fn()}
        onRowCategoryChange={vi.fn()}
        onRowHoursChange={vi.fn()}
      />
    )

    expect(screen.getByRole('table')).toHaveStyle({
      tableLayout: 'fixed',
      width: '100%',
    })

    const dayInputs = screen.getAllByRole('spinbutton')
    expect(dayInputs[0]).toHaveStyle({
      width: '100%',
      minWidth: '6ch',
      fontVariantNumeric: 'tabular-nums',
    })
    expect(dayInputs[1]).toHaveStyle({
      width: '100%',
      minWidth: '6ch',
      fontVariantNumeric: 'tabular-nums',
    })
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

    expect(screen.getAllByText('26.50').length).toBeGreaterThan(1)
    expect(screen.getByText('Over daily limit')).toBeInTheDocument()
  })

  it('shows the desktop footer over-limit state when a day exceeds 24 hours', () => {
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

    expect(screen.getAllByText('26.50').length).toBeGreaterThan(1)
    expect(screen.getByText('Over daily limit')).toBeInTheDocument()
  })
})
