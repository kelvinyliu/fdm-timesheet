import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableFooter from '@mui/material/TableFooter'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import { palette } from '../../theme.js'
import { formatDayName, formatShortUkDate } from '../../utils/dateFormatters'
import { getWorkBucketDisplayLabel } from '../../utils/displayLabels'
import {
  buildDayCardData,
  formatHoursValue,
  formatTotalHoursValue,
  getMatrixDayTotals,
  getMatrixRowTotal,
} from '../../utils/timesheetMatrix.js'

const DAILY_HOURS_LIMIT = 24

function getDayCardStyles(hasHours, isOverLimit) {
  return {
    position: 'relative',
    p: { xs: 2.5, sm: 3 },
    borderRadius: 3,
    border: '1px solid',
    borderColor: isOverLimit ? palette.error : hasHours ? palette.borderStrong : palette.border,
    backgroundColor: isOverLimit
      ? palette.errorBg
      : hasHours
        ? palette.surface
        : palette.surfaceMuted,
    boxShadow: 'none',
    transition: 'all 0.2s ease',
    overflow: 'hidden',
    '&::before':
      hasHours || isOverLimit
        ? {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: 4,
            backgroundColor: isOverLimit ? palette.error : palette.primary,
            opacity: 0.8,
          }
        : {},
  }
}

