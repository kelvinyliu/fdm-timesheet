export function entryDto(row) {
  return {
    id: row.entry_id,
    date: row.entry_date,
    hoursWorked: parseFloat(row.hours_worked),
  }
}
