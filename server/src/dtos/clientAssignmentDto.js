export function clientAssignmentDto(row) {
  return {
    id: row.assignment_id,
    consultantId: row.consultant_id,
    clientName: row.client_name,
    hourlyRate: parseFloat(row.hourly_rate),
    createdAt: row.created_at,
  }
}
