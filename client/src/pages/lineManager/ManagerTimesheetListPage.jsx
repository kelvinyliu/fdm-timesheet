import { useState } from 'react'
import { useLoaderData, useNavigate } from 'react-router'
import { useQueryStateObject } from '../../hooks/useQueryState.js'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
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
import MobileDetailDrawer from '../../components/shared/MobileDetailDrawer.jsx'
import { formatWeekStart } from '../../utils/dateFormatters'
import { getSubmitterDisplayLabel } from '../../utils/displayLabels'
import {
  buildManagerTimesheetListPath,
  getManagerStatusFilterLabel,
  MANAGER_STATUS_FILTERS,
  matchesManagerStatusFilter,
} from './utils/managerTimesheetFilters.js'

const LEGACY_STATUS_ALIASES = { APPROVED: MANAGER_STATUS_FILTERS.APPROVED_GROUP }
const VALID_STATUS_FILTERS = new Set(Object.values(MANAGER_STATUS_FILTERS))

export default function ManagerTimesheetListPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const navigate = useNavigate()
  const { timesheets, error } = useLoaderData()
  const [selectedMobileId, setSelectedMobileId] = useState(null)
  const [queryState, setQueryState] = useQueryStateObject({
    status: MANAGER_STATUS_FILTERS.ALL,
    q: '',
  })
  const rawStatus = queryState.status
  const statusFilter = VALID_STATUS_FILTERS.has(rawStatus)
    ? rawStatus
    : (LEGACY_STATUS_ALIASES[rawStatus] ?? MANAGER_STATUS_FILTERS.ALL)
  const searchQuery = queryState.q
  const visibleTimesheets = timesheets.filter(
    (timesheet) => timesheet.status !== 'DRAFT'
  )

  const activeTab = statusFilter === MANAGER_STATUS_FILTERS.PENDING ? 0 : 1

  function handleTabChange(event, newValue) {
    if (newValue === 0) {
      setQueryState({ status: MANAGER_STATUS_FILTERS.PENDING })
    } else if (statusFilter === MANAGER_STATUS_FILTERS.PENDING) {
      setQueryState({ status: MANAGER_STATUS_FILTERS.ALL })
    }
  }

  function handleOpenTimesheet(timesheetId) {
    navigate(`/manager/timesheets/${timesheetId}`, {
      state: { returnTo: buildManagerTimesheetListPath(statusFilter, searchQuery) },
    })
  }

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const filtered = visibleTimesheets
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
    emptyMessage = `No timesheets found for employee "${searchQuery.trim()}" with status "${getManagerStatusFilterLabel(statusFilter)}".`
  } else if (statusFilter !== MANAGER_STATUS_FILTERS.ALL) {
    emptyMessage = `No timesheets found with status "${getManagerStatusFilterLabel(statusFilter)}".`
  } else if (normalizedSearchQuery) {
    emptyMessage = `No timesheets found for employee "${searchQuery.trim()}".`
  }

  const selectedMobileTimesheet = visibleTimesheets.find((ts) => ts.id === selectedMobileId)

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
  const pendingCount = visibleTimesheets.filter((ts) => ts.status === 'PENDING').length
  const rejectedCount = visibleTimesheets.filter((ts) => ts.status === 'REJECTED').length
  const approvedOrPaidCount = visibleTimesheets.filter(
    (ts) => ts.status === 'APPROVED' || ts.status === 'COMPLETED'
  ).length

  return (
    <Box>
      <PageHeader title={pageTitle} subtitle="View and manage your team's submissions">
        <TextField
          label="Search timesheets"
          placeholder="Employee name"
          size="small"
          value={searchQuery}
          onChange={(e) => setQueryState({ q: e.target.value })}
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
              onChange={(e) => setQueryState({ status: e.target.value })}
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
      {!error && visibleTimesheets.length > 0 && (
        <Box
          sx={{
            mb: 4,
            pb: 3,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
            gap: { xs: 3, sm: 4 },
          }}
        >
          {[
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
                  fontFamily: '"Outfit", system-ui, sans-serif',
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
          variant={isMobile ? 'fullWidth' : 'standard'}
          sx={{
            '& .MuiTab-root': { textTransform: 'none', fontSize: '1rem', fontWeight: 500, pb: 1.5 },
          }}
        >
          <Tab label={`Pending Approval (${pendingCount})`} />
          <Tab label={`All Timesheets (${pendingCount + rejectedCount + approvedOrPaidCount})`} />
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
          <Stack
            divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}
            spacing={0}
          >
            {filtered.map((timesheet) => (
              <ButtonBase
                key={timesheet.id}
                component="button"
                type="button"
                onClick={() => setSelectedMobileId(timesheet.id)}
                aria-label={`Open details for ${getSubmitterDisplayLabel(timesheet.consultantName)}, week of ${formatWeekStart(timesheet.weekStart)}`}
                sx={{
                  width: '100%',
                  display: 'block',
                  textAlign: 'left',
                  py: 2.25,
                  px: 1,
                  mx: -1,
                  borderRadius: 1.5,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                  '&:hover': { backgroundColor: 'action.hover' },
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
                  <Box>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.25 }}>
                      {getSubmitterDisplayLabel(timesheet.consultantName)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatWeekStart(timesheet.weekStart)}
                      {timesheet.totalHours != null &&
                        ` · ${Number(timesheet.totalHours).toFixed(2)} hrs`}
                    </Typography>
                  </Box>
                  <TimesheetStatusDisplay
                    status={timesheet.status}
                    submittedLate={timesheet.submittedLate}
                  />
                </Stack>
              </ButtonBase>
            ))}
          </Stack>
        ) : (
          <TableContainer component={Paper}>
            <Table sx={{ tableLayout: 'auto' }}>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Week of</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Total Hours</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((timesheet) => (
                  <TableRow
                    key={timesheet.id}
                    hover
                    tabIndex={0}
                    onClick={() => handleOpenTimesheet(timesheet.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleOpenTimesheet(timesheet.id)
                      }
                    }}
                    sx={{
                      cursor: 'pointer',
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: -2,
                      },
                    }}
                  >
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
                        {timesheet.totalHours != null
                          ? Number(timesheet.totalHours).toFixed(2)
                          : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
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

      {isMobile && selectedMobileTimesheet && (
        <MobileDetailDrawer
          open={!!selectedMobileId}
          onClose={() => setSelectedMobileId(null)}
          title={getSubmitterDisplayLabel(selectedMobileTimesheet.consultantName)}
          subtitle={`Week of ${formatWeekStart(selectedMobileTimesheet.weekStart)}`}
          data={[
            {
              label: 'Status',
              node: (
                <Stack direction="row" sx={{ mt: 0.5 }}>
                  <TimesheetStatusDisplay
                    status={selectedMobileTimesheet.status}
                    submittedLate={selectedMobileTimesheet.submittedLate}
                  />
                </Stack>
              ),
            },
            {
              label: 'Total Hours',
              value:
                selectedMobileTimesheet.totalHours != null
                  ? `${Number(selectedMobileTimesheet.totalHours).toFixed(2)} hrs`
                  : '-',
            },
          ]}
          actions={
            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={<RateReviewIcon />}
              onClick={() => handleOpenTimesheet(selectedMobileId)}
            >
              Open Timesheet
            </Button>
          }
        />
      )}
    </Box>
  )
}
