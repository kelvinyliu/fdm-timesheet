export function clientAssignmentDto(row) {
  return {
    id: row.assignment_id,
    consultantId: row.consultant_id,
    clientName: row.client_name,
    clientBillRate: parseFloat(row.client_bill_rate),
    createdAt: row.created_at,
  }
}

export function consultantClientAssignmentDto(row) {
  return {
    id: row.assignment_id,
    consultantId: row.consultant_id,
    clientName: row.client_name,
    createdAt: row.created_at,
  }
}
