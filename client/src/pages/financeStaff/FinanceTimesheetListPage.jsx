import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
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
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import PaymentIcon from '@mui/icons-material/Payment'
import VisibilityIcon from '@mui/icons-material/Visibility'
import SearchIcon from '@mui/icons-material/Search'
import StatusBadge from '../../components/shared/StatusBadge'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import PageHeader from '../../components/shared/PageHeader'
import { getTimesheets } from '../../api/timesheets'
import { formatWeekStart } from '../../utils/dateFormatters'
import { getConsultantDisplayLabel } from '../../utils/displayLabels'

function getActionButtonLabel(status) {
  return status === 'COMPLETED' ? 'View' : 'Process'
}

function getActionButtonIcon(status) {
  return status === 'COMPLETED' ? VisibilityIcon : PaymentIcon
}

export default function FinanceTimesheetListPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [timesheets, setTimesheets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [statusFilter, setStatusFilter] = useState(
    searchParams.get('status') || 'ALL'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('latest')

  useEffect(() => {
    setStatusFilter(searchParams.get('status') || 'ALL')
  }, [searchParams])

  useEffect(() => {
    getTimesheets()
      .then((data) => {
        const base = data.filter(
          (ts) => ts.status === 'APPROVED' || ts.status === 'COMPLETED'
        )
        setTimesheets(base)
      })
      .catch((err) => setError(err.message ?? 'Failed to load timesheets'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  const normalizedQuery = searchQuery.trim().toLowerCase()

  let filtered = timesheets.filter((ts) => {
    const matchesStatus =
      statusFilter === 'ALL' || ts.status === statusFilter

    const matchesSearch =
      normalizedQuery.length === 0 ||
      getConsultantDisplayLabel(ts.consultantName)
        .toLowerCase()
        .includes(normalizedQuery)

    return matchesStatus && matchesSearch
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'latest') {
      return new Date(b.weekStart) - new Date(a.weekStart)
    }
    if (sortBy === 'oldest') {
      return new Date(a.weekStart) - new Date(b.weekStart)
    }
    if (sortBy === 'hoursHigh') {
      return (b.totalHours || 0) - (a.totalHours || 0)
    }
    if (sortBy === 'hoursLow') {
      return (a.totalHours || 0) - (b.totalHours || 0)
    }
    return 0
  })

  const pageTitle =
    statusFilter === 'APPROVED'
      ? 'Approved Timesheets'
      : statusFilter === 'COMPLETED'
      ? 'Paid Timesheets'
      : 'Timesheets for Payment'

  return (
    <Box>
      <PageHeader title={pageTitle} subtitle="Process and review payments">
        <TextField
          placeholder="Search consultants..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ minWidth: 220 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="ALL">All</MenuItem>
            <MenuItem value="APPROVED">Approved</MenuItem>
            <MenuItem value="COMPLETED">Paid</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Sort</InputLabel>
          <Select
            value={sortBy}
            label="Sort"
            onChange={(e) => setSortBy(e.target.value)}
          >
            <MenuItem value="latest">Latest</MenuItem>
            <MenuItem value="oldest">Oldest</MenuItem>
            <MenuItem value="hoursHigh">Hours (High → Low)</MenuItem>
            <MenuItem value="hoursLow">Hours (Low → High)</MenuItem>
          </Select>
        </FormControl>
      </PageHeader>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!error && sorted.length === 0 && (
        <Paper sx={{ p: 6, textAlign: 'center', borderStyle: 'dashed' }}>
          <Typography variant="body2" color="text.secondary">
            No timesheets found.
          </Typography>
        </Paper>
      )}

      {!error && sorted.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Consultant</TableCell>
                <TableCell>Week of</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Hours</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((ts) => {
                const ActionIcon = getActionButtonIcon(ts.status)

                return (
                  <TableRow key={ts.id}>
                    <TableCell>
                      {getConsultantDisplayLabel(ts.consultantName)}
                    </TableCell>

                    <TableCell>
                      {formatWeekStart(ts.weekStart)}
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={ts.status} />
                    </TableCell>

                    <TableCell align="right">
                      {ts.totalHours != null
                        ? `${ts.totalHours} hrs`
                        : '-'}
                    </TableCell>

                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ActionIcon />}
                        onClick={() =>
                          navigate(`/finance/timesheets/${ts.id}`)
                        }
                      >
                        {getActionButtonLabel(ts.status)}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}