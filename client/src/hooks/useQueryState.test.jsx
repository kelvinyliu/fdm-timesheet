import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router'
import { useQueryStateObject } from './useQueryState.js'

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
})
