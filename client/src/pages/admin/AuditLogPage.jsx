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
import { getAuditLog } from '../../api/audit'

const ACTION_OPTIONS = ['SUBMISSION', 'APPROVAL', 'REJECTION', 'PROCESSING']

function formatTimestamp(isoString) {
  if (!isoString) return '—'
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
  if (detail === null || detail === undefined) return '—'
  switch (action) {
    case 'SUBMISSION':
      return 'Submitted from draft'
    case 'APPROVAL':
      return 'Approved'
    case 'REJECTION':
      return detail.comment ? `Rejected: ${detail.comment}` : 'Rejected'
    case 'PROCESSING': {
      const rate = detail.dailyRate != null ? `£${Number(detail.dailyRate).toFixed(2)}/day` : ''
      const hours = detail.totalHours != null ? `${detail.totalHours}h` : ''
      const amount = detail.amount != null ? `£${Number(detail.amount).toFixed(2)}` : ''
      return [rate, hours, amount].filter(Boolean).join(' x ').replace(' x £', ' = £')
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

  const authorOptions = [...new Set(entries.map((e) => e.performedByName).filter(Boolean))].sort()

  const hasFilters = actionFilter || authorFilter || dateFrom || dateTo

  const filtered = entries.filter((e) => {
    if (actionFilter && e.action !== actionFilter) return false
    if (authorFilter && e.performedByName !== authorFilter) return false
    if (dateFrom && dayjs(e.createdAt).isBefore(dateFrom, 'day')) return false
    if (dateTo && dayjs(e.createdAt).isAfter(dateTo, 'day')) return false
    return true
  })

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box p={3}>
        <Typography variant="h5" fontWeight={700} mb={2}>
          Audit Log
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
          <Autocomplete
            options={ACTION_OPTIONS}
            value={actionFilter}
            onChange={(_e, value) => setActionFilter(value)}
            size="small"
            sx={{ width: 200 }}
            renderInput={(params) => <TextField {...params} label="Action" />}
          />
          <Autocomplete
            options={authorOptions}
            value={authorFilter}
            onChange={(_e, value) => setAuthorFilter(value)}
            size="small"
            sx={{ width: 220 }}
            renderInput={(params) => <TextField {...params} label="Performed By" />}
          />
          <DatePicker
            label="From"
            value={dateFrom}
            onChange={setDateFrom}
            slotProps={{ field: { clearable: true, size: 'small' }, textField: { size: 'small' } }}
            sx={{ width: 170 }}
          />
          <DatePicker
            label="To"
            value={dateTo}
            onChange={setDateTo}
            slotProps={{ field: { clearable: true, size: 'small' }, textField: { size: 'small' } }}
            sx={{ width: 170 }}
          />
        </Stack>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Performed By</TableCell>
                  <TableCell>Timesheet ID</TableCell>
                  <TableCell>Detail</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {formatTimestamp(e.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {e.action}
                      </Typography>
                    </TableCell>
                    <TableCell>{e.performedByName ?? e.performedBy ?? '—'}</TableCell>
                    <TableCell>{e.timesheetId ?? '—'}</TableCell>
                    <TableCell
                      sx={{
                        maxWidth: 320,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                      }}
                      title={formatDetail(e.action, e.detail)}
                    >
                      {formatDetail(e.action, e.detail)}
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
          <Typography variant="caption" color="text.secondary" mt={1} display="block">
            Showing {filtered.length} of {entries.length} entries
          </Typography>
        )}
      </Box>
    </LocalizationProvider>
  )
}
