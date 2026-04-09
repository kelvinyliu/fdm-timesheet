export function paymentDto(row) {
  return {
    id: row.payment_id,
    timesheetId: row.timesheet_id,
    processedBy: row.processed_by,
    hourlyRate: parseFloat(row.daily_rate),
    amount: parseFloat(row.amount),
    status: row.status,
    createdAt: row.created_at,
  }
}
