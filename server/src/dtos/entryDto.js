export function entryDto(row) {
  return {
    id: row.entry_id,
    date: row.entry_date instanceof Date ? row.entry_date.toISOString().slice(0, 10) : row.entry_date,
    hoursWorked: parseFloat(row.hours_worked),
  }
}
