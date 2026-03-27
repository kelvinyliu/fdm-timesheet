export function auditDto(row) {
  return {
    id:           row.audit_id,
    action:       row.action,
    performedBy:  row.performed_by ?? null,
    performedByName: row.performed_by_name ?? null,
    timesheetId:  row.timesheet_id ?? null,
    detail:       row.detail ?? null,
    createdAt:    row.created_at,
  }
}
