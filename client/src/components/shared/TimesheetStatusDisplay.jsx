import Stack from '@mui/material/Stack'
import StatusBadge from './StatusBadge.jsx'
import LateBadge from './LateBadge.jsx'

export default function TimesheetStatusDisplay({ status, submittedLate }) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={0.5}
      useFlexGap
      alignItems="center"
      sx={{ flexShrink: 0, flexWrap: 'nowrap' }}
    >
      <StatusBadge status={status} />
      {submittedLate && <LateBadge />}
    </Stack>
  )
}
