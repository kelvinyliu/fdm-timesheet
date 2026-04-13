import Stack from '@mui/material/Stack'
import StatusBadge from './StatusBadge.jsx'
import LateBadge from './LateBadge.jsx'

export default function TimesheetStatusDisplay({ status, submittedLate }) {
  return (
    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center" justifyContent="center">
      <StatusBadge status={status} />
      {submittedLate && <LateBadge />}
    </Stack>
  )
}
