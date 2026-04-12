import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import { palette } from '../../theme.js'
import { formatDayName } from '../../utils/dateFormatters'
import { getWorkBucketDisplayLabel } from '../../utils/displayLabels'
import {
  buildDayCardData,
  formatHoursValue,
  formatTotalHoursValue,
  getMatrixRowTotal,
} from '../../utils/timesheetMatrix.js'

const DAILY_HOURS_LIMIT = 24

function getDayCardStyles(hasHours, isOverLimit) {
  return {
    p: 2,
    border: '1px solid',
    borderColor: isOverLimit ? palette.error : hasHours ? palette.primary : palette.border,
    backgroundColor: isOverLimit ? palette.errorBg : hasHours ? palette.surfaceRaised : palette.surfaceMuted,
    boxShadow: (hasHours || isOverLimit) ? palette.shadowSoft : 'none',
    transform: hasHours ? 'translateY(-1px)' : 'none',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
  }
}

export default function WeeklyMatrix({
  rows,
  weekDates,
  totalHours,
  emptyMessage = '',
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  if (rows.length === 0 && emptyMessage) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', borderStyle: 'dashed' }}>
        <Typography variant="body2" color="text.secondary">
          {emptyMessage}
        </Typography>
      </Paper>
    )
  }

  const dayCards = buildDayCardData(rows, weekDates)

  return (
    <Paper sx={{ mb: 3, p: 0, overflow: 'hidden' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: palette.sidebarBg, color: palette.textInverse }}>
        <Typography variant="h6" sx={{ color: palette.textInverse }}>Weekly Matrix</Typography>
        <Typography variant="h6" sx={{ fontFamily: '"JetBrains Mono", monospace', color: palette.primary }}>
          {totalHours ?? '-'}h Total
        </Typography>
      </Box>

      {isMobile ? (
        <Stack spacing={1.5} sx={{ p: 2, borderTop: `2px solid ${palette.borderStrong}` }}>
          {dayCards.map((day) => {
            const hasHours = day.totalHours > 0
            const isOverLimit = day.totalHours > DAILY_HOURS_LIMIT

            return (
              <Paper key={day.date} variant="outlined" sx={getDayCardStyles(hasHours, isOverLimit)}>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: isOverLimit ? palette.error : hasHours ? palette.textPrimary : palette.textSecondary }}>
                        {day.dayLabel}
                      </Typography>
                      <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', color: palette.textMuted }}>
                        {day.shortDate}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontWeight: 700,
                        color: isOverLimit ? palette.error : hasHours ? palette.textPrimary : palette.textMuted,
                      }}
                    >
                      {formatTotalHoursValue(day.totalHours)}h
                    </Typography>
                  </Box>

                  {isOverLimit && (
                    <Typography variant="caption" sx={{ color: palette.error, fontWeight: 600, letterSpacing: '0.03em' }}>
                      Over daily limit
                    </Typography>
                  )}

                  <Stack spacing={1}>
                    {day.categories.map((category) => (
                      <Box
                        key={`${day.date}-${category.rowId}`}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 1.5,
                          py: 1,
                          borderTop: `1px solid ${palette.border}`,
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {getWorkBucketDisplayLabel(category.bucketLabel)}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontWeight: 700,
                            color: category.numericHours > 0 ? palette.textPrimary : palette.textMuted,
                          }}
                        >
                          {category.numericHours > 0 ? formatHoursValue(category.numericHours) : '-'}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            )
          })}
        </Stack>
      ) : (
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
      )}
    </Paper>
  )
}
