import { useState } from 'react'
import { useLocation, useNavigate, useLoaderData } from 'react-router'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
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
import PageHeader from '../../components/shared/PageHeader'
import TimesheetStatusDisplay from '../../components/shared/TimesheetStatusDisplay.jsx'
import { formatCurrency } from '../../utils/currency.js'
import { formatWeekStart } from '../../utils/dateFormatters'
import { getSubmitterDisplayLabel } from '../../utils/displayLabels'

function getActionButtonLabel(status) {
  switch (status) {
    case 'APPROVED':
      return 'Process'
    case 'COMPLETED':
      return 'View'
    default:
      return 'Open'
  }
}

function getActionButtonIcon(status) {
  switch (status) {
    case 'COMPLETED':
      return VisibilityIcon
    case 'APPROVED':
    default:
      return PaymentIcon
  }
}

const TAB_KEYS = {
  TO_PAY: 'to-pay',
  PAID: 'paid',
}

function getActiveTabKey(search) {
  const tab = new URLSearchParams(search).get('tab')
  return tab === TAB_KEYS.PAID ? TAB_KEYS.PAID : TAB_KEYS.TO_PAY
}

function buildListPath(tabKey) {
  return `/finance/timesheets?tab=${tabKey}`
}

export default function FinanceTimesheetListPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const location = useLocation()
  const navigate = useNavigate()
  const { timesheets, error } = useLoaderData()

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('latest')

  const activeTabKey = getActiveTabKey(location.search)
  const activeTab = activeTabKey === TAB_KEYS.PAID ? 1 : 0

  const displayTimesheets = timesheets.filter((timesheet) =>
    activeTab === 0 ? timesheet.status === 'APPROVED' : timesheet.status === 'COMPLETED'
  )

  const normalizedQuery = searchQuery.trim().toLowerCase()

  const filteredTimesheets = displayTimesheets.filter((timesheet) => {
    if (normalizedQuery.length === 0) return true
    return getSubmitterDisplayLabel(timesheet.consultantName)
      .toLowerCase()
      .includes(normalizedQuery)
  })

  const sortedTimesheets = [...filteredTimesheets].sort((a, b) => {
    if (sortBy === 'latest') return new Date(b.weekStart) - new Date(a.weekStart)
    if (sortBy === 'oldest') return new Date(a.weekStart) - new Date(b.weekStart)
    if (sortBy === 'hoursHigh') return (b.totalHours || 0) - (a.totalHours || 0)
    if (sortBy === 'hoursLow') return (a.totalHours || 0) - (b.totalHours || 0)
    return 0
  })

  function handleTabChange(_event, newValue) {
    const nextTabKey = newValue === 1 ? TAB_KEYS.PAID : TAB_KEYS.TO_PAY
    navigate(buildListPath(nextTabKey), { replace: true })
  }

  function handleOpenTimesheet(timesheetId) {
    navigate(`/finance/timesheets/${timesheetId}`, {
      state: { returnTo: buildListPath(activeTabKey) },
    })
  }

  const pageTitle = activeTabKey === TAB_KEYS.PAID ? 'Paid Timesheets' : 'Timesheets for Payment'

  let emptyMessage =
    activeTabKey === TAB_KEYS.PAID ? 'No paid timesheets found.' : 'No approved timesheets found.'
  if (normalizedQuery) {
    emptyMessage = `No timesheets found for "${searchQuery.trim()}".`
  }

  return (
    <Box>
      <PageHeader title={pageTitle} subtitle="Process approved timesheets and review paid ones">
        <TextField
          placeholder="Search submitters..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ minWidth: { sm: 220 } }}
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

        <FormControl size="small" sx={{ minWidth: 210, width: 210 }}>
          <InputLabel id="finance-sort-label">Sort</InputLabel>
          <Select
            labelId="finance-sort-label"
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

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="To Pay" />
          <Tab label="Paid History" />
        </Tabs>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!error && sortedTimesheets.length === 0 && (
        <Paper sx={{ p: 6, textAlign: 'center', borderStyle: 'dashed' }}>
          <Typography variant="body2" color="text.secondary">
            {emptyMessage}
          </Typography>
        </Paper>
      )}

      {!error &&
        sortedTimesheets.length > 0 &&
        (isMobile ? (
          <Stack spacing={1.5}>
            {sortedTimesheets.map((timesheet) => {
              const ActionIcon = getActionButtonIcon(timesheet.status)

              return (
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
                          {timesheet.totalHours ?? '-'}
                        </Typography>
                      </Box>
                    </Box>

                    {timesheet.status === 'COMPLETED' && (
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                          gap: 1.5,
                        }}
                      >
                        <Box>
                          <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                            Money Received
                          </Typography>
                          <Typography
                            sx={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '0.9rem',
                              fontWeight: 600,
                            }}
                          >
                            {timesheet.totalBillAmount != null
                              ? formatCurrency(timesheet.totalBillAmount)
                              : '-'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                            Paid Out
                          </Typography>
                          <Typography
                            sx={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '0.9rem',
                              fontWeight: 600,
                            }}
                          >
                            {timesheet.totalPayAmount != null
                              ? formatCurrency(timesheet.totalPayAmount)
                              : '-'}
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    <Button
                      variant="outlined"
                      startIcon={<ActionIcon sx={{ fontSize: '0.95rem' }} />}
                      onClick={() => handleOpenTimesheet(timesheet.id)}
                    >
                      {getActionButtonLabel(timesheet.status)}
                    </Button>
                  </Stack>
                </Paper>
              )
            })}
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
                {sortedTimesheets.map((timesheet) => {
                  const ActionIcon = getActionButtonIcon(timesheet.status)

                  return (
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
                          {timesheet.totalHours ?? '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ActionIcon sx={{ fontSize: '0.9rem' }} />}
                          onClick={() => handleOpenTimesheet(timesheet.id)}
                        >
                          {getActionButtonLabel(timesheet.status)}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ))}
    </Box>
  )
}
