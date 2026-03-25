export function managerAssignmentDto(row) {
  return {
    id: row.id,
    managerId: row.manager_id,
    managerName: row.manager_name,
    consultantId: row.consultant_id,
    consultantName: row.consultant_name,
    assignedAt: row.assigned_at,
  }
}
