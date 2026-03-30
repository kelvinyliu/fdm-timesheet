import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Alert from '@mui/material/Alert'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import StatusBadge from '../../components/shared/StatusBadge'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import { getTimesheets } from '../../api/timesheets'
import { formatWeekStart } from '../../utils/dateFormatters'

export default function ManagerTimesheetListPage() {
  const navigate = useNavigate()
  const [timesheets, setTimesheets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => {
    getTimesheets()
      .then(setTimesheets)
      .catch((err) => setError(err.message ?? 'Failed to load timesheets'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  const filtered =
    statusFilter === 'ALL'
      ? timesheets
      : timesheets.filter((ts) => ts.status === statusFilter)

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1">
          Team Timesheets
        </Typography>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select
            labelId="status-filter-label"
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="ALL">All</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="APPROVED">Approved</MenuItem>
            <MenuItem value="REJECTED">Rejected</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!error && filtered.length === 0 && (
        <Typography color="text.secondary">
          No timesheets found{statusFilter !== 'ALL' ? ` with status "${statusFilter}"` : ''}.
        </Typography>
      )}

      {!error && filtered.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Consultant ID</TableCell>
                <TableCell>Week of</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Total Hours</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((ts) => (
                <TableRow key={ts.id} hover>
                  <TableCell>{ts.consultantId}</TableCell>
                  <TableCell>{formatWeekStart(ts.weekStart)}</TableCell>
                  <TableCell>
                    <StatusBadge status={ts.status} />
                  </TableCell>
                  <TableCell>{ts.totalHours ?? '—'}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => navigate(`/manager/timesheets/${ts.id}`)}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}
