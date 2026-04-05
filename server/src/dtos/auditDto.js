import { formatDateOnly } from '../utils/dateOnly.js'

export function auditDto(row) {
  return {
    id:           row.audit_id,
    action:       row.action,
    performedBy:  row.performed_by ?? null,
    performedByName: row.performed_by_name ?? null,
    timesheetId:  row.timesheet_id ?? null,
    timesheetConsultantName: row.timesheet_consultant_name ?? null,
    timesheetWeekStart: row.timesheet_week_start ? formatDateOnly(row.timesheet_week_start) : null,
    detail:       row.detail ?? null,
    createdAt:    row.created_at,
  }
}
