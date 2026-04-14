import { useState } from 'react'
import { useLoaderData, useNavigate } from 'react-router'
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
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import RateReviewIcon from '@mui/icons-material/RateReview'
import SearchIcon from '@mui/icons-material/Search'
import PageHeader from '../../components/shared/PageHeader'
import TimesheetStatusDisplay from '../../components/shared/TimesheetStatusDisplay.jsx'
import { formatWeekStart } from '../../utils/dateFormatters'
import { getSubmitterDisplayLabel } from '../../utils/displayLabels'
import {
  buildManagerTimesheetListPath,
  getManagerStatusFilterFromSearch,
  getManagerStatusFilterLabel,
  MANAGER_STATUS_FILTERS,
  matchesManagerStatusFilter,
} from './utils/managerTimesheetFilters.js'

function getStatusFilterFromUrl() {
  return getManagerStatusFilterFromSearch(window.location.search)
}

export default function ManagerTimesheetListPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const navigate = useNavigate()
  const { timesheets, error } = useLoaderData()
  const [statusFilter, setStatusFilter] = useState(getStatusFilterFromUrl)
  const [searchQuery, setSearchQuery] = useState('')

  function handleStatusFilterChange(nextStatusFilter) {
    setStatusFilter(nextStatusFilter)

    const nextPath = buildManagerTimesheetListPath(nextStatusFilter)
    window.history.replaceState(window.history.state, '', nextPath)
  }

  function handleOpenTimesheet(timesheetId) {
    navigate(`/manager/timesheets/${timesheetId}`, {
      state: { returnTo: buildManagerTimesheetListPath(statusFilter) },
    })
  }

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const filtered = timesheets
    .filter((timesheet) => {
      const matchesStatus = matchesManagerStatusFilter(timesheet.status, statusFilter)
      const matchesConsultant =
        normalizedSearchQuery.length === 0 ||
        getSubmitterDisplayLabel(timesheet.consultantName)
          .toLowerCase()
          .includes(normalizedSearchQuery)

    return matchesStatus && matchesConsultant
    })
    .sort((a, b) => {
      const isApprovedA = a.status === 'APPROVED' || a.status === 'COMPLETED'
      const isApprovedB = b.status === 'APPROVED' || b.status === 'COMPLETED'
      if (isApprovedA === isApprovedB) return 0
      return isApprovedA ? 1 : -1
    })

  let emptyMessage = 'No timesheets found.'
  if (statusFilter !== MANAGER_STATUS_FILTERS.ALL && normalizedSearchQuery) {
    emptyMessage = `No timesheets found for submitter "${searchQuery.trim()}" with status "${getManagerStatusFilterLabel(statusFilter)}".`
  } else if (statusFilter !== MANAGER_STATUS_FILTERS.ALL) {
    emptyMessage = `No timesheets found with status "${getManagerStatusFilterLabel(statusFilter)}".`
  } else if (normalizedSearchQuery) {
    emptyMessage = `No timesheets found for submitter "${searchQuery.trim()}".`
  }

  const pageTitle =
    statusFilter === MANAGER_STATUS_FILTERS.PENDING
      ? 'Pending Timesheets'
      : statusFilter === MANAGER_STATUS_FILTERS.APPROVED_GROUP
        ? 'Approved Timesheets'
        : statusFilter === MANAGER_STATUS_FILTERS.REJECTED
          ? 'Rejected Timesheets'
          : statusFilter === MANAGER_STATUS_FILTERS.PAID
            ? 'Paid Timesheets'
            : 'Team Timesheets'

  return (
    <Box>
      <PageHeader title={pageTitle} subtitle="View and manage your team's submissions">
        <TextField
          placeholder="Search Timesheets..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ minWidth: { sm: 240 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <FormControl size="small" sx={{ minWidth: 160, width: { xs: '100%', sm: 'auto' } }}>
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select
            labelId="status-filter-label"
            value={statusFilter}
            label="Status"
            onChange={(e) => handleStatusFilterChange(e.target.value)}
          >
            <MenuItem value={MANAGER_STATUS_FILTERS.ALL}>All</MenuItem>
            <MenuItem value={MANAGER_STATUS_FILTERS.PENDING}>Pending</MenuItem>
            <MenuItem value={MANAGER_STATUS_FILTERS.APPROVED_GROUP}>Approved</MenuItem>
            <MenuItem value={MANAGER_STATUS_FILTERS.REJECTED}>Rejected</MenuItem>
            <MenuItem value={MANAGER_STATUS_FILTERS.PAID}>Paid</MenuItem>
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
            {emptyMessage}
          </Typography>
        </Paper>
      )}

      {!error &&
        filtered.length > 0 &&
        (isMobile ? (
          <Stack spacing={1.5}>
            {filtered.map((timesheet) => (
              <Paper key={timesheet.id} sx={{ p: 2.5 }}>
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
                        Submitter
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {getSubmitterDisplayLabel(timesheet.consultantName)}
                      </Typography>
                    </Box>
                    <TimesheetStatusDisplay
                      status={timesheet.status}
                      submittedLate={timesheet.submittedLate}
                    />
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
                        {formatWeekStart(timesheet.weekStart)}
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
                        {timesheet.totalHours != null ? Number(timesheet.totalHours).toFixed(2) : '-'}
                      </Typography>
                    </Box>
                  </Box>

                  <Button
                    variant="outlined"
                    startIcon={<RateReviewIcon sx={{ fontSize: '0.95rem' }} />}
                    onClick={() => handleOpenTimesheet(timesheet.id)}
                  >
                    Open Timesheet
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
                  <TableCell>Submitter</TableCell>
                  <TableCell>Week of</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Total Hours</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((timesheet) => (
                  <TableRow key={timesheet.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {getSubmitterDisplayLabel(timesheet.consultantName)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {formatWeekStart(timesheet.weekStart)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <TimesheetStatusDisplay
                        status={timesheet.status}
                        submittedLate={timesheet.submittedLate}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.85rem',
                        }}
                      >
                        {timesheet.totalHours != null ? Number(timesheet.totalHours).toFixed(2) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<RateReviewIcon sx={{ fontSize: '0.9rem' }} />}
                        onClick={() => handleOpenTimesheet(timesheet.id)}
                      >
                        Open Timesheet
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ))}
    </Box>
  )
}
