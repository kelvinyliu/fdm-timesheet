import { useState } from 'react'
import { useNavigate, useLoaderData } from 'react-router'
import useQueryState from '../../hooks/useQueryState.js'
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

function buildListPath(tabKey) {
  return tabKey === TAB_KEYS.PAID ? `/finance/timesheets?tab=${tabKey}` : '/finance/timesheets'
}

export default function FinanceTimesheetListPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const navigate = useNavigate()
  const { timesheets, error } = useLoaderData()

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('latest')

  const [tab, setTab] = useQueryState('tab', TAB_KEYS.TO_PAY)
  const activeTabKey = tab === TAB_KEYS.PAID ? TAB_KEYS.PAID : TAB_KEYS.TO_PAY
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
    setTab(newValue === 1 ? TAB_KEYS.PAID : TAB_KEYS.TO_PAY)
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

  const draftCount = timesheets.filter((ts) => ts.status === 'DRAFT').length
  const pendingCount = timesheets.filter((ts) => ts.status === 'PENDING').length
  const rejectedCount = timesheets.filter((ts) => ts.status === 'REJECTED').length
  const approvedOrPaidCount = timesheets.filter(
    (ts) => ts.status === 'APPROVED' || ts.status === 'COMPLETED'
  ).length

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
        sortedTimesheets.length > 0 &&
        (isMobile ? (
          <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />} spacing={0}>
            {sortedTimesheets.map((timesheet) => {
              const ActionIcon = getActionButtonIcon(timesheet.status)

              return (
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
                    <Typography variant="body2" color="text.secondary">
                      {formatWeekStart(timesheet.weekStart)}
                      {timesheet.totalHours != null && ` · ${Number(timesheet.totalHours).toFixed(2)} hrs`}
                    </Typography>
                    {timesheet.status === 'COMPLETED' && (
                      <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                        {timesheet.totalBillAmount != null
                          ? `Received ${formatCurrency(timesheet.totalBillAmount)}`
                          : ''}
                        {timesheet.totalPayAmount != null
                          ? ` · Paid ${formatCurrency(timesheet.totalPayAmount)}`
                          : ''}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ActionIcon sx={{ fontSize: '0.9rem' }} />}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenTimesheet(timesheet.id)
                        }}
                      >
                        {getActionButtonLabel(timesheet.status)}
                      </Button>
                    </Box>
                  </Stack>
                </Box>
              )
            })}
          </Stack>
        ) : (
          <TableContainer component={Paper}>
            <Table sx={{ tableLayout: 'auto' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ py: 1.75 }}>Submitter</TableCell>
                  <TableCell sx={{ py: 1.75 }}>Week of</TableCell>
                  <TableCell sx={{ py: 1.75 }}>Status</TableCell>
                  <TableCell align="right" sx={{ py: 1.75 }}>Total Hours</TableCell>
                  <TableCell align="right" sx={{ py: 1.75 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedTimesheets.map((timesheet) => {
                  const ActionIcon = getActionButtonIcon(timesheet.status)

                  return (
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
                      <TableCell sx={{ py: 1.75 }}>
                        <Typography variant="body2" fontWeight={500}>
                          {getSubmitterDisplayLabel(timesheet.consultantName)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.75 }}>
                        <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.95rem' }}>
                          {formatWeekStart(timesheet.weekStart)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.75 }}>
                        <TimesheetStatusDisplay
                          status={timesheet.status}
                          submittedLate={timesheet.submittedLate}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1.75 }}>
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
                      <TableCell align="right" sx={{ py: 1.75 }} onClick={(e) => e.stopPropagation()}>
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