export default function WeeklyMatrix({
  rows,
  weekDates,
  totalHours,
  emptyMessage = 'No hours logged for this period.',
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const dayCards = buildDayCardData(rows, weekDates)
  const dayTotals = getMatrixDayTotals(rows, weekDates)

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 4,
        borderRadius: 3,
        overflow: 'hidden',
        border: `1px solid ${palette.border}`,
        boxShadow: palette.shadowSoft,
      }}
    >
      <Box
        sx={{
          p: { xs: 2.5, sm: 3 },
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: palette.surface,
          borderBottom: `1px solid ${palette.border}`,
        }}
      >
        <Typography
          sx={{
            fontFamily: '"Outfit", system-ui, sans-serif',
            fontSize: '1.85rem',
            fontWeight: 400,
            color: palette.textPrimary,
            lineHeight: 1,
          }}
        >
          Weekly Timesheet
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '1.6rem',
              fontWeight: 700,
              color: totalHours > 0 ? palette.textPrimary : palette.textMuted,
              lineHeight: 1,
            }}
          >
            {formatTotalHoursValue(totalHours)}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: palette.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 600,
            }}
          >
            Total Hours
          </Typography>
        </Box>
      </Box>

      {isMobile ? (
        <Stack spacing={2} sx={{ p: { xs: 2, sm: 3 }, backgroundColor: palette.bg }}>
          {rows.length === 0 ? (
            <Box
              sx={{
                p: 4,
                textAlign: 'center',
                backgroundColor: palette.surface,
                borderRadius: 2,
                border: `1px dashed ${palette.border}`,
              }}
            >
              <Typography
                sx={{
                  fontFamily: '"Outfit", system-ui, sans-serif',
                  fontSize: '1.5rem',
                  color: palette.textSecondary,
                  mb: 1,
                }}
              >
                No Entries Found
              </Typography>
              <Typography variant="body2" sx={{ color: palette.textMuted }}>
                {emptyMessage}
              </Typography>
            </Box>
          ) : (
            dayCards.map((day) => {
              const hasHours = day.totalHours > 0
              const isOverLimit = day.totalHours > DAILY_HOURS_LIMIT

              return (
                <Paper key={day.date} elevation={0} sx={getDayCardStyles(hasHours, isOverLimit)}>
                  <Stack spacing={2}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box>
                        <Typography
                          sx={{
                            fontFamily: '"Outfit", system-ui, sans-serif',
                            fontSize: '1.4rem',
                            color: isOverLimit
                              ? palette.error
                              : hasHours
                                ? palette.textPrimary
                                : palette.textSecondary,
                            lineHeight: 1.2,
                          }}
                        >
                          {day.dayLabel}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: '"Outfit", system-ui, sans-serif',
                            color: palette.textMuted,
                            fontSize: '0.8rem',
                            mt: 0.5,
                            display: 'block',
                          }}
                        >
                          {day.shortDate}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '1.4rem',
                            fontWeight: 700,
                            color: isOverLimit
                              ? palette.error
                              : hasHours
                                ? palette.textPrimary
                                : palette.textMuted,
                            lineHeight: 1,
                          }}
                        >
                          {formatTotalHoursValue(day.totalHours)}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            fontWeight: 600,
                            color: isOverLimit
                              ? palette.error
                              : hasHours
                                ? palette.textSecondary
                                : palette.textMuted,
                          }}
                        >
                          {isOverLimit ? 'Over daily limit' : 'Hours'}
                        </Typography>
                      </Box>
                    </Box>

                    {day.categories.length > 0 && (
                      <Stack spacing={1.5} sx={{ pt: 1 }}>
                        {day.categories.map((category) => (
                          <Box
                            key={`${day.date}-${category.rowId}`}
                            sx={{
                              pt: 1.5,
                              borderTop: `1px solid ${palette.border}`,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <Typography
                              sx={{
                                fontWeight: 500,
                                fontSize: '0.9rem',
                                color: palette.textSecondary,
                              }}
                            >
                              {getWorkBucketDisplayLabel(category.bucketLabel)}
                            </Typography>
                            <Typography
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontWeight: 700,
                                fontSize: '1rem',
                                color:
                                  category.numericHours > 0
                                    ? palette.textPrimary
                                    : palette.textMuted,
                              }}
                            >
                              {category.numericHours > 0
                                ? formatHoursValue(category.numericHours)
                                : '-'}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Stack>
                </Paper>
              )
            })
          )}
        </Stack>
      ) : (
        <TableContainer
          sx={{ borderTop: `1px solid ${palette.border}`, borderRadius: 0, boxShadow: 'none' }}
        >
          <Table size="medium" sx={{ minWidth: 940 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: palette.surfaceMuted }}>
                <TableCell
                  sx={{
                    width: 320,
                    borderRight: `1px solid ${palette.border}`,
                    py: 2.5,
                    px: 3,
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 600,
                      color: palette.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontSize: '0.8rem',
                    }}
                  >
                    Work Category
                  </Typography>
                </TableCell>
                {weekDates.map((date) => (
                  <TableCell
                    key={date}
                    align="center"
                    sx={{
                      width: 88,
                      minWidth: 88,
                      borderRight: `1px solid ${palette.border}`,
                      py: 2,
                      px: 1.5,
                    }}
                  >
                    <Typography
                      sx={{
                        display: 'block',
                        fontWeight: 700,
                        color: palette.textPrimary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontSize: '0.95rem',
                      }}
                    >
                      {formatDayName(date).slice(0, 3)}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        color: palette.textMuted,
                        fontSize: '0.82rem',
                        mt: 0.5,
                      }}
                    >
                      {formatShortUkDate(date)}
                    </Typography>
                  </TableCell>
                ))}
                <TableCell
                  align="center"
                  sx={{
                    width: 100,
                    backgroundColor: palette.surfaceRaised,
                    py: 2,
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 600,
                      color: palette.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontSize: '0.8rem',
                    }}
                  >
                    Total
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                    <Box sx={{ maxWidth: 300, mx: 'auto' }}>
                      <Typography
                        sx={{
                          fontFamily: '"Outfit", system-ui, sans-serif',
                          fontSize: '1.5rem',
                          color: palette.textSecondary,
                          mb: 1,
                        }}
                      >
                        No Entries Found
                      </Typography>
                      <Typography variant="body2" sx={{ color: palette.textMuted }}>
                        {emptyMessage}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const rowTotal = getMatrixRowTotal(row, weekDates)
                  return (
                    <TableRow
                      key={row.id}
                      sx={{ '&:hover': { backgroundColor: palette.surfaceRaised } }}
                    >
                      <TableCell sx={{ borderRight: `1px solid ${palette.border}`, px: 3, py: 2 }}>
                        <Typography sx={{ fontWeight: 500, color: palette.textPrimary }}>
                          {getWorkBucketDisplayLabel(row.bucketLabel)}
                        </Typography>
                      </TableCell>
                      {weekDates.map((date) => {
                        const val = row.hours[date]
                        return (
                          <TableCell
                            key={date}
                            align="center"
                            sx={{ p: 1, borderRight: `1px solid ${palette.border}` }}
                          >
                            <Typography
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontWeight: val > 0 ? 600 : 400,
                                fontSize: '1rem',
                                color: val > 0 ? palette.textPrimary : palette.textMuted,
                              }}
                            >
                              {val > 0 ? formatHoursValue(val) : '-'}
                            </Typography>
                          </TableCell>
                        )
                      })}
                      <TableCell
                        align="center"
                        sx={{
                          backgroundColor: palette.surfaceRaised,
                          py: 2,
                        }}
                      >
                        <Typography
                          sx={{
                            fontFamily: 'JetBrains Mono, Georgia, serif',
                            fontSize: '1.3rem',
                            fontWeight: 500,
                            color: rowTotal > 0 ? palette.textPrimary : palette.textMuted,
                          }}
                        >
                          {formatTotalHoursValue(rowTotal)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
            {rows.length > 0 && (
              <TableFooter>
                <TableRow sx={{ backgroundColor: palette.surfaceMuted }}>
                  <TableCell
                    sx={{
                      borderRight: `1px solid ${palette.border}`,
                      px: 3,
                      py: 2,
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 600,
                        color: palette.textSecondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontSize: '0.8rem',
                      }}
                    >
                      Daily Total
                    </Typography>
                  </TableCell>
                  {dayTotals.map((day) => {
                    const isOverLimit = day.totalHours > DAILY_HOURS_LIMIT

                    return (
                      <TableCell
                        key={day.date}
                        align="center"
                        sx={{
                          borderRight: `1px solid ${palette.border}`,
                          py: 1.5,
                          backgroundColor: isOverLimit ? palette.errorBg : palette.surfaceMuted,
                        }}
                      >
                        <Typography
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontWeight: 700,
                            color: isOverLimit ? palette.error : palette.textPrimary,
                          }}
                        >
                          {formatTotalHoursValue(day.totalHours)}
                        </Typography>
                        {isOverLimit && (
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              mt: 0.5,
                              color: palette.error,
                              fontWeight: 600,
                            }}
                          >
                            Over daily limit
                          </Typography>
                        )}
                      </TableCell>
                    )
                  })}
                  <TableCell
                    align="center"
                    sx={{
                      backgroundColor: palette.surfaceMuted,
                      py: 1.5,
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: 'JetBrains Mono, Georgia, serif',
                        fontSize: '1.3rem',
                        fontWeight: 500,
                        color: totalHours > 0 ? palette.textPrimary : palette.textMuted,
                      }}
                    >
                      {formatTotalHoursValue(totalHours)}
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </TableContainer>
      )}
    </Paper>
  )
}
