import { formatDateOnly } from '../utils/dateOnly.js'

export function entryDto(row) {
  return {
    id: row.entry_id,
    date: formatDateOnly(row.entry_date),
    entryKind: row.entry_kind,
    assignmentId: row.assignment_id ?? null,
    bucketLabel: row.bucket_label ?? null,
    hoursWorked: parseFloat(row.hours_worked),
  }
}
