import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
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
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import PaymentIcon from '@mui/icons-material/Payment'
import VisibilityIcon from '@mui/icons-material/Visibility'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import PageHeader from '../../components/shared/PageHeader'
import TimesheetStatusDisplay from '../../components/shared/TimesheetStatusDisplay.jsx'
import { getTimesheets } from '../../api/timesheets'
import { formatWeekStart } from '../../utils/dateFormatters'
import { getConsultantDisplayLabel } from '../../utils/displayLabels'

function formatCurrency(value) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

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
  const [timesheets, setTimesheets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const activeTabKey = getActiveTabKey(location.search)
  const activeTab = activeTabKey === TAB_KEYS.PAID ? 1 : 0

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

  const displayTimesheets = timesheets.filter((ts) =>
    activeTab === 0 ? ts.status === 'APPROVED' : ts.status === 'COMPLETED'
  )

  function handleTabChange(_event, newValue) {
    const nextTabKey = newValue === 1 ? TAB_KEYS.PAID : TAB_KEYS.TO_PAY
    navigate(buildListPath(nextTabKey), { replace: true })
  }

  function handleOpenTimesheet(timesheetId) {
    navigate(`/finance/timesheets/${timesheetId}`, {
      state: { returnTo: buildListPath(activeTabKey) },
    })
  }

  return (
    <Box>
      <PageHeader
        title="Timesheets for Payment"
        subtitle="Process approved timesheets and review paid ones"
      />

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

      {!error && displayTimesheets.length === 0 && (
        <Paper sx={{ p: 6, textAlign: 'center', borderStyle: 'dashed' }}>
          <Typography variant="body2" color="text.secondary">
            {activeTab === 0 ? 'No approved timesheets found.' : 'No paid timesheets found.'}
          </Typography>
        </Paper>
      )}

      {!error && displayTimesheets.length > 0 && (
        isMobile ? (
          <Stack spacing={1.5}>
            {displayTimesheets.map((ts) => {
              const ActionIcon = getActionButtonIcon(ts.status)

              return (
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
                      <TimesheetStatusDisplay status={ts.status} submittedLate={ts.submittedLate} />
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

                    {ts.status === 'COMPLETED' && (
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
                            {ts.totalBillAmount != null ? formatCurrency(ts.totalBillAmount) : '-'}
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
                            {ts.totalPayAmount != null ? formatCurrency(ts.totalPayAmount) : '-'}
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    <Button
                      variant="outlined"
                      startIcon={<ActionIcon sx={{ fontSize: '0.95rem' }} />}
                      onClick={() => handleOpenTimesheet(ts.id)}
                    >
                      {getActionButtonLabel(ts.status)}
                    </Button>
                  </Stack>
                </Paper>
              )
            })}
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
              {displayTimesheets.map((ts) => {
                  const ActionIcon = getActionButtonIcon(ts.status)

                  return (
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
                        <TimesheetStatusDisplay status={ts.status} submittedLate={ts.submittedLate} />
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
                          startIcon={<ActionIcon sx={{ fontSize: '0.9rem' }} />}
                          onClick={() => handleOpenTimesheet(ts.id)}
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
        )
      )}
    </Box>
  )
}
