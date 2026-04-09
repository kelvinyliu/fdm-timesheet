import { formatLongDate } from './dateFormatters'

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

export function getConsultantDisplayLabel(consultantName) {
  return hasText(consultantName) ? consultantName : 'Unknown consultant'
}

export function getClientAssignmentDisplayLabel(clientName) {
  return hasText(clientName) ? clientName : 'Unknown client assignment'
}

export function getAuditActorDisplayLabel(performedByName) {
  return hasText(performedByName) ? performedByName : 'Deleted user'
}

export function getAuditTimesheetDisplayLabel({ consultantName, weekStart }) {
  if (hasText(consultantName) && hasText(weekStart)) {
    return `${consultantName} · week of ${formatLongDate(weekStart)}`
  }

  if (hasText(weekStart)) {
    return `Week of ${formatLongDate(weekStart)}`
  }

  return 'Deleted timesheet'
}

export function getTimesheetStatusDisplayLabel(status) {
  switch (status) {
    case 'COMPLETED':
      return 'Paid'
    case 'DRAFT':
      return 'Draft'
    case 'PENDING':
      return 'Pending'
    case 'APPROVED':
      return 'Approved'
    case 'REJECTED':
      return 'Rejected'
    default:
      return status ?? 'Unknown'
  }
}
