import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { palette } from '../../theme.js'
import { formatDayName } from '../../utils/dateFormatters'
import { getWorkBucketDisplayLabel } from '../../utils/displayLabels'
import { getMatrixRowTotal } from '../../utils/timesheetMatrix.js'

export default function WeeklyMatrix({
  rows,
  weekDates,
  totalHours,
  emptyMessage = '',
}) {
  if (rows.length === 0 && emptyMessage) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', borderStyle: 'dashed' }}>
        <Typography variant="body2" color="text.secondary">
          {emptyMessage}
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper sx={{ mb: 3, p: { xs: 0, sm: 0 }, overflow: 'hidden' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: palette.sidebarBg, color: palette.textInverse }}>
        <Typography variant="h6" sx={{ color: palette.textInverse }}>Weekly Matrix</Typography>
        <Typography variant="h6" sx={{ fontFamily: '"JetBrains Mono", monospace', color: palette.primary }}>
          {totalHours ?? '-'}h Total
        </Typography>
      </Box>
      <TableContainer sx={{ borderTop: `2px solid ${palette.borderStrong}` }}>
        <Table size="small" sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 250, borderRight: `2px solid ${palette.border}` }}>Work Category</TableCell>
              {weekDates.map((date) => (
                <TableCell key={date} align="center" sx={{ width: 80, borderRight: `2px solid ${palette.border}` }}>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: palette.textPrimary }}>
                    {formatDayName(date).slice(0, 3)}
                  </Typography>
                  <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', color: palette.textMuted }}>
                    {date.slice(5)}
                  </Typography>
                </TableCell>
              ))}
              <TableCell align="center" sx={{ width: 80 }}>Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const rowTotal = getMatrixRowTotal(row, weekDates)

              return (
                <TableRow key={row.id}>
                  <TableCell sx={{ borderRight: `2px solid ${palette.border}`, fontWeight: 600 }}>
                    {getWorkBucketDisplayLabel(row.bucketLabel)}
                  </TableCell>
                  {weekDates.map((date) => {
                    const val = row.hours[date]
                    return (
                      <TableCell key={date} align="center" sx={{ p: 1, borderRight: `2px solid ${palette.border}` }}>
                        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', color: val ? palette.textPrimary : palette.textMuted }}>
                          {val || '-'}
                        </Typography>
                      </TableCell>
                    )
                  })}
                  <TableCell align="center">
                    <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}>
                      {rowTotal.toFixed(2)}
                    </Typography>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}
