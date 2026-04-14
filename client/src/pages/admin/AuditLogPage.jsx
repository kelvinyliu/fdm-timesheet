import { useState, useEffect } from 'react'
import { useLoaderData } from 'react-router'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import dayjs from 'dayjs'
import PageHeader from '../../components/shared/PageHeader'
import { palette } from '../../theme.js'
import { getAuditActorDisplayLabel, getAuditTimesheetDisplayLabel } from '../../utils/displayLabels'
import { formatTimestamp } from '../../utils/dateFormatters'
import ActionBadge from '../../components/shared/ActionBadge'

const ACTION_OPTIONS = ['SUBMISSION', 'APPROVAL', 'REJECTION', 'PROCESSING']

function formatDetail(action, detail) {
  if (detail === null || detail === undefined) return '-'
  switch (action) {
    case 'SUBMISSION':
      return detail.submittedLate ? 'Submitted from draft · Late' : 'Submitted from draft'
    case 'APPROVAL':
      return 'Approved'
    case 'REJECTION':
      return detail.comment ? `Rejected: ${detail.comment}` : 'Rejected'
    case 'PROCESSING': {
      if (Array.isArray(detail.breakdowns) && detail.breakdowns.length > 0) {
        const incoming =
          detail.totalBillAmount != null
            ? `In \u00A3${Number(detail.totalBillAmount).toFixed(2)}`
            : null
        const outgoing =
          detail.totalPayAmount != null
            ? `Out \u00A3${Number(detail.totalPayAmount).toFixed(2)}`
            : null
        const margin =
          detail.marginAmount != null ? `Net \u00A3${Number(detail.marginAmount).toFixed(2)}` : null
        return [
          `${detail.breakdowns.length} categories`,
          detail.totalHours != null ? `${Number(detail.totalHours).toFixed(2)}h` : null,
          incoming,
          outgoing,
          margin,
        ]
          .filter(Boolean)
          .join(' · ')
      }

      if (detail.totalBillAmount != null || detail.totalPayAmount != null) {
        return [
          detail.totalHours != null ? `${Number(detail.totalHours).toFixed(2)}h` : null,
          detail.totalBillAmount != null
            ? `In \u00A3${Number(detail.totalBillAmount).toFixed(2)}`
            : null,
          detail.totalPayAmount != null
            ? `Out \u00A3${Number(detail.totalPayAmount).toFixed(2)}`
            : null,
          detail.marginAmount != null
            ? `Net \u00A3${Number(detail.marginAmount).toFixed(2)}`
            : null,
        ]
          .filter(Boolean)
          .join(' · ')
      }

      const rateValue = detail.hourlyRate ?? detail.dailyRate
      const rate = rateValue != null ? `\u00A3${Number(rateValue).toFixed(2)}/hr` : ''
      const hours = detail.totalHours != null ? `${Number(detail.totalHours).toFixed(2)}h` : ''
      const amount = detail.amount != null ? `\u00A3${Number(detail.amount).toFixed(2)}` : ''
      return [rate, hours, amount].filter(Boolean).join(' x ').replace(' x \u00A3', ' = \u00A3')
    }
    default:
      return typeof detail === 'object' ? JSON.stringify(detail) : String(detail)
  }
}

