import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
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
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import RateReviewIcon from '@mui/icons-material/RateReview'
import StatusBadge from '../../components/shared/StatusBadge'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import PageHeader from '../../components/shared/PageHeader'
import { getTimesheets } from '../../api/timesheets'
import { formatWeekStart } from '../../utils/dateFormatters'
import { getConsultantDisplayLabel } from '../../utils/displayLabels'

export default function ManagerTimesheetListPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
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
      <PageHeader title="Team Timesheets" subtitle="Review and manage your team's submissions">
        <FormControl size="small" sx={{ minWidth: 160, width: { xs: '100%', sm: 'auto' } }}>
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
      </PageHeader>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!error && filtered.length === 0 && (
        <Paper sx={{ p: 6, textAlign: 'center', borderStyle: 'dashed' }}>
          <Typography variant="body2" color="text.secondary">
            No timesheets found{statusFilter !== 'ALL' ? ` with status "${statusFilter}"` : ''}.
          </Typography>
        </Paper>
      )}

      {!error && filtered.length > 0 && (
        isMobile ? (
          <Stack spacing={1.5}>
            {filtered.map((ts) => (
              <Paper key={ts.id} sx={{ p: 2.5 }}>
                <Stack spacing={2}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 1.5,
                    }}
                  >
                    <Box>
                      <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                        Consultant
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {getConsultantDisplayLabel(ts.consultantName)}
                      </Typography>
                    </Box>
                    <StatusBadge status={ts.status} />
                  </Box>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: 1.5,
                    }}
                  >
                    <Box>
                      <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                        Week of
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {formatWeekStart(ts.weekStart)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                        Total Hours
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.95rem',
                          fontWeight: 600,
                        }}
                      >
                        {ts.totalHours ?? '-'}
                      </Typography>
                    </Box>
                  </Box>

                  <Button
                    variant="outlined"
                    startIcon={<RateReviewIcon sx={{ fontSize: '0.95rem' }} />}
                    onClick={() => navigate(`/manager/timesheets/${ts.id}`)}
                  >
                    Review Timesheet
                  </Button>
                </Stack>
              </Paper>
            ))}
          </Stack>
        ) : (
          <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Consultant</TableCell>
                  <TableCell>Week of</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Total Hours</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((ts) => (
                  <TableRow key={ts.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {getConsultantDisplayLabel(ts.consultantName)}
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
                        startIcon={<RateReviewIcon sx={{ fontSize: '0.9rem' }} />}
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
        )
      )}
    </Box>
  )
}
