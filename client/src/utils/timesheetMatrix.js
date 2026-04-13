import { formatDayName } from './dateFormatters'

export const INTERNAL_BUCKET_VALUE = 'INTERNAL'
const HOURS_DECIMAL_PLACES = 2

function roundHours(value) {
  return Number(value.toFixed(HOURS_DECIMAL_PLACES))
}

function formatRoundedHoursValue(value) {
  if (Number.isInteger(value)) return value.toFixed(1)

  const fixed = value.toFixed(HOURS_DECIMAL_PLACES)
  return fixed.replace(/\.?0+$/, '')
}

export function getBucketValue(entryKind, assignmentId) {
  return entryKind === 'CLIENT' ? assignmentId || '' : INTERNAL_BUCKET_VALUE
}

export function parseBucketValue(value) {
  if (value === INTERNAL_BUCKET_VALUE) return { entryKind: 'INTERNAL', assignmentId: null }
  return { entryKind: 'CLIENT', assignmentId: value }
}

export function getWorkBucketKey(item) {
  return `${item.entryKind}-${item.assignmentId ?? INTERNAL_BUCKET_VALUE}`
}

export function getBucketLabel(item, assignmentMap = new Map()) {
  if (item?.entryKind === 'INTERNAL' || item === INTERNAL_BUCKET_VALUE) return 'Internal'
  if (typeof item === 'string') return assignmentMap.get(item)?.clientName ?? 'Unknown client assignment'
  if (item?.assignmentId) {
    return item.bucketLabel ?? assignmentMap.get(item.assignmentId)?.clientName ?? 'Unknown client assignment'
  }
  return item?.bucketLabel ?? 'Unknown client assignment'
}

export function entriesToReadOnlyMatrixRows(entries = []) {
  const rowMap = new Map()

  entries.forEach((entry) => {
    const key = getBucketValue(entry.entryKind, entry.assignmentId)
    if (!rowMap.has(key)) {
      rowMap.set(key, {
        id: key,
        entryKind: entry.entryKind,
        assignmentId: entry.assignmentId,
        bucketLabel: entry.bucketLabel,
        hours: {},
      })
    }

    rowMap.get(key).hours[entry.date] = entry.hoursWorked
  })

  return Array.from(rowMap.values())
}

export function entriesToEditableMatrixRows(entries = [], nextLocalId) {
  const rowMap = new Map()

  entries.forEach((entry) => {
    const key = getBucketValue(entry.entryKind, entry.assignmentId)
    if (!rowMap.has(key)) {
      rowMap.set(key, {
        id: `row-${nextLocalId()}`,
        ...parseBucketValue(key),
        hours: {},
      })
    }

    rowMap.get(key).hours[entry.date] = String(entry.hoursWorked ?? '0')
  })

  return Array.from(rowMap.values())
}

export function getMatrixRowTotal(row, weekDates = []) {
  return weekDates.reduce((sum, date) => sum + (parseFloat(row.hours?.[date]) || 0), 0)
}

export function getMatrixDayTotal(rows = [], date) {
  return rows.reduce((sum, row) => sum + (parseFloat(row.hours?.[date]) || 0), 0)
}

export function getMatrixDayTotals(rows = [], weekDates = []) {
  return weekDates.map((date) => ({
    date,
    totalHours: getMatrixDayTotal(rows, date),
  }))
}

export function getMatrixTotalHours(rows = [], weekDates = []) {
  return rows.reduce((sum, row) => sum + getMatrixRowTotal(row, weekDates), 0)
}

export function buildDayCardData(rows = [], weekDates = []) {
  return getMatrixDayTotals(rows, weekDates).map(({ date, totalHours }) => ({
    date,
    dayLabel: formatDayName(date),
    shortDate: date.slice(5),
    totalHours,
    categories: rows.map((row) => ({
      rowId: row.id,
      entryKind: row.entryKind,
      assignmentId: row.assignmentId ?? null,
      bucketLabel: row.bucketLabel ?? '',
      value: row.hours?.[date] ?? '',
      numericHours: parseFloat(row.hours?.[date]) || 0,
    })),
  }))
}

export function getUsedBucketValues(rows = [], excludeRowId = null) {
  return new Set(
    rows
      .filter((row) => row.id !== excludeRowId)
      .map((row) => getBucketValue(row.entryKind, row.assignmentId))
      .filter(Boolean)
  )
}

export function getDuplicateBucketValues(rows = []) {
  const seen = new Set()
  const duplicates = new Set()

  rows.forEach((row) => {
    const bucketValue = getBucketValue(row.entryKind, row.assignmentId)
    if (!bucketValue) return
    if (seen.has(bucketValue)) {
      duplicates.add(bucketValue)
      return
    }
    seen.add(bucketValue)
  })

  return [...duplicates]
}

export function getNextAvailableBucketValue(
  rows = [],
  availableAssignments = [],
  preferredAssignmentId = null
) {
  const usedBucketValues = getUsedBucketValues(rows)
  const candidateValues = []
  const availableAssignmentIds = new Set(
    availableAssignments.map((assignment) => assignment?.id).filter(Boolean)
  )

  if (preferredAssignmentId && availableAssignmentIds.has(preferredAssignmentId)) {
    candidateValues.push(preferredAssignmentId)
  }

  availableAssignments.forEach((assignment) => {
    if (assignment?.id) candidateValues.push(assignment.id)
  })
  candidateValues.push(INTERNAL_BUCKET_VALUE)

  return candidateValues.find(
    (value, index) => candidateValues.indexOf(value) === index && !usedBucketValues.has(value)
  )
}

export function clampHoursValue(value, min = 0, max = 24) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return min
  return Math.min(max, Math.max(min, roundHours(numericValue)))
}

export function normaliseHoursValue(value) {
  const numericValue = clampHoursValue(value)
  if (numericValue === 0) return ''
  return String(roundHours(numericValue))
}

export function adjustHoursValue(currentValue, delta, step = 0.5) {
  const nextValue = clampHoursValue((parseFloat(currentValue) || 0) + delta * step)
  return normaliseHoursValue(nextValue)
}

export function formatHoursValue(value) {
  const numericValue = clampHoursValue(value)
  return formatRoundedHoursValue(numericValue)
}

export function formatTotalHoursValue(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return formatRoundedHoursValue(0)
  return formatRoundedHoursValue(roundHours(numericValue))
}

export function rowHasValues(row) {
  return Object.values(row.hours ?? {}).some((value) => String(value ?? '').trim() !== '')
}

export function serializeEntries(entries = []) {
  return JSON.stringify(
    [...entries]
      .map((entry) => ({
        date: entry.date,
        entryKind: entry.entryKind,
        assignmentId: entry.assignmentId ?? null,
        hoursWorked: Number(entry.hoursWorked),
      }))
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        if (a.entryKind !== b.entryKind) return a.entryKind.localeCompare(b.entryKind)
        if ((a.assignmentId ?? '') !== (b.assignmentId ?? '')) {
          return (a.assignmentId ?? '').localeCompare(b.assignmentId ?? '')
        }
        return a.hoursWorked - b.hoursWorked
      })
  )
}
