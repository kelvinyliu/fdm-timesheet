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
import StatusBadge from '../../components/shared/StatusBadge'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import { getTimesheets } from '../../api/timesheets'
import { formatWeekStart } from '../../utils/dateFormatters'

export default function FinanceTimesheetListPage() {
  const navigate = useNavigate()
  const [timesheets, setTimesheets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getTimesheets()
      .then((data) => {
        const filtered = data.filter(
          (ts) => ts.status === 'APPROVED' || ts.status === 'COMPLETED'
        )
        setTimesheets(filtered)
      })
      .catch((err) => setError(err.message ?? 'Failed to load timesheets'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1">
          Approved Timesheets
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!error && timesheets.length === 0 && (
        <Typography color="text.secondary">
          No approved or completed timesheets found.
        </Typography>
      )}

      {!error && timesheets.length > 0 && (
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
              {timesheets.map((ts) => (
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
                      onClick={() => navigate(`/finance/timesheets/${ts.id}`)}
                    >
                      Process
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
