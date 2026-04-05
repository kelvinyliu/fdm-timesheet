import { formatDateOnly } from '../utils/dateOnly.js'

export function entryDto(row) {
  return {
    id: row.entry_id,
    date: formatDateOnly(row.entry_date),
    hoursWorked: parseFloat(row.hours_worked),
  }
}
