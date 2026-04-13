import { formatLongDate } from './dateFormatters'

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

export function getConsultantDisplayLabel(consultantName) {
  return hasText(consultantName) ? consultantName : 'Unknown consultant'
}

export function getSubmitterDisplayLabel(submitterName) {
  return hasText(submitterName) ? submitterName : 'Unknown submitter'
}

export function getClientAssignmentDisplayLabel(clientName) {
  return hasText(clientName) ? clientName : 'Unknown client assignment'
}

export function getWorkBucketDisplayLabel(bucketLabel) {
  return hasText(bucketLabel) ? bucketLabel : 'Internal'
}

export function getWorkSummaryDisplayLabel(workSummary = [], maxItems = 2) {
  if (!Array.isArray(workSummary) || workSummary.length === 0) return 'No work categories'

  const labels = workSummary
    .map((item) => getWorkBucketDisplayLabel(item.bucketLabel))
    .filter(Boolean)

  if (labels.length <= maxItems) return labels.join(', ')

  return `${labels.slice(0, maxItems).join(', ')} +${labels.length - maxItems} more`
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
