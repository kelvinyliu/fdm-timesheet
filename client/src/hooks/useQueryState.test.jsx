import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router'
import { useDebouncedValue, useQueryStateObject } from './useQueryState.js'

function InlineConfigHarness() {
  const [queryState, setQueryState] = useQueryStateObject({
    tab: 'active',
    q: '',
  })
  const location = useLocation()

  return (
    <div>
      <div>{`tab:${queryState.tab}`}</div>
      <div>{`q:${queryState.q}`}</div>
      <div>{`search:${location.search}`}</div>
      <button onClick={() => setQueryState({ q: 'Pat' })}>Update Query</button>
    </div>
  )
}

function DebouncedHarness() {
  const [queryState, setQueryState] = useQueryStateObject({ q: '' })
  const [draftQuery, setDraftQuery] = useDebouncedValue(
    queryState.q,
    (nextValue) => setQueryState({ q: nextValue }),
    500
  )
  const location = useLocation()

  return (
    <div>
      <label htmlFor="debounced-query">Query</label>
      <input
        id="debounced-query"
        value={draftQuery}
        onChange={(event) => setDraftQuery(event.target.value)}
      />
      <div>{`draft:${draftQuery}`}</div>
      <div>{`q:${queryState.q}`}</div>
      <div>{`search:${location.search}`}</div>
    </div>
  )
}

afterEach(() => {
  vi.useRealTimers()
})

describe('useQueryStateObject', () => {
  it('renders safely with an inline config object and updates the URL-backed state', () => {
    render(
      <MemoryRouter initialEntries={['/timesheets?tab=history']}>
        <InlineConfigHarness />
      </MemoryRouter>
    )

    expect(screen.getByText('tab:history')).toBeInTheDocument()
    expect(screen.getByText('q:')).toBeInTheDocument()
    expect(screen.getByText('search:?tab=history')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Update Query' }))

    expect(screen.getByText('q:Pat')).toBeInTheDocument()
    expect(screen.getByText('search:?tab=history&q=Pat')).toBeInTheDocument()
  })

  it('debounces query-state commits by 500ms while keeping the input responsive', () => {
    vi.useFakeTimers()

    render(
      <MemoryRouter initialEntries={['/timesheets']}>
        <DebouncedHarness />
      </MemoryRouter>
    )

    const input = screen.getByLabelText('Query')

    fireEvent.change(input, { target: { value: 'Pa' } })

    expect(screen.getByText('draft:Pa')).toBeInTheDocument()
    expect(screen.getByText('q:')).toBeInTheDocument()
    expect(screen.getByText('search:')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(300)
    })

    fireEvent.change(input, { target: { value: 'Pat' } })

    act(() => {
      vi.advanceTimersByTime(499)
    })

    expect(screen.getByText('draft:Pat')).toBeInTheDocument()
    expect(screen.getByText('q:')).toBeInTheDocument()
    expect(screen.getByText('search:')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1)
    })

    expect(screen.getByText('q:Pat')).toBeInTheDocument()
    expect(screen.getByText('search:?q=Pat')).toBeInTheDocument()
  })
})
