import Chip from '@mui/material/Chip'

const colorMap = {
  DRAFT: 'default',
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  COMPLETED: 'info',
}

export default function StatusBadge({ status }) {
  const color = colorMap[status] ?? 'default'
  return <Chip label={status} color={color} size="small" />
}
