export const INTERNAL_BUCKET_VALUE = 'INTERNAL'

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

export function getMatrixTotalHours(rows = [], weekDates = []) {
  return rows.reduce((sum, row) => sum + getMatrixRowTotal(row, weekDates), 0)
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
