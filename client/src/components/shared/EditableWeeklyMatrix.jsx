import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import InputBase from '@mui/material/InputBase'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableFooter from '@mui/material/TableFooter'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { Tooltip } from '@mui/material'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { palette } from '../../theme.js'
import { formatDayName, formatShortUkDate } from '../../utils/dateFormatters'
import {
  adjustHoursValue,
  buildDayCardData,
  formatTotalHoursValue,
  getBucketValue,
  getMatrixDayTotals,
  getMatrixRowTotal,
  getUsedBucketValues,
} from '../../utils/timesheetMatrix.js'

const MOBILE_HOURS_STEP = 0.25
const DAILY_HOURS_LIMIT = 24
const DESKTOP_WORK_CATEGORY_COLUMN_WIDTH = 200
const DESKTOP_DAY_COLUMN_WIDTH = 65
const DESKTOP_TOTAL_COLUMN_WIDTH = 100
const DESKTOP_ACTION_COLUMN_WIDTH = 70
const DESKTOP_NUMERIC_CELL_WIDTH = '6ch'

function getAssignmentOptionLabel(assignment) {
  if (!assignment) return 'Unknown client assignment'
  return assignment.archived ? `${assignment.clientName} (Archived)` : assignment.clientName
}

function getDayCardStyles(hasHours, isOverLimit) {
  return {
    position: 'relative',
    p: { xs: 2.5, sm: 3 },
    borderRadius: 3,
    border: '1px solid',
    borderColor: isOverLimit ? palette.error : hasHours ? palette.primary : palette.border,
    backgroundColor: isOverLimit
      ? palette.errorBg
      : hasHours
        ? palette.surface
        : palette.surfaceMuted,
    boxShadow: isOverLimit
      ? `0 12px 24px -4px rgba(229, 92, 88, 0.16)`
      : hasHours
        ? `0 12px 24px -4px ${palette.overlayPrimarySoft}`
        : 'none',
    transform: hasHours ? 'translateY(-2px)' : 'none',
    transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
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
          }
        : {},
  }
}

function MobileHourStepper({ date, isBusy, rowId, value, onRowHoursChange }) {
  const numericValue = parseFloat(value) || 0
  const isActive = numericValue > 0

  return (
    <Stack
      direction="row"
      alignItems="center"
      sx={{
        backgroundColor: isActive ? palette.surface : palette.surfaceMuted,
        borderRadius: 2,
        border: `1px solid ${isActive ? palette.primary : palette.borderStrong}`,
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        boxShadow: isActive ? `0 2px 8px ${palette.overlayPrimarySoft}` : 'none',
      }}
    >
      <Button
        aria-label={`Decrease hours for ${date}`}
        disabled={isBusy || numericValue <= 0}
        onClick={() =>
          onRowHoursChange(rowId, date, adjustHoursValue(value, -1, MOBILE_HOURS_STEP))
        }
        sx={{
          minWidth: 44,
          width: 44,
          height: 44,
          px: 0,
          borderRadius: 0,
          borderRight: `1px solid ${isActive ? palette.overlayPrimaryMuted : palette.borderStrong}`,
          color: palette.textPrimary,
          '&:hover': { backgroundColor: palette.overlayTextSoft },
        }}
      >
        -
      </Button>
      <InputBase
        type="number"
        value={value}
        disabled={isBusy}
        onChange={(event) => onRowHoursChange(rowId, date, event.target.value)}
        inputProps={{
          'aria-label': `Hours for ${date}`,
          inputMode: 'decimal',
          min: 0,
          max: DAILY_HOURS_LIMIT,
          step: '0.25',
        }}
        sx={{
          flex: 1,
          minWidth: 72,
          px: 1,
          '& input': {
            padding: '12px 4px',
            textAlign: 'center',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '1rem',
            fontWeight: isActive ? 700 : 500,
            color: isActive ? palette.primaryContrast : palette.textSecondary,
          },
          '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
            WebkitAppearance: 'none',
            margin: 0,
          },
          '& input[type=number]': {
            MozAppearance: 'textfield',
          },
        }}
      />
      <Button
        aria-label={`Increase hours for ${date}`}
        disabled={isBusy || numericValue >= DAILY_HOURS_LIMIT}
        onClick={() => onRowHoursChange(rowId, date, adjustHoursValue(value, 1, MOBILE_HOURS_STEP))}
        sx={{
          minWidth: 44,
          width: 44,
          height: 44,
          px: 0,
          borderRadius: 0,
          borderLeft: `1px solid ${isActive ? palette.overlayPrimaryMuted : palette.borderStrong}`,
          color: palette.textPrimary,
          '&:hover': { backgroundColor: palette.overlayTextSoft },
        }}
      >
        +
      </Button>
    </Stack>
  )
}

