export function paymentDto(row) {
  return {
    id: row.payment_id,
    timesheetId: row.timesheet_id,
    processedBy: row.processed_by,
    totalBillAmount: parseFloat(row.total_bill_amount),
    totalPayAmount: parseFloat(row.total_pay_amount),
    marginAmount: parseFloat(row.margin_amount),
    status: row.status,
    breakdowns: (row.breakdowns ?? []).map((breakdown) => ({
      entryKind: breakdown.entryKind,
      assignmentId: breakdown.assignmentId ?? null,
      bucketLabel: breakdown.bucketLabel,
      hoursWorked: parseFloat(breakdown.hoursWorked),
      billRate: parseFloat(breakdown.billRate),
      billAmount: parseFloat(breakdown.billAmount),
      payRate: parseFloat(breakdown.payRate),
      payAmount: parseFloat(breakdown.payAmount),
      marginAmount: parseFloat(breakdown.marginAmount),
    })),
    createdAt: row.created_at,
  }
}
