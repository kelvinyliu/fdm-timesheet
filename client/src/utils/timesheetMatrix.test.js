import { describe, expect, it } from 'vitest'
import {
  adjustHoursValue,
  buildDayCardData,
  entriesToEditableMatrixRows,
  entriesToReadOnlyMatrixRows,
  formatHoursValue,
  formatTotalHoursValue,
  getBucketValue,
  getMatrixRowTotal,
  getMatrixTotalHours,
  parseBucketValue,
  rowHasValues,
  serializeEntries,
} from './timesheetMatrix.js'

const entries = [
  {
    date: '2026-04-06',
    entryKind: 'CLIENT',
    assignmentId: 'assignment-1',
    bucketLabel: 'Client A',
    hoursWorked: 7.5,
  },
  {
    date: '2026-04-07',
    entryKind: 'CLIENT',
    assignmentId: 'assignment-1',
    bucketLabel: 'Client A',
    hoursWorked: 6,
  },
  {
    date: '2026-04-06',
    entryKind: 'INTERNAL',
    assignmentId: null,
    bucketLabel: 'Internal',
    hoursWorked: 1,
  },
]

describe('timesheet matrix utilities', () => {
  it('groups entries into read-only rows by work bucket', () => {
    const rows = entriesToReadOnlyMatrixRows(entries)

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      id: 'assignment-1',
      bucketLabel: 'Client A',
      hours: {
        '2026-04-06': 7.5,
        '2026-04-07': 6,
      },
    })
    expect(rows[1]).toMatchObject({
      id: 'INTERNAL',
      bucketLabel: 'Internal',
      hours: {
        '2026-04-06': 1,
      },
    })
  })

  it('builds editable rows with local ids and string hour values', () => {
    let id = 0
    const rows = entriesToEditableMatrixRows(entries, () => {
      id += 1
      return id
    })

    expect(rows[0]).toMatchObject({
      id: 'row-1',
      entryKind: 'CLIENT',
      assignmentId: 'assignment-1',
      hours: {
        '2026-04-06': '7.5',
      },
    })
  })

  it('serializes entries in stable semantic order', () => {
    expect(serializeEntries([entries[1], entries[0]])).toBe(serializeEntries([entries[0], entries[1]]))
  })

  it('calculates row and matrix totals', () => {
    const rows = entriesToReadOnlyMatrixRows(entries)
    const weekDates = ['2026-04-06', '2026-04-07']

    expect(getMatrixRowTotal(rows[0], weekDates)).toBe(13.5)
    expect(getMatrixTotalHours(rows, weekDates)).toBe(14.5)
  })

  it('builds day cards in week order and preserves category order', () => {
    const rows = entriesToReadOnlyMatrixRows(entries)
    const dayCards = buildDayCardData(rows, ['2026-04-06', '2026-04-07'])

    expect(dayCards).toHaveLength(2)
    expect(dayCards[0]).toMatchObject({
      date: '2026-04-06',
      dayLabel: 'Monday',
      shortDate: '04-06',
      totalHours: 8.5,
    })
    expect(dayCards[0].categories.map((category) => category.rowId)).toEqual(['assignment-1', 'INTERNAL'])
    expect(dayCards[1].categories[1]).toMatchObject({
      rowId: 'INTERNAL',
      numericHours: 0,
      value: '',
    })
  })

  it('parses client and internal bucket values', () => {
    expect(getBucketValue('INTERNAL', null)).toBe('INTERNAL')
    expect(parseBucketValue('INTERNAL')).toEqual({ entryKind: 'INTERNAL', assignmentId: null })
    expect(parseBucketValue('assignment-1')).toEqual({ entryKind: 'CLIENT', assignmentId: 'assignment-1' })
  })

  it('adjusts and formats stepper hour values safely', () => {
    expect(adjustHoursValue('', 1, 0.25)).toBe('0.25')
    expect(adjustHoursValue('0.75', 1, 0.25)).toBe('1')
    expect(adjustHoursValue('0.5', -1)).toBe('')
    expect(adjustHoursValue('24', 1)).toBe('24')
    expect(formatHoursValue(8)).toBe('8.0')
    expect(formatHoursValue(7.25)).toBe('7.25')
    expect(formatHoursValue(26.5)).toBe('24.0')
    expect(formatTotalHoursValue(26.5)).toBe('26.5')
  })

  it('detects rows with entered values', () => {
    expect(rowHasValues({ hours: { '2026-04-06': '' } })).toBe(false)
    expect(rowHasValues({ hours: { '2026-04-06': '0.25' } })).toBe(true)
  })
})
