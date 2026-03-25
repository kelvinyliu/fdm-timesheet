import { entryDto } from './entryDto.js'

export function timesheetDto(row) {
  return {
    id: row.timesheet_id,
    consultantId: row.consultant_id,
    assignmentId: row.assignment_id,
    weekStart: row.week_start,
    status: row.status,
    rejectionComment: row.rejection_comment ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function timesheetWithEntriesDto(row, entries) {
  return { ...timesheetDto(row), entries: entries.map(entryDto) }
}
