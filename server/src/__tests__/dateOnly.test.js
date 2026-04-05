import { describe, expect, it } from 'vitest'
import pg from 'pg'
import '../db.js'
import { entryDto } from '../dtos/entryDto.js'
import { timesheetDto } from '../dtos/timesheetDto.js'
import { formatDateOnly } from '../utils/dateOnly.js'

describe('DATE handling', () => {
  it('keeps PostgreSQL DATE parsers timezone-neutral', () => {
    const parser = pg.types.getTypeParser(pg.types.builtins.DATE, 'text')

    expect(parser('2026-03-30')).toBe('2026-03-30')
  })

  it('formats local date objects without shifting around DST', () => {
    expect(formatDateOnly(new Date(2026, 2, 30))).toBe('2026-03-30')
    expect(formatDateOnly(new Date(2026, 3, 5))).toBe('2026-04-05')
  })

  it('maps timesheet dates without shifting the week start', () => {
    const dto = timesheetDto({
      timesheet_id: 'timesheet-1',
      consultant_id: 'consultant-1',
      assignment_id: null,
      week_start: new Date(2026, 2, 30),
      status: 'DRAFT',
      rejection_comment: null,
      total_hours: '0',
      created_at: '2026-03-30T00:00:00Z',
      updated_at: '2026-03-30T00:00:00Z',
    })

    expect(dto.weekStart).toBe('2026-03-30')
  })

  it('maps entry dates without shifting the recorded day', () => {
    const dto = entryDto({
      entry_id: 'entry-1',
      entry_date: new Date(2026, 3, 5),
      hours_worked: '8',
    })

    expect(dto.date).toBe('2026-04-05')
  })
})
