import { entryDto } from './entryDto.js'

export function timesheetDto(row) {
  return {
    id: row.timesheet_id,
    consultantId: row.consultant_id,
    assignmentId: row.assignment_id,
    weekStart: row.week_start instanceof Date ? row.week_start.toISOString().slice(0, 10) : row.week_start,
    status: row.status,
    rejectionComment: row.rejection_comment ?? null,
    totalHours: row.total_hours !== undefined ? parseFloat(row.total_hours) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function timesheetWithEntriesDto(row, entries) {
  const totalHours = entries.reduce((sum, e) => sum + parseFloat(e.hours_worked || 0), 0)
  return { ...timesheetDto(row), totalHours, entries: entries.map(entryDto) }
}
