export function financialNoteDto(row) {
  return {
    id: row.note_id,
    timesheetId: row.timesheet_id,
    authoredBy: row.authored_by,
    authoredByName: row.authored_by_name ?? null,
    note: row.note,
    createdAt: row.created_at,
  }
}
