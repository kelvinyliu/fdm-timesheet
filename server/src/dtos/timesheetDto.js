import { entryDto } from './entryDto.js'
import { formatDateOnly } from '../utils/dateOnly.js'

export function workSummaryDto(row) {
  const dto = {
    entryKind: row.entry_kind,
    assignmentId: row.assignment_id ?? null,
    bucketLabel: row.bucket_label ?? null,
    totalHours: parseFloat(row.total_hours),
  }

  const suggestedHourlyRate = row.suggested_hourly_rate ?? row.suggestedHourlyRate
  if (suggestedHourlyRate !== undefined) {
    dto.suggestedHourlyRate = suggestedHourlyRate == null ? null : parseFloat(suggestedHourlyRate)
  }

  return dto
}

export function timesheetDto(row, workSummary = []) {
  return {
    id: row.timesheet_id,
    consultantId: row.consultant_id,
    consultantName: row.consultant_name ?? null,
    assignmentId: row.assignment_id,
    assignmentClientName: row.assignment_client_name ?? null,
    weekStart: formatDateOnly(row.week_start),
    status: row.status,
    rejectionComment: row.rejection_comment ?? null,
    totalHours: row.total_hours !== undefined ? parseFloat(row.total_hours) : null,
    workSummary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function timesheetWithEntriesDto(row, entries, workSummary = []) {
  const totalHours = entries.reduce((sum, e) => sum + parseFloat(e.hours_worked || 0), 0)
  return {
    ...timesheetDto(row, workSummary),
    totalHours,
    entries: entries.map(entryDto),
  }
}
