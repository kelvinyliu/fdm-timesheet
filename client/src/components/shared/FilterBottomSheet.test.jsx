import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import FilterBottomSheet from './FilterBottomSheet.jsx'
import { palette } from '../../theme.js'

const mocks = vi.hoisted(() => ({
  drawer: vi.fn(),
}))

vi.mock('@mui/material/Drawer', () => ({
  default: function MockDrawer({ open, children, ...props }) {
    mocks.drawer({ open, ...props })

    if (!open) return null

    return <div data-testid="filter-bottom-sheet">{children}</div>
  },
}))

describe('FilterBottomSheet', () => {
  it('passes the app palette through to the drawer surface and backdrop', () => {
    render(
      <FilterBottomSheet open onClose={() => {}}>
        <div>Filter content</div>
      </FilterBottomSheet>
    )

    const drawerProps = mocks.drawer.mock.calls.at(-1)?.[0]

    expect(drawerProps.slotProps.paper.sx).toMatchObject({
      backgroundColor: palette.surface,
      color: palette.textPrimary,
      border: `1px solid ${palette.border}`,
      boxShadow: palette.shadowStrong,
    })
    expect(drawerProps.slotProps.backdrop.sx).toMatchObject({
      backgroundColor: 'rgba(252, 251, 249, 0.82)',
      backdropFilter: 'blur(8px)',
    })
  })

  it('uses the application surface palette instead of the drawer sidebar palette', () => {
    render(
      <FilterBottomSheet open onClose={() => {}}>
        <div>Filter content</div>
      </FilterBottomSheet>
    )

    const contentContainer = screen.getByText('Filter content').closest('.MuiStack-root')?.parentElement

    expect(screen.getByText('Filters')).toHaveStyle({ color: palette.textPrimary })
    expect(contentContainer).toHaveStyle({
      backgroundColor: palette.bg,
    })
  })

  it('applies filters and closes the sheet from the footer action', () => {
    const onApply = vi.fn()
    const onClose = vi.fn()

    render(
      <FilterBottomSheet open onClose={onClose} onApply={onApply}>
        <div>Filter content</div>
      </FilterBottomSheet>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