export default function AuditLogPage() {
  const { entries, error: loadError } = useLoaderData()
  const [error, setError] = useState(loadError)
  const [actionFilter, setActionFilter] = useState(null)
  const [authorFilter, setAuthorFilter] = useState(null)
  const [dateFrom, setDateFrom] = useState(null)
  const [dateTo, setDateTo] = useState(null)

  const handleClearFilters = () => {
    setActionFilter(null)
    setAuthorFilter(null)
    setDateFrom(null)
    setDateTo(null)
  }

  useEffect(() => {
    setError(loadError)
  }, [loadError])

  const authorOptions = [
    ...new Set(entries.map((e) => getAuditActorDisplayLabel(e.performedByName))),
  ].sort()

  const hasFilters = actionFilter || authorFilter || dateFrom || dateTo

  const filtered = entries.filter((e) => {
    if (actionFilter && e.action !== actionFilter) return false
    if (authorFilter && getAuditActorDisplayLabel(e.performedByName) !== authorFilter) return false
    if (dateFrom && dayjs(e.createdAt).isBefore(dateFrom, 'day')) return false
    if (dateTo && dayjs(e.createdAt).isAfter(dateTo, 'day')) return false
    return true
  })

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        <PageHeader title="Audit Log" subtitle="Track all timesheet actions and events" />

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: { xs: 2.5, sm: 2.5 }, mt: { xs: 1, sm: 0 }, mb: { xs: 2.5, sm: 3 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap alignItems={{ xs: 'stretch', sm: 'center' }}>
            <Autocomplete
              options={ACTION_OPTIONS}
              value={actionFilter}
              onChange={(_e, value) => setActionFilter(value)}
              size="small"
              sx={{ width: { xs: '100%', sm: 'auto' }, flex: { sm: '1 1 180px' }, minWidth: { sm: 180 } }}
              renderInput={(params) => <TextField {...params} label="Action" />}
            />
            <Autocomplete
              options={authorOptions}
              value={authorFilter}
              onChange={(_e, value) => setAuthorFilter(value)}
              size="small"
              sx={{ width: { xs: '100%', sm: 'auto' }, flex: { sm: '1 1 200px' }, minWidth: { sm: 200 } }}
              renderInput={(params) => <TextField {...params} label="Performed By" />}
            />
            <DatePicker
              label="From"
              value={dateFrom}
              onChange={setDateFrom}
              slotProps={{
                field: { clearable: true, size: 'small' },
                textField: { size: 'small' },
              }}
              sx={{ width: { xs: '100%', sm: 'auto' }, flex: { sm: '1 1 150px' }, minWidth: { sm: 150 } }}
            />
            <DatePicker
              label="To"
              value={dateTo}
              onChange={setDateTo}
              slotProps={{
                field: { clearable: true, size: 'small' },
                textField: { size: 'small' },
              }}
              sx={{ width: { xs: '100%', sm: 'auto' }, flex: { sm: '1 1 150px' }, minWidth: { sm: 150 } }}
            />
            {hasFilters && (
              <Button
                variant="outlined"
                color="primary"
                onClick={handleClearFilters}
                sx={{
                  flex: { xs: 'none', sm: '0 0 auto' },
                  width: { xs: '100%', sm: 'auto' },
                  height: 40,
                  whiteSpace: 'nowrap'
                }}
              >
                Clear Filters
              </Button>
            )}
          </Stack>
        </Paper>

        {/* Desktop View */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Performed By</TableCell>
                  <TableCell>Timesheet</TableCell>
                  <TableCell>Detail</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.75rem',
                        }}
                      >
                        {formatTimestamp(e.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <ActionBadge action={e.action} />
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                      >
                        {getAuditActorDisplayLabel(e.performedByName)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                      >
                        {getAuditTimesheetDisplayLabel({
                          consultantName: e.timesheetConsultantName,
                          weekStart: e.timesheetWeekStart,
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell
                      sx={{
                        maxWidth: { md: 320 },
                        whiteSpace: 'normal',
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word',
                      }}
                      title={formatDetail(e.action, e.detail)}
                    >
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.72rem',
                          color: palette.textSecondary,
                          whiteSpace: 'normal',
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word',
                        }}
                      >
                        {formatDetail(e.action, e.detail)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary" variant="body1" gutterBottom>
                        {hasFilters ? 'No entries match your filters.' : 'No audit log entries found.'}
                      </Typography>
                      {hasFilters && (
                        <Button variant="outlined" size="small" onClick={handleClearFilters} sx={{ mt: 1 }}>
                          Clear Filters
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Mobile View */}
        <Stack spacing={2} sx={{ display: { xs: 'flex', md: 'none' } }}>
          {filtered.map((e) => (
            <Card key={e.id} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <ActionBadge action={e.action} />
                  <Typography
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.75rem',
                      color: palette.textSecondary,
                    }}
                  >
                    {formatTimestamp(e.createdAt)}
                  </Typography>
                </Stack>
                
                <Divider sx={{ mb: 2, mx: -3 }} />

                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom sx={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Performed By
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {getAuditActorDisplayLabel(e.performedByName)}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom sx={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Timesheet
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {getAuditTimesheetDisplayLabel({
                        consultantName: e.timesheetConsultantName,
                        weekStart: e.timesheetWeekStart,
                      })}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom sx={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Detail
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.8rem',
                        color: palette.textPrimary,
                        whiteSpace: 'normal',
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word',
                        backgroundColor: palette.surfaceMuted,
                        p: 1.5,
                        borderRadius: 1,
                        mt: 0.5
                      }}
                    >
                      {formatDetail(e.action, e.detail)}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: palette.surfaceMuted, borderRadius: 2 }}>
              <Typography color="text.secondary" variant="body1" gutterBottom>
                {hasFilters ? 'No entries match your filters.' : 'No audit log entries found.'}
              </Typography>
              {hasFilters && (
                <Button variant="outlined" size="small" onClick={handleClearFilters} sx={{ mt: 1 }}>
                  Clear Filters
                </Button>
              )}
            </Paper>
          )}
        </Stack>

        {filtered.length > 0 && (
          <Typography
            sx={{
              mt: 1.5,
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.7rem',
              color: palette.textMuted,
            }}
          >
            Showing {filtered.length} of {entries.length} entries
          </Typography>
        )}
      </Box>
    </LocalizationProvider>
  )
}
