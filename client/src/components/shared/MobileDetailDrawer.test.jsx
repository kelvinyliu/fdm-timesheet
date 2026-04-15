import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MobileDetailDrawer from './MobileDetailDrawer.jsx'
import { palette } from '../../theme.js'

const mocks = vi.hoisted(() => ({
  drawer: vi.fn(),
}))

vi.mock('@mui/material/SwipeableDrawer', () => ({
  default: function MockSwipeableDrawer({ open, children, ...props }) {
    mocks.drawer({ open, ...props })

    if (!open) return null

    return <div data-testid="mobile-detail-drawer">{children}</div>
  },
}))

describe('MobileDetailDrawer', () => {
  it('passes the app palette through to the drawer surface and backdrop', () => {
    render(
      <MobileDetailDrawer open onClose={() => {}} title="Audit entry" data={[]}>
        <div />
      </MobileDetailDrawer>
    )

    const drawerProps = mocks.drawer.mock.calls.at(-1)?.[0]

    expect(drawerProps.PaperProps.sx).toMatchObject({
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

  it('uses the application palette for header, content, and actions', () => {
    render(
      <MobileDetailDrawer
        open
        onClose={() => {}}
        title="Audit entry"
        subtitle="Now"
        data={[{ label: 'Action', value: 'Approved' }]}
        actions={<button type="button">Continue</button>}
      />
    )

    expect(screen.getByText('Audit entry')).toHaveStyle({ color: palette.textPrimary })
    expect(screen.getByText('Now')).toHaveStyle({ color: palette.textSecondary })
    expect(screen.getByText('Action')).toHaveStyle({ color: palette.textMuted })
    expect(screen.getByText('Approved')).toHaveStyle({ color: palette.textPrimary })
    expect(screen.getByRole('button', { name: 'Close Audit entry' })).toHaveStyle({
      color: palette.textSecondary,
    })
  })
})
