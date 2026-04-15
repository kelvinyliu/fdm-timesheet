import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router'
import AuditLogPage from './AuditLogPage.jsx'

const mocks = vi.hoisted(() => ({
  useLoaderData: vi.fn(),
  useMediaQuery: vi.fn(),
}))

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useLoaderData: mocks.useLoaderData,
  }
})

vi.mock('@mui/material/useMediaQuery', () => ({
  default: mocks.useMediaQuery,
}))

vi.mock('@mui/material/Autocomplete', () => ({
  default: function MockAutocomplete({ onChange, options, renderInput, value }) {
    const input = renderInput?.({})
    const label = input?.props?.label ?? 'Autocomplete'

    return (
      <label>
        {label}
        <select
          aria-label={label}
          onChange={(event) => onChange?.(event, event.target.value || null)}
          value={value ?? ''}
        >
          <option value="">All</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    )
  },
}))

vi.mock('@mui/material/Pagination', () => ({
  default: function MockPagination({ count, onChange, page }) {
    return (
      <nav aria-label="Pagination">
        {Array.from({ length: count }, (_, index) => {
          const pageNumber = index + 1
          return (
            <button
              aria-current={page === pageNumber ? 'page' : undefined}
              key={pageNumber}
              onClick={() => onChange?.(null, pageNumber)}
              type="button"
            >
              {pageNumber}
            </button>
          )
        })}
      </nav>
    )
  },
}))

vi.mock('@mui/x-date-pickers/LocalizationProvider', () => ({
  LocalizationProvider: function MockLocalizationProvider({ children }) {
    return children
  },
}))

vi.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: function MockDatePicker({ label, value }) {
    return <input aria-label={label} readOnly value={value?.format?.('YYYY-MM-DD') ?? ''} />
  },
}))

vi.mock('../../components/shared/PageHeader', () => ({
  default: function MockPageHeader({ title, subtitle }) {
    return (
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    )
  },
}))

vi.mock('../../components/shared/FilterBottomSheet.jsx', () => ({
  default: function MockFilterBottomSheet() {
    return null
  },
}))

vi.mock('../../components/shared/MobileDetailDrawer.jsx', () => ({
  default: function MockMobileDetailDrawer() {
    return null
  },
}))

vi.mock('../../components/shared/ActionBadge', () => ({
  default: function MockActionBadge({ action }) {
    return <span>{action}</span>
  },
}))

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location-search">{location.search}</div>
}

function buildEntry(index, overrides = {}) {
  return {
    id: `entry-${index}`,
    action: 'SUBMISSION',
    createdAt: `2026-04-${String((index % 28) + 1).padStart(2, '0')}T09:00:00.000Z`,
    detail: { submittedLate: false },
    performedByName: `User ${String(index).padStart(2, '0')}`,
    timesheetConsultantName: `Consultant ${String(index).padStart(2, '0')}`,
    timesheetWeekStart: '2026-04-07',
    ...overrides,
  }
}

function renderPage(initialEntry = '/admin/audit-log') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationProbe />
      <AuditLogPage />
    </MemoryRouter>
  )
}

function getDesktopTable() {
  return screen.getByRole('table')
}

describe('AuditLogPage', () => {
  beforeEach(() => {
    mocks.useLoaderData.mockReset()
    mocks.useMediaQuery.mockReset()
    mocks.useMediaQuery.mockReturnValue(false)
  })

  it('shows the first client-side page by default', () => {
    mocks.useLoaderData.mockReturnValue({
      entries: Array.from({ length: 30 }, (_, index) => buildEntry(index + 1)),
      error: '',
    })

    renderPage()
    const table = getDesktopTable()

    expect(within(table).getByText('User 01')).toBeInTheDocument()
    expect(within(table).getByText('User 25')).toBeInTheDocument()
    expect(within(table).queryByText('User 26')).not.toBeInTheDocument()
    expect(screen.getByText('Showing 1-25 of 30 entries')).toBeInTheDocument()
  })

  it('changes page and syncs the page query param', async () => {
    mocks.useLoaderData.mockReturnValue({
      entries: Array.from({ length: 30 }, (_, index) => buildEntry(index + 1)),
      error: '',
    })

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: '2' }))
    const table = getDesktopTable()

    expect(within(table).getByText('User 26')).toBeInTheDocument()
    expect(within(table).getByText('User 30')).toBeInTheDocument()
    expect(within(table).queryByText('User 25')).not.toBeInTheDocument()
    expect(screen.getByText('Showing 26-30 of 30 entries')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByTestId('location-search')).toHaveTextContent('?page=2')
    )
  })

  it('resets to page 1 when filters change and preserves the filter in the query string', async () => {
    mocks.useLoaderData.mockReturnValue({
      entries: [
        ...Array.from({ length: 30 }, (_, index) => buildEntry(index + 1)),
        buildEntry(31, { action: 'APPROVAL', performedByName: 'Approver One' }),
      ],
      error: '',
    })

    renderPage('/admin/audit-log?page=2')
    let table = getDesktopTable()

    expect(within(table).getByText('User 26')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Action'), {
      target: { value: 'APPROVAL' },
    })
    table = getDesktopTable()

    expect(within(table).getByText('Approver One')).toBeInTheDocument()
    expect(within(table).queryByText('User 26')).not.toBeInTheDocument()
    expect(screen.getByText('Showing 1-1 of 1 entries (31 total)')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByTestId('location-search')).toHaveTextContent('?action=APPROVAL')
    )
  })

  it('clamps invalid page params to the last available page', async () => {
    mocks.useLoaderData.mockReturnValue({
      entries: Array.from({ length: 30 }, (_, index) => buildEntry(index + 1)),
      error: '',
    })

    renderPage('/admin/audit-log?page=99')
    const table = getDesktopTable()

    expect(within(table).getByText('User 26')).toBeInTheDocument()
    expect(screen.getByText('Showing 26-30 of 30 entries')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByTestId('location-search')).toHaveTextContent('?page=2')
    )
  })
})
