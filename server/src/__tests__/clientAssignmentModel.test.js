import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../db.js', () => ({
  default: {
    query: vi.fn(),
  },
}))

import pool from '../db.js'
import {
  deleteAssignment,
  getAllAssignments,
  getAssignmentById,
  getAssignmentByIdIncludingDeleted,
  getAssignmentsByConsultant,
} from '../models/clientAssignmentModel.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('clientAssignmentModel', () => {
  it('lists only active assignments for a consultant', async () => {
    pool.query.mockResolvedValue({ rows: [{ assignment_id: 'a-1' }] })

    const rows = await getAssignmentsByConsultant('consultant-1')

    expect(rows).toEqual([{ assignment_id: 'a-1' }])
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringMatching(/WHERE consultant_id = \$1\s+AND deleted_at IS NULL/i),
      ['consultant-1']
    )
  })

  it('lists only active assignments for admins', async () => {
    pool.query.mockResolvedValue({ rows: [{ assignment_id: 'a-1' }] })

    const rows = await getAllAssignments()

    expect(rows).toEqual([{ assignment_id: 'a-1' }])
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringMatching(/FROM client_assignments\s+WHERE deleted_at IS NULL/i)
    )
  })

  it('excludes soft-deleted rows from active assignment lookup', async () => {
    pool.query.mockResolvedValue({ rows: [] })

    const row = await getAssignmentById('assignment-1')

    expect(row).toBeNull()
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringMatching(/WHERE assignment_id = \$1\s+AND deleted_at IS NULL/i),
      ['assignment-1']
    )
  })

  it('can load deleted assignments for historical enrichment', async () => {
    pool.query.mockResolvedValue({
      rows: [{ assignment_id: 'assignment-1', deleted_at: '2026-04-09T10:00:00Z' }],
    })

    const row = await getAssignmentByIdIncludingDeleted('assignment-1')

    expect(row).toEqual({
      assignment_id: 'assignment-1',
      deleted_at: '2026-04-09T10:00:00Z',
    })
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringMatching(/WHERE assignment_id = \$1\b/i),
      ['assignment-1']
    )
  })

  it('soft deletes active assignments', async () => {
    pool.query.mockResolvedValue({ rowCount: 1 })

    const deleted = await deleteAssignment('assignment-1')

    expect(deleted).toBe(true)
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE client_assignments\s+SET deleted_at = NOW\(\)\s+WHERE assignment_id = \$1\s+AND deleted_at IS NULL/i),
      ['assignment-1']
    )
  })
})
