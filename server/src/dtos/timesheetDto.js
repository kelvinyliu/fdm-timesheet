import { entryDto } from './entryDto.js'
import { formatDateOnly } from '../utils/dateOnly.js'

export function workSummaryDto(row) {
  const dto = {
    entryKind: row.entry_kind,
    assignmentId: row.assignment_id ?? null,
    bucketLabel: row.bucket_label ?? null,
    totalHours: parseFloat(row.total_hours),
  }

  const suggestedBillRate = row.suggested_bill_rate ?? row.suggestedBillRate
  if (suggestedBillRate !== undefined) {
    dto.suggestedBillRate = suggestedBillRate == null ? null : parseFloat(suggestedBillRate)
  }

  const suggestedPayRate = row.suggested_pay_rate ?? row.suggestedPayRate
  if (suggestedPayRate !== undefined) {
    dto.suggestedPayRate = suggestedPayRate == null ? null : parseFloat(suggestedPayRate)
  }

  return dto
}

export function timesheetDto(row, workSummary = [], options = {}) {
  const includeFinanceReturn = options.includeFinanceReturn === true
  const dto = {
    id: row.timesheet_id,
    consultantId: row.consultant_id,
    consultantName: row.consultant_name ?? null,
    assignmentId: row.assignment_id,
    assignmentClientName: row.assignment_client_name ?? null,
    weekStart: formatDateOnly(row.week_start),
    status: row.status,
    submittedAt: row.submitted_at ?? null,
    submittedLate: Boolean(row.submitted_late),
    rejectionComment: row.rejection_comment ?? null,
    totalHours: row.total_hours !== undefined ? parseFloat(row.total_hours) : null,
    workSummary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }

  if (includeFinanceReturn) {
    dto.financeReturnComment = row.finance_return_comment ?? null
    dto.financeReturnedAt = row.finance_returned_at ?? null
    dto.financeReturnedByName = row.finance_returned_by_name ?? null
  }

  if (
    row.total_bill_amount != null ||
    row.total_pay_amount != null ||
    row.margin_amount != null
  ) {
    dto.totalBillAmount = row.total_bill_amount == null ? null : parseFloat(row.total_bill_amount)
    dto.totalPayAmount = row.total_pay_amount == null ? null : parseFloat(row.total_pay_amount)
    dto.marginAmount = row.margin_amount == null ? null : parseFloat(row.margin_amount)
  }

  return dto
}

export function timesheetWithEntriesDto(row, entries, workSummary = [], options = {}) {
  const totalHours = entries.reduce((sum, e) => sum + parseFloat(e.hours_worked || 0), 0)
  return {
    ...timesheetDto(row, workSummary, options),
    totalHours,
    entries: entries.map(entryDto),
  }
}
