import { useEffect, useState } from 'react'
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
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import SaveIcon from '@mui/icons-material/Save'
import SearchIcon from '@mui/icons-material/Search'
import InputAdornment from '@mui/material/InputAdornment'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import PageHeader from '../../components/shared/PageHeader'
import { useUnsavedChangesGuard } from '../../context/useUnsavedChanges.js'
import { getConsultantPayRates, updateDefaultPayRate } from '../../api/users'
import { formatDate } from '../../utils/dateFormatters'

export default function FinancePayRatesPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [consultants, setConsultants] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [pendingRates, setPendingRates] = useState({})
  const [savingById, setSavingById] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  async function fetchConsultants() {
    setLoading(true)
    setError('')
    try {
      const data = await getConsultantPayRates()
      setConsultants(data)
      setPendingRates(
        Object.fromEntries(
          data.map((consultant) => [
            consultant.id,
            consultant.defaultPayRate == null ? '' : String(consultant.defaultPayRate),
          ])
        )
      )
    } catch (err) {
      setError(err.message || 'Failed to load consultant pay rates.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConsultants()
  }, [])

  async function handleSave(consultantId) {
    const nextRate = pendingRates[consultantId]
    const parsedRate = Number(nextRate)

    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      setError('Default pay rate must be greater than 0.')
      return
    }

    setSavingById((prev) => ({ ...prev, [consultantId]: true }))
    setError('')
    setFeedback('')
    try {
      const updated = await updateDefaultPayRate(consultantId, parsedRate)
      setConsultants((prev) => prev.map((consultant) => (
        consultant.id === consultantId ? updated : consultant
      )))
      setPendingRates((prev) => ({ ...prev, [consultantId]: String(updated.defaultPayRate) }))
      setFeedback('Consultant pay rate updated.')
    } catch (err) {
      setError(err.message || 'Failed to update consultant pay rate.')
    } finally {
      setSavingById((prev) => ({ ...prev, [consultantId]: false }))
    }
  }

  const hasUnsavedRateChanges = consultants.some((consultant) => (
    (pendingRates[consultant.id] ?? '') !==
    (consultant.defaultPayRate == null ? '' : String(consultant.defaultPayRate))
  ))

  useUnsavedChangesGuard({
    isDirty: hasUnsavedRateChanges,
    title: 'Leave with unsaved pay-rate edits?',
    message: 'Some consultant pay-rate fields have been edited locally but not saved yet.',
    variant: 'warning',
    discardLabel: 'Discard edits',
    stayLabel: 'Keep editing',
  })

  if (loading) return <LoadingSpinner />

  const filteredConsultants = consultants.filter((consultant) => {
    const q = searchQuery.toLowerCase()
    return (consultant.name || '').toLowerCase().includes(q) || (consultant.email || '').toLowerCase().includes(q)
  })

  return (
    <Box>
      <PageHeader
        title="Consultant Pay Rates"
        subtitle="Configure the default consultant pay rate used to prefill outgoing payroll costs"
      >
        <TextField
          placeholder="Search consultants..."
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
      </PageHeader>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {feedback && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setFeedback('')}>
          {feedback}
        </Alert>
      )}

      {filteredConsultants.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderStyle: 'dashed' }}>
          <Typography variant="body2" color="text.secondary">
            No consultants found.
          </Typography>
        </Paper>
      ) : isMobile ? (
        <Stack spacing={1.5}>
          {filteredConsultants.map((consultant) => {
            const currentRate = pendingRates[consultant.id] ?? ''
            const isDirty = currentRate !== (consultant.defaultPayRate == null ? '' : String(consultant.defaultPayRate))

            return (
              <Paper key={consultant.id} sx={{ p: 2.5 }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {consultant.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.78rem',
                        color: 'text.secondary',
                      }}
                    >
                      {consultant.email}
                    </Typography>
                  </Box>

                  <TextField
                    label="Default Pay Rate (£/hr)"
                    type="number"
                    value={currentRate}
                    onChange={(event) => setPendingRates((prev) => ({
                      ...prev,
                      [consultant.id]: event.target.value,
                    }))}
                    slotProps={{ htmlInput: { min: '0.01', step: '0.01' } }}
                    helperText={consultant.defaultPayRate == null ? 'No default set yet.' : `Current default saved on ${formatDate(consultant.createdAt)}`}
                    fullWidth
                  />

                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    disabled={!isDirty || savingById[consultant.id]}
                    onClick={() => handleSave(consultant.id)}
                  >
                    {savingById[consultant.id] ? 'Saving...' : 'Save Pay Rate'}
                  </Button>
                </Stack>
              </Paper>
            )
          })}
        </Stack>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Consultant</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Default Pay Rate</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredConsultants.map((consultant) => {
                const currentRate = pendingRates[consultant.id] ?? ''
                const isDirty = currentRate !== (consultant.defaultPayRate == null ? '' : String(consultant.defaultPayRate))

                return (
                  <TableRow key={consultant.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {consultant.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.78rem',
                        }}
                      >
                        {consultant.email}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 220 }}>
                      <TextField
                        size="small"
                        label="£/hr"
                        type="number"
                        value={currentRate}
                        onChange={(event) => setPendingRates((prev) => ({
                          ...prev,
                          [consultant.id]: event.target.value,
                        }))}
                        slotProps={{ htmlInput: { min: '0.01', step: '0.01' } }}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<SaveIcon />}
                        disabled={!isDirty || savingById[consultant.id]}
                        onClick={() => handleSave(consultant.id)}
                      >
                        {savingById[consultant.id] ? 'Saving...' : 'Save'}
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
