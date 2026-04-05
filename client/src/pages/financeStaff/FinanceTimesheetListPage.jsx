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
import PaymentIcon from '@mui/icons-material/Payment'
import StatusBadge from '../../components/shared/StatusBadge'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import PageHeader from '../../components/shared/PageHeader'
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
      <PageHeader
        title="Approved Timesheets"
        subtitle="Process payments for approved timesheets"
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!error && timesheets.length === 0 && (
        <Paper sx={{ p: 6, textAlign: 'center', borderStyle: 'dashed' }}>
          <Typography variant="body2" color="text.secondary">
            No approved or completed timesheets found.
          </Typography>
        </Paper>
      )}

      {!error && timesheets.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Consultant ID</TableCell>
                <TableCell>Week of</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Total Hours</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {timesheets.map((ts) => (
                <TableRow key={ts.id}>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: '"JetBrains Mono", monospace' }}
                    >
                      {ts.consultantId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {formatWeekStart(ts.weekStart)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={ts.status} />
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.85rem',
                      }}
                    >
                      {ts.totalHours ?? '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<PaymentIcon sx={{ fontSize: '0.9rem' }} />}
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
