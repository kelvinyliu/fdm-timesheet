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
import { formatTimestamp } from '../../utils/dateFormatters'
import ActionBadge from '../../components/shared/ActionBadge'

const ACTION_OPTIONS = ['SUBMISSION', 'APPROVAL', 'REJECTION', 'PROCESSING']

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
      const rateValue = detail.hourlyRate ?? detail.dailyRate
      const rate = rateValue != null ? `\u00A3${Number(rateValue).toFixed(2)}/hr` : ''
      const hours = detail.totalHours != null ? `${detail.totalHours}h` : ''
      const amount = detail.amount != null ? `\u00A3${Number(detail.amount).toFixed(2)}` : ''
      return [rate, hours, amount].filter(Boolean).join(' x ').replace(' x \u00A3', ' = \u00A3')
    }
    default:
      return typeof detail === 'object' ? JSON.stringify(detail) : String(detail)
  }
}

export default function AuditLogPage() {
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
                      <ActionBadge action={e.action} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {getAuditActorDisplayLabel(e.performedByName)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {getAuditTimesheetDisplayLabel({
                          consultantName: e.timesheetConsultantName,
                          weekStart: e.timesheetWeekStart,
                        })}
                      </Typography>
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