export default function EditableWeeklyMatrix({
  rows,
  weekDates,
  totalHours,
  availableAssignments,
  canChangeBuckets,
  isBusy,
  onAddRow,
  onRemoveRow,
  onRowCategoryChange,
  onRowHoursChange,
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const dayCards = buildDayCardData(rows, weekDates)
  const dayTotals = getMatrixDayTotals(rows, weekDates)
  const desktopTableMinWidth =
    DESKTOP_WORK_CATEGORY_COLUMN_WIDTH +
    weekDates.length * DESKTOP_DAY_COLUMN_WIDTH +
    DESKTOP_TOTAL_COLUMN_WIDTH +
    DESKTOP_ACTION_COLUMN_WIDTH
  const assignmentMap = new Map(
    availableAssignments.map((assignment) => [assignment.id, assignment])
  )
  const canAddMoreBuckets = getUsedBucketValues(rows).size < availableAssignments.length + 1

  function getRowLabel(row) {
    if (row.entryKind === 'INTERNAL') return 'Internal'
    return getAssignmentOptionLabel(assignmentMap.get(row.assignmentId))
  }

  function isBucketDisabled(rowId, bucketValue) {
    return getUsedBucketValues(rows, rowId).has(bucketValue)
  }

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 4,
        borderRadius: 3,
        overflow: 'hidden',
        border: `1px solid ${palette.borderStrong}`,
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
          borderBottom: `2px solid ${palette.borderStrong}`,
        }}
      >
        <Typography
          sx={{
            fontFamily: '"Instrument Serif", Georgia, serif',
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
              color: totalHours > 0 ? palette.primaryContrast : palette.textMuted,
              lineHeight: 1,
            }}
          >
            {totalHours.toFixed(2)}
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
        <>
          <Box
            sx={{
              p: { xs: 2.5, sm: 3 },
              backgroundColor: palette.surfaceMuted,
              borderBottom: `1px solid ${palette.border}`,
            }}
          >
            <Stack spacing={2}>
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 600, color: palette.textPrimary, mb: 0.5 }}
                >
                  Work Categories
                </Typography>
                <Typography variant="body2" sx={{ color: palette.textSecondary }}>
                  Set up your categories below, then assign hours day by day.
                </Typography>
              </Box>

              {rows.length === 0 ? (
                <Box
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    backgroundColor: palette.surface,
                    borderRadius: 2,
                    border: `1px dashed ${palette.borderStrong}`,
                  }}
                >
                  <Typography variant="body2" sx={{ color: palette.textSecondary }}>
                    No rows added yet. Let's start by adding a work category.
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={1.5}>
                  {rows.map((row) => (
                    <Paper
                      key={row.id}
                      elevation={0}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        border: `1px solid ${palette.border}`,
                        backgroundColor: palette.surface,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ flex: 1 }}>
                          {canChangeBuckets ? (
                            <TextField
                              select
                              variant="outlined"
                              size="small"
                              value={getBucketValue(row.entryKind, row.assignmentId)}
                              onChange={(e) => onRowCategoryChange(row.id, e.target.value)}
                              disabled={isBusy}
                              fullWidth
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 1.5,
                                  backgroundColor: palette.surface,
                                },
                              }}
                            >
                              {availableAssignments.map((assignment) => (
                                <MenuItem
                                  key={assignment.id}
                                  value={assignment.id}
                                  disabled={isBucketDisabled(row.id, assignment.id)}
                                >
                                  {getAssignmentOptionLabel(assignment)}
                                </MenuItem>
                              ))}
                              <MenuItem
                                value="INTERNAL"
                                disabled={isBucketDisabled(row.id, 'INTERNAL')}
                              >
                                Internal
                              </MenuItem>
                            </TextField>
                          ) : (
                            <Typography
                              sx={{
                                fontWeight: 600,
                                fontSize: '0.95rem',
                                color: palette.textPrimary,
                              }}
                            >
                              {getRowLabel(row)}
                            </Typography>
                          )}
                        </Box>
                        {canChangeBuckets && (
                          <IconButton
                            aria-label={`Remove ${getRowLabel(row)}`}
                            onClick={() => void onRemoveRow(row.id)}
                            disabled={isBusy}
                            sx={{
                              color: palette.error,
                              '&:hover': { backgroundColor: palette.errorBg },
                            }}
                          >
                            <DeleteOutlineIcon />
                          </IconButton>
                        )}
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              )}

              {canChangeBuckets && (
                <>
                  <Tooltip
                    title={
                      !canAddMoreBuckets
                        ? 'All available work categories have already been added'
                        : ''
                    }
                    placement="top"
                  >
                    <span>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={onAddRow}
                        disabled={isBusy || !canAddMoreBuckets}
                        sx={{
                          mt: 1,
                          py: 1.5,
                          width: '100%',
                          borderStyle: 'dashed',
                          borderWidth: 2,
                          borderColor: palette.borderStrong,
                          color: palette.textSecondary,
                          backgroundColor: palette.surface,
                          borderRadius: 2,
                          '&:hover': {
                            borderStyle: 'dashed',
                            borderWidth: 2,
                            borderColor: palette.primary,
                            backgroundColor: palette.overlayPrimarySoft,
                            color: palette.primaryContrast,
                          },
                        }}
                      >
                        Add Category
                      </Button>
                    </span>
                  </Tooltip>
                  {!canAddMoreBuckets && (
                    <Typography variant="body2" sx={{ mt: 1, color: palette.textMuted }}>
                      All available work categories have already been added.
                    </Typography>
                  )}
                </>
              )}
            </Stack>
          </Box>

          <Stack spacing={2} sx={{ p: { xs: 2, sm: 3 }, backgroundColor: palette.bg }}>
            {dayCards.map((day) => {
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
                            fontFamily: '"Instrument Serif", Georgia, serif',
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
                            fontFamily: '"JetBrains Mono", monospace',
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
                                ? palette.primaryContrast
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
                                ? palette.primary
                                : palette.textMuted,
                          }}
                        >
                          {isOverLimit ? 'Over daily limit' : 'Hours'}
                        </Typography>
                      </Box>
                    </Box>

                    {day.categories.length === 0 ? (
                      <Typography
                        variant="body2"
                        sx={{ color: palette.textSecondary, fontStyle: 'italic', pt: 1 }}
                      >
                        Add a work category above to start logging.
                      </Typography>
                    ) : (
                      <Stack spacing={1.5} sx={{ pt: 1 }}>
                        {day.categories.map((category) => (
                          <Box
                            key={`${day.date}-${category.rowId}`}
                            sx={{ pt: 1.5, borderTop: `1px solid ${palette.border}` }}
                          >
                            <Typography
                              sx={{
                                fontWeight: 500,
                                fontSize: '0.9rem',
                                color: palette.textSecondary,
                                mb: 1,
                              }}
                            >
                              {getRowLabel(category)}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <MobileHourStepper
                                date={day.date}
                                isBusy={isBusy}
                                rowId={category.rowId}
                                value={category.value}
                                onRowHoursChange={onRowHoursChange}
                              />
                            </Box>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Stack>
                </Paper>
              )
            })}
          </Stack>
        </>
      ) : (
        <>
          <TableContainer
            sx={{ borderTop: `1px solid ${palette.border}`, borderRadius: 0, boxShadow: 'none' }}
          >
            <Table
              size="medium"
              sx={{
                minWidth: desktopTableMinWidth,
                width: '100%',
                tableLayout: 'fixed',
              }}
            >
              <TableHead>
                <TableRow sx={{ backgroundColor: palette.surfaceMuted }}>
                  <TableCell
                    sx={{
                      width: DESKTOP_WORK_CATEGORY_COLUMN_WIDTH,
                      borderRight: `1px solid ${palette.borderStrong}`,
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
                        width: DESKTOP_DAY_COLUMN_WIDTH,
                        borderRight: `1px solid ${palette.border}`,
                        py: 2,
                      }}
                    >
                      <Typography
                        sx={{
                          display: 'block',
                          fontWeight: 700,
                          color: palette.textPrimary,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontSize: '0.85rem',
                        }}
                      >
                        {formatDayName(date).slice(0, 3)}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          color: palette.textMuted,
                          fontSize: '0.75rem',
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
                      width: DESKTOP_TOTAL_COLUMN_WIDTH,
                      borderRight: `1px solid ${palette.borderStrong}`,
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
                  <TableCell align="center" sx={{ width: DESKTOP_ACTION_COLUMN_WIDTH, py: 2 }}>
                    <Typography
                      sx={{
                        fontWeight: 600,
                        color: palette.textSecondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontSize: '0.8rem',
                      }}
                    >
                      Act
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                      <Box sx={{ maxWidth: 300, mx: 'auto' }}>
                        <Typography
                          sx={{
                            fontFamily: '"Instrument Serif", Georgia, serif',
                            fontSize: '1.5rem',
                            color: palette.textSecondary,
                            mb: 1,
                          }}
                        >
                          Ready to log some hours?
                        </Typography>
                        <Typography variant="body2" sx={{ color: palette.textMuted }}>
                          Add a row below to choose your assignment and start building your weekly
                          matrix.
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
                        <TableCell
                          sx={{ borderRight: `1px solid ${palette.borderStrong}`, px: 2, py: 1.5 }}
                        >
                          {canChangeBuckets ? (
                            <TextField
                              select
                              variant="outlined"
                              size="small"
                              value={getBucketValue(row.entryKind, row.assignmentId)}
                              onChange={(e) => onRowCategoryChange(row.id, e.target.value)}
                              disabled={isBusy}
                              fullWidth
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 1.5,
                                  backgroundColor: palette.surface,
                                  '& fieldset': { borderColor: palette.border },
                                  '&:hover fieldset': { borderColor: palette.borderStrong },
                                  '&.Mui-focused fieldset': {
                                    borderColor: palette.primary,
                                    borderWidth: 1,
                                  },
                                },
                              }}
                            >
                              {availableAssignments.map((assignment) => (
                                <MenuItem
                                  key={assignment.id}
                                  value={assignment.id}
                                  disabled={isBucketDisabled(row.id, assignment.id)}
                                >
                                  {getAssignmentOptionLabel(assignment)}
                                </MenuItem>
                              ))}
                              <MenuItem
                                value="INTERNAL"
                                disabled={isBucketDisabled(row.id, 'INTERNAL')}
                              >
                                Internal
                              </MenuItem>
                            </TextField>
                          ) : (
                            <Typography
                              sx={{ fontWeight: 500, px: 1, py: 0.5, color: palette.textPrimary }}
                            >
                              {getRowLabel(row)}
                            </Typography>
                          )}
                        </TableCell>
                        {weekDates.map((date) => (
                          <TableCell
                            key={date}
                            align="center"
                            sx={{ p: 1, borderRight: `1px solid ${palette.border}` }}
                          >
                            <TextField
                              variant="outlined"
                              size="small"
                              type="number"
                              placeholder="0"
                              value={row.hours[date] ?? ''}
                              onChange={(e) => onRowHoursChange(row.id, date, e.target.value)}
                              disabled={isBusy}
                              slotProps={{
                                htmlInput: {
                                  min: 0,
                                  max: 24,
                                  step: '0.25',
                                  style: {
                                    width: '100%',
                                    minWidth: DESKTOP_NUMERIC_CELL_WIDTH,
                                    textAlign: 'center',
                                    padding: '10px 4px',
                                    fontFamily: '"JetBrains Mono", monospace',
                                    fontVariantNumeric: 'tabular-nums',
                                    fontWeight: 600,
                                    color:
                                      row.hours[date] > 0 ? palette.textPrimary : palette.textMuted,
                                  },
                                },
                              }}
                              sx={{
                                width: '100%',
                                '& .MuiOutlinedInput-root': {
                                  minWidth: DESKTOP_NUMERIC_CELL_WIDTH,
                                  borderRadius: 1.5,
                                  backgroundColor:
                                    row.hours[date] > 0
                                      ? palette.overlayPrimarySoft
                                      : 'transparent',
                                  transition: 'all 0.2s ease',
                                  '& fieldset': { border: 'none' },
                                  '&:hover': { backgroundColor: palette.surfaceMuted },
                                  '&.Mui-focused': {
                                    backgroundColor: palette.surface,
                                    boxShadow: `0 0 0 2px ${palette.focusRing}`,
                                    '& fieldset': {
                                      border: `1px solid ${palette.primary}`,
                                      borderRadius: 1.5,
                                    },
                                  },
                                },
                              }}
                            />
                          </TableCell>
                        ))}
                        <TableCell
                          align="center"
                          sx={{
                            borderRight: `1px solid ${palette.borderStrong}`,
                            backgroundColor: palette.surfaceRaised,
                            py: 1,
                          }}
                        >
                          <Typography
                            sx={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '1.25rem',
                              fontVariantNumeric: 'tabular-nums',
                              fontWeight: 700,
                              color: rowTotal > 0 ? palette.primaryContrast : palette.textMuted,
                            }}
                          >
                            {rowTotal.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 1 }}>
                          {canChangeBuckets && (
                            <IconButton
                              onClick={() => void onRemoveRow(row.id)}
                              disabled={isBusy}
                              sx={{
                                color: palette.textMuted,
                                '&:hover': {
                                  color: palette.error,
                                  backgroundColor: palette.errorBg,
                                },
                              }}
                              size="small"
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
              <TableFooter>
                <TableRow sx={{ backgroundColor: palette.surfaceMuted }}>
                  <TableCell
                    sx={{
                      borderRight: `1px solid ${palette.borderStrong}`,
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
                            fontVariantNumeric: 'tabular-nums',
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
                      borderRight: `1px solid ${palette.borderStrong}`,
                      backgroundColor: palette.surfaceMuted,
                      py: 1.5,
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '1.25rem',
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 700,
                        color: totalHours > 0 ? palette.primaryContrast : palette.textMuted,
                      }}
                    >
                      {totalHours.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ py: 1.5 }}>
                    <Typography variant="body2" sx={{ color: palette.textMuted }}>
                      -
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </TableContainer>
          {canChangeBuckets && (
            <Box
              sx={{
                p: 3,
                backgroundColor: palette.bg,
                borderTop: `1px solid ${palette.borderStrong}`,
                textAlign: 'center',
              }}
            >
              <Tooltip
                title={
                  !canAddMoreBuckets ? 'All available work categories have already been added' : ''
                }
                placement="top"
              >
                <span>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={onAddRow}
                    disabled={isBusy || !canAddMoreBuckets}
                    sx={{
                      py: 1,
                      px: 4,
                      borderStyle: 'dashed',
                      borderWidth: 2,
                      borderColor: palette.borderStrong,
                      color: palette.textSecondary,
                      backgroundColor: palette.surface,
                      borderRadius: 2,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderStyle: 'dashed',
                        borderWidth: 2,
                        borderColor: palette.primary,
                        backgroundColor: palette.overlayPrimarySoft,
                        color: palette.primaryContrast,
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    Add Row
                  </Button>
                </span>
              </Tooltip>
              {!canAddMoreBuckets && (
                <Typography variant="body2" sx={{ mt: 1.5, color: palette.textMuted }}>
                  All available work categories have already been added.
                </Typography>
              )}
            </Box>
          )}
        </>
      )}
    </Paper>
  )
}
