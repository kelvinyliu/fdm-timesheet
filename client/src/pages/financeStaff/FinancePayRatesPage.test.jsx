import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router'
import FinancePayRatesPage from './FinancePayRatesPage.jsx'

const mocks = vi.hoisted(() => ({
  updateDefaultPayRate: vi.fn(),
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

vi.mock('../../api/users', () => ({
  updateDefaultPayRate: (...args) => mocks.updateDefaultPayRate(...args),
}))

vi.mock('../../components/shared/PageHeader', () => ({
  default: function MockPageHeader({ children, title, subtitle }) {
    return (
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <div>{children}</div>
      </div>
    )
  },
}))

vi.mock('../../components/shared/SaveStateBanner.jsx', () => ({
  default: function MockSaveStateBanner({ message, state }) {
    return <div>{`${state}:${message}`}</div>
  },
}))

vi.mock('../../components/shared/StickyActionBar.jsx', () => ({
  default: function MockStickyActionBar({ children, secondary }) {
    return (
      <div>
        <div>{secondary}</div>
        <div>{children}</div>
      </div>
    )
  },
}))

vi.mock('../../context/useUnsavedChanges.js', () => ({
  useUnsavedChangesGuard: vi.fn(),
}))

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location-search">{location.search}</div>
}

function buildConsultants() {
  return [
    {
      id: 'consultant-1',
      name: 'Alice Consultant',
      email: 'alice@example.com',
      defaultPayRate: 35,
    },
    {
      id: 'consultant-2',
      name: 'Bob Manager',
      email: 'bob@example.com',
      defaultPayRate: 45,
    },
  ]
}

function renderPage(initialEntry = '/finance/pay-rates') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationProbe />
      <FinancePayRatesPage />
    </MemoryRouter>
  )
}

function getDesktopRow(label) {
  return screen.getByText(label).closest('tr')
}

describe('FinancePayRatesPage', () => {
  beforeEach(() => {
    mocks.updateDefaultPayRate.mockReset()
    mocks.useLoaderData.mockReset()
    mocks.useMediaQuery.mockReset()
    mocks.useMediaQuery.mockReturnValue(false)
    mocks.useLoaderData.mockImplementation(() => ({
      consultants: buildConsultants().map((consultant) => ({ ...consultant })),
      error: '',
    }))
  })

  it('keeps unsaved edits when the URL search filter changes', async () => {
    renderPage()

    const aliceRow = getDesktopRow('Alice Consultant')
    fireEvent.change(within(aliceRow).getByLabelText('Default Pay Rate'), {
      target: { value: '42' },
    })

    expect(screen.getByRole('button', { name: 'Save 1 Change' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Search employees'), {
      target: { value: 'Bob' },
    })

    await waitFor(() =>
      expect(screen.getByTestId('location-search')).toHaveTextContent('?q=Bob')
    )
    expect(screen.queryByText('Alice Consultant')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Search employees'), {
      target: { value: '' },
    })

    await waitFor(() =>
      expect(screen.getByTestId('location-search')).toHaveTextContent('')
    )

    const restoredAliceRow = getDesktopRow('Alice Consultant')
    expect(within(restoredAliceRow).getByLabelText('Default Pay Rate')).toHaveValue(42)
    expect(screen.getByRole('button', { name: 'Save 1 Change' })).toBeInTheDocument()
  })

  it('clears successful drafts and keeps failed drafts with row-level errors', async () => {
    mocks.updateDefaultPayRate.mockImplementation((id, rate) => {
      if (id === 'consultant-1') {
        return Promise.resolve({
          id,
          name: 'Alice Consultant',
          email: 'alice@example.com',
          defaultPayRate: rate,
        })
      }

      return Promise.reject(new Error('Bob save failed'))
    })

    renderPage()

    fireEvent.change(within(getDesktopRow('Alice Consultant')).getByLabelText('Default Pay Rate'), {
      target: { value: '42' },
    })
    fireEvent.change(within(getDesktopRow('Bob Manager')).getByLabelText('Default Pay Rate'), {
      target: { value: '55' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save 2 Changes' }))

    await waitFor(() => expect(mocks.updateDefaultPayRate).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Saved default: £42.00/hr')).toBeInTheDocument()
    expect(await screen.findByText('Bob save failed')).toBeInTheDocument()

    expect(
      within(getDesktopRow('Alice Consultant')).getByLabelText('Default Pay Rate')
    ).toHaveValue(42)
    expect(within(getDesktopRow('Bob Manager')).getByLabelText('Default Pay Rate')).toHaveValue(55)
    expect(screen.getByRole('button', { name: 'Save 1 Change' })).toBeInTheDocument()
  })
})
