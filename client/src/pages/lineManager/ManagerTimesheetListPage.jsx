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
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
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

  const activeTab = statusFilter === MANAGER_STATUS_FILTERS.PENDING ? 0 : 1;

  function handleTabChange(event, newValue) {
    if (newValue === 0) {
      handleStatusFilterChange(MANAGER_STATUS_FILTERS.PENDING);
    } else {
      if (statusFilter === MANAGER_STATUS_FILTERS.PENDING) {
        handleStatusFilterChange(MANAGER_STATUS_FILTERS.ALL);
      }
    }
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
      const statusOrder = { PENDING: 0, REJECTED: 0, APPROVED: 1, COMPLETED: 2 }
      return (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3)
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
        const draftCount = timesheets.filter((ts) => ts.status === 'DRAFT').length
        const pendingCount = timesheets.filter((ts) => ts.status === 'PENDING').length
        const rejectedCount = timesheets.filter((ts) => ts.status === 'REJECTED').length
        const approvedOrPaidCount = timesheets.filter(
        (ts) => ts.status === 'APPROVED' || ts.status === 'COMPLETED'
        ).length

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
        {activeTab === 1 && (
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
        )}
      </PageHeader>
      {!error && timesheets.length > 0 && (
        <Box
          sx={{
            mb: 4,
            pb: 3,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
            gap: { xs: 3, sm: 4 },
          }}
        >
          {[
            { label: 'Drafts', count: draftCount, color: 'text.primary' },
            { label: 'Pending', count: pendingCount, color: '#8a5a00' },
            { label: 'Rejected', count: rejectedCount, color: '#e55c58' },
            { label: 'Approved / Paid', count: approvedOrPaidCount, color: '#2f6b36' },
          ].map((item) => (
            <Box key={item.label}>
              <Typography
                sx={{
                  fontSize: '0.72rem',
                  fontWeight: 500,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.18em',
                  mb: 1,
                }}
              >
                {item.label}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'Poppins, Georgia, serif',
                  fontWeight: 400,
                  fontSize: { xs: '2.2rem', sm: '2.6rem' },
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                  color: item.color,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {item.count}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, mx: { xs: 0, sm: 0 } }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant={isMobile ? "fullWidth" : "standard"}
          sx={{ '& .MuiTab-root': { textTransform: 'none', fontSize: '1rem', fontWeight: 500, pb: 1.5 } }}
        >
          <Tab label="Pending Approval" />
          <Tab label="All Timesheets" />
        </Tabs>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!error && filtered.length === 0 && (
        <Box
          sx={{
            py: 6,
            textAlign: 'center',
            borderTop: '1px dashed',
            borderBottom: '1px dashed',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {emptyMessage}
          </Typography>
        </Box>
      )}

      {!error &&
        filtered.length > 0 &&
        (isMobile ? (
          <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />} spacing={0}>
            {filtered.map((timesheet) => (
              <Box
                key={timesheet.id}
                onClick={() => handleOpenTimesheet(timesheet.id)}
                sx={{
                  py: 2.25,
                  px: 1,
                  mx: -1,
                  borderRadius: 1.5,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                  '&:hover': { backgroundColor: 'action.hover' },
                }}
              >
                <Stack spacing={1.25}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                    <Typography variant="body2" fontWeight={600}>
                      {getSubmitterDisplayLabel(timesheet.consultantName)}
                    </Typography>
                    <TimesheetStatusDisplay
                      status={timesheet.status}
                      submittedLate={timesheet.submittedLate}
                    />
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      {formatWeekStart(timesheet.weekStart)}
                      {timesheet.totalHours != null && ` · ${Number(timesheet.totalHours).toFixed(2)} hrs`}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<RateReviewIcon sx={{ fontSize: '0.9rem' }} />}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenTimesheet(timesheet.id)
                      }}
                    >
                      Open
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Stack>
        ) : (
          <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
            <Table sx={{ tableLayout: 'fixed', minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '35%' }}>Submitter</TableCell>
                  <TableCell sx={{ width: '15%' }}>Week of</TableCell>
                  <TableCell sx={{ width: '20%' }}>Status</TableCell>
                  <TableCell align="right" sx={{ width: '10%' }}>Total Hours</TableCell>
                  <TableCell align="right" sx={{ width: '20%' }}>Actions</TableCell>
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
