import { useState, useEffect } from 'react'
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
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import dayjs from 'dayjs'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import PageHeader from '../../components/shared/PageHeader'
import { palette } from '../../theme.js'
import { getAuditLog } from '../../api/audit'
import {
  getAuditActorDisplayLabel,
  getAuditTimesheetDisplayLabel,
} from '../../utils/displayLabels'

const ACTION_OPTIONS = ['SUBMISSION', 'APPROVAL', 'REJECTION', 'PROCESSING']

const ACTION_COLORS = {
  SUBMISSION: 'var(--ui-info)',
  APPROVAL: 'var(--ui-success)',
  REJECTION: 'var(--ui-error)',
  PROCESSING: 'var(--ui-warning)',
}

function formatTimestamp(isoString) {
  if (!isoString) return '-'
  const d = new Date(isoString)
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatDetail(action, detail) {
  if (detail === null || detail === undefined) return '-'
  switch (action) {
    case 'SUBMISSION':
      return 'Submitted from draft'
    case 'APPROVAL':
      return 'Approved'
    case 'REJECTION':
      return detail.comment ? `Rejected: ${detail.comment}` : 'Rejected'
    case 'PROCESSING': {
      const rate = detail.dailyRate != null ? `\u00A3${Number(detail.dailyRate).toFixed(2)}/day` : ''
      const hours = detail.totalHours != null ? `${detail.totalHours}h` : ''
      const amount = detail.amount != null ? `\u00A3${Number(detail.amount).toFixed(2)}` : ''
      return [rate, hours, amount].filter(Boolean).join(' x ').replace(' x \u00A3', ' = \u00A3')
    }
    default:
      return typeof detail === 'object' ? JSON.stringify(detail) : String(detail)
  }
}

export default function AuditLogPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionFilter, setActionFilter] = useState(null)
  const [authorFilter, setAuthorFilter] = useState(null)
  const [dateFrom, setDateFrom] = useState(null)
  const [dateTo, setDateTo] = useState(null)

  useEffect(() => {
    async function fetchLog() {
      setLoading(true)
      setError('')
      try {
        const data = await getAuditLog()
        const sorted = [...data].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        )
        setEntries(sorted)
      } catch (err) {
        setError(err.message || 'Failed to load audit log.')
      } finally {
        setLoading(false)
      }
    }
    fetchLog()
  }, [])

  const authorOptions = [...new Set(entries.map((e) => getAuditActorDisplayLabel(e.performedByName)))].sort()

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

        <Paper sx={{ p: { xs: 2, sm: 2.5 }, mb: 3 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            flexWrap="wrap"
            useFlexGap
          >
            <Autocomplete
              options={ACTION_OPTIONS}
              value={actionFilter}
              onChange={(_e, value) => setActionFilter(value)}
              size="small"
              sx={{ width: { xs: '100%', sm: 200 } }}
              renderInput={(params) => <TextField {...params} label="Action" />}
            />
            <Autocomplete
              options={authorOptions}
              value={authorFilter}
              onChange={(_e, value) => setAuthorFilter(value)}
              size="small"
              sx={{ width: { xs: '100%', sm: 220 } }}
              renderInput={(params) => <TextField {...params} label="Performed By" />}
            />
            <DatePicker
              label="From"
              value={dateFrom}
              onChange={setDateFrom}
              slotProps={{ field: { clearable: true, size: 'small' }, textField: { size: 'small' } }}
              sx={{ width: { xs: '100%', sm: 170 } }}
            />
            <DatePicker
              label="To"
              value={dateTo}
              onChange={setDateTo}
              slotProps={{ field: { clearable: true, size: 'small' }, textField: { size: 'small' } }}
              sx={{ width: { xs: '100%', sm: 170 } }}
            />
          </Stack>
        </Paper>

        {loading ? (
          <LoadingSpinner />
        ) : (
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
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.6,
                          px: 1,
                          py: 0.3,
                          borderRadius: '5px',
                          backgroundColor:
                            e.action === 'APPROVAL'
                              ? 'var(--ui-success-bg)'
                              : e.action === 'REJECTION'
                                ? 'var(--ui-error-bg)'
                                : e.action === 'PROCESSING'
                                  ? 'var(--ui-warning-bg)'
                                  : 'var(--ui-info-bg)',
                          border:
                            e.action === 'APPROVAL'
                              ? '1px solid var(--ui-status-approved-border)'
                              : e.action === 'REJECTION'
                                ? '1px solid var(--ui-status-rejected-border)'
                                : e.action === 'PROCESSING'
                                  ? '1px solid var(--ui-status-pending-border)'
                                  : '1px solid var(--ui-status-completed-border)',
                        }}
                      >
                        <Typography
                          component="span"
                          sx={{
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            color: ACTION_COLORS[e.action] ?? palette.textSecondary,
                            letterSpacing: '0.03em',
                          }}
                        >
                          {e.action}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {getAuditActorDisplayLabel(e.performedByName)}
                        </Typography>
                        {e.performedBy && (
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '0.68rem',
                              color: palette.textMuted,
                            }}
                          >
                            {e.performedBy}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {getAuditTimesheetDisplayLabel({
                            consultantName: e.timesheetConsultantName,
                            weekStart: e.timesheetWeekStart,
                          })}
                        </Typography>
                        {e.timesheetId && (
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '0.68rem',
                              color: palette.textMuted,
                            }}
                          >
                            {e.timesheetId}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell
                      sx={{
                        maxWidth: { xs: 220, md: 320 },
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={formatDetail(e.action, e.detail)}
                    >
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.72rem',
                          color: palette.textSecondary,
                        }}
                      >
                        {formatDetail(e.action, e.detail)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      {hasFilters ? 'No entries match your filters.' : 'No audit log entries found.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {!loading && filtered.length > 0 && (
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
