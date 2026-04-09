export function paymentDto(row) {
  return {
    id: row.payment_id,
    timesheetId: row.timesheet_id,
    processedBy: row.processed_by,
    hourlyRate: row.daily_rate == null ? null : parseFloat(row.daily_rate),
    amount: parseFloat(row.amount),
    status: row.status,
    breakdowns: (row.breakdowns ?? []).map((breakdown) => ({
      entryKind: breakdown.entryKind,
      assignmentId: breakdown.assignmentId ?? null,
      bucketLabel: breakdown.bucketLabel,
      hoursWorked: parseFloat(breakdown.hoursWorked),
      hourlyRate: parseFloat(breakdown.hourlyRate),
      amount: parseFloat(breakdown.amount),
    })),
    createdAt: row.created_at,
  }
}
