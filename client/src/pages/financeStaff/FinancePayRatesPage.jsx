import { useEffect, useState } from 'react'
import { useLoaderData } from 'react-router'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import InputAdornment from '@mui/material/InputAdornment'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import SaveIcon from '@mui/icons-material/Save'
import SearchIcon from '@mui/icons-material/Search'
import PageHeader from '../../components/shared/PageHeader'
import SaveStateBanner from '../../components/shared/SaveStateBanner.jsx'
import StickyActionBar from '../../components/shared/StickyActionBar.jsx'
import { useUnsavedChangesGuard } from '../../context/useUnsavedChanges.js'
import { useQueryStateObject } from '../../hooks/useQueryState.js'
import { updateDefaultPayRate } from '../../api/users'
import { palette } from '../../theme.js'

function getPendingRateValue(consultant) {
  return consultant.defaultPayRate == null ? '' : String(consultant.defaultPayRate)
}

function getValidationMessage(value) {
  if (!value.trim()) return 'Enter a default pay rate.'

  const parsedRate = Number(value)
  if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
    return 'Enter a pay rate greater than 0.'
  }

  return ''
}

function formatRateLabel(rate) {
  if (rate == null) return 'No default pay rate saved yet.'
  return `Saved default: £${Number(rate).toFixed(2)}/hr`
}

export default function FinancePayRatesPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { consultants: loadedConsultants, error: loadError } = useLoaderData()
  const [{ q: searchQuery }, setQueryState] = useQueryStateObject({ q: '' })

  const [consultants, setConsultants] = useState(loadedConsultants)
  const [pendingRates, setPendingRates] = useState(() =>
    Object.fromEntries(
      loadedConsultants.map((consultant) => [consultant.id, getPendingRateValue(consultant)])
    )
  )
  const [savingIds, setSavingIds] = useState([])
  const [error, setError] = useState(loadError)
  const [rowSaveErrors, setRowSaveErrors] = useState({})
  const [saveState, setSaveState] = useState({
    state: 'idle',
    message: 'All default pay rates are up to date.',
  })

  useEffect(() => {
    setConsultants(loadedConsultants)
    setPendingRates(
      Object.fromEntries(
        loadedConsultants.map((consultant) => [consultant.id, getPendingRateValue(consultant)])
      )
    )
    setSavingIds([])
    setRowSaveErrors({})
    setError(loadError)
    setSaveState({
      state: loadError ? 'error' : 'idle',
      message: loadError ? 'Submitter pay rates could not be loaded.' : 'All default pay rates are up to date.',
    })
  }, [loadedConsultants, loadError])

  const rowMetaById = Object.fromEntries(
    consultants.map((consultant) => {
      const currentRate = pendingRates[consultant.id] ?? ''
      const savedRate = getPendingRateValue(consultant)
      const isDirty = currentRate !== savedRate
      const validationMessage = isDirty ? getValidationMessage(currentRate) : ''

      return [
        consultant.id,
        {
          currentRate,
          savedRate,
          isDirty,
          validationMessage,
          parsedRate: validationMessage ? null : Number(currentRate),
        },
      ]
    })
  )

  const dirtyConsultants = consultants.filter((consultant) => rowMetaById[consultant.id].isDirty)
  const invalidDirtyConsultants = dirtyConsultants.filter(
    (consultant) => rowMetaById[consultant.id].validationMessage
  )
  const hasUnsavedRateChanges = dirtyConsultants.length > 0

  useUnsavedChangesGuard({
    isDirty: hasUnsavedRateChanges,
    title: 'Leave with unsaved pay-rate edits?',
    message: 'Some submitter pay-rate fields have been edited locally but not saved yet.',
    variant: 'warning',
    discardLabel: 'Discard edits',
    stayLabel: 'Keep editing',
  })

  function handleRateChange(consultantId, value) {
    setPendingRates((prev) => ({ ...prev, [consultantId]: value }))
    setError('')
    setRowSaveErrors((prev) => {
      if (!prev[consultantId]) return prev

      const next = { ...prev }
      delete next[consultantId]
      return next
    })

    const pendingValidationMessage = getValidationMessage(value)
    setSaveState({
      state: pendingValidationMessage ? 'error' : 'dirty',
      message: pendingValidationMessage
        ? 'Fix the highlighted pay-rate rows before saving.'
        : 'Default pay-rate edits are ready to save.',
    })
  }

  async function handleSaveAll() {
    if (!dirtyConsultants.length) return

    if (invalidDirtyConsultants.length > 0) {
      const message = `Fix ${invalidDirtyConsultants.length} invalid pay-rate row${invalidDirtyConsultants.length === 1 ? '' : 's'} before saving.`
      setError(message)
      setSaveState({ state: 'error', message })
      return
    }

    const dirtyIds = dirtyConsultants.map((consultant) => consultant.id)
    setSavingIds(dirtyIds)
    setError('')
    setRowSaveErrors({})
    setSaveState({
      state: 'saving',
      message: `Saving ${dirtyConsultants.length} pay-rate change${dirtyConsultants.length === 1 ? '' : 's'}...`,
    })

    const results = await Promise.allSettled(
      dirtyConsultants.map((consultant) =>
        updateDefaultPayRate(consultant.id, rowMetaById[consultant.id].parsedRate)
      )
    )

    const updatedConsultantsById = {}
    const nextRowErrors = {}

    results.forEach((result, index) => {
      const consultant = dirtyConsultants[index]
      if (result.status === 'fulfilled') {
        updatedConsultantsById[consultant.id] = result.value
        return
      }

      nextRowErrors[consultant.id] =
        result.reason?.message ?? 'This pay rate could not be saved. Try again.'
    })

    setConsultants((prev) =>
      prev.map((consultant) => updatedConsultantsById[consultant.id] ?? consultant)
    )
    setPendingRates((prev) => {
      const next = { ...prev }
      Object.values(updatedConsultantsById).forEach((consultant) => {
        next[consultant.id] = getPendingRateValue(consultant)
      })
      return next
    })
    setSavingIds([])
    setRowSaveErrors(nextRowErrors)

    const failedCount = Object.keys(nextRowErrors).length
    const savedCount = dirtyConsultants.length - failedCount

    if (failedCount > 0) {
      const message =
        savedCount > 0
          ? `Saved ${savedCount} pay-rate change${savedCount === 1 ? '' : 's'}, but ${failedCount} row${failedCount === 1 ? '' : 's'} still need attention.`
          : `None of the ${dirtyConsultants.length} edited pay-rate rows could be saved.`
      setError('Some pay-rate updates failed. Review the marked rows and try again.')
      setSaveState({ state: 'error', message })
      return
    }

    setError('')
    setSaveState({
      state: 'saved',
      message: `Saved ${savedCount} pay-rate change${savedCount === 1 ? '' : 's'}.`,
    })
  }

  const filteredConsultants = consultants.filter((consultant) => {
    const q = searchQuery.trim().toLowerCase()
    return (
      (consultant.name || '').toLowerCase().includes(q) ||
      (consultant.email || '').toLowerCase().includes(q)
    )
  })

  const stickyMessage =
    invalidDirtyConsultants.length > 0
      ? `Fix ${invalidDirtyConsultants.length} invalid row${invalidDirtyConsultants.length === 1 ? '' : 's'} before saving.`
      : dirtyConsultants.length > 0
        ? `${dirtyConsultants.length} pay-rate change${dirtyConsultants.length === 1 ? '' : 's'} ready to save.`
        : 'No unsaved pay-rate edits.'

  return (
    <Box>
      <PageHeader
        title="Submitter Pay Rates"
        subtitle="Configure default pay rates used to prefill outgoing payroll costs"
      >
        <TextField
          placeholder="Search submitters..."
          size="small"
          value={searchQuery}
          onChange={(event) => setQueryState({ q: event.target.value })}
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

      {filteredConsultants.length === 0 ? (
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
            No submitters found.
          </Typography>
        </Box>
      ) : isMobile ? (
        <Stack
          divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}
          spacing={0}
        >
          {filteredConsultants.map((consultant) => {
            const rowMeta = rowMetaById[consultant.id]
            const rowError = rowSaveErrors[consultant.id] ?? rowMeta.validationMessage
            const isSaving = savingIds.includes(consultant.id)
            const helperText = rowError
              ? rowError
              : isSaving
                ? 'Saving pay-rate change...'
                : rowMeta.isDirty
                  ? 'Ready to save in the sticky action bar.'
                  : formatRateLabel(consultant.defaultPayRate)

            return (
              <Box key={consultant.id} sx={{ py: 2.5 }}>
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
                    value={rowMeta.currentRate}
                    onChange={(event) => handleRateChange(consultant.id, event.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">£</InputAdornment>,
                      },
                      htmlInput: { min: '0.01', step: '0.01' },
                    }}
                    error={Boolean(rowError)}
                    helperText={helperText}
                    fullWidth
                  />

                  <Typography
                    variant="body2"
                    sx={{
                      color: rowError
                        ? palette.error
                        : rowMeta.isDirty
                          ? palette.warning
                          : palette.textSecondary,
                    }}
                  >
                    {rowError
                      ? 'Needs attention'
                      : isSaving
                        ? 'Saving...'
                        : rowMeta.isDirty
                          ? 'Unsaved change'
                          : 'Saved'}
                  </Typography>
                </Stack>
              </Box>
            )
          })}
        </Stack>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Submitter</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Default Pay Rate</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredConsultants.map((consultant) => {
                const rowMeta = rowMetaById[consultant.id]
                const rowError = rowSaveErrors[consultant.id] ?? rowMeta.validationMessage
                const isSaving = savingIds.includes(consultant.id)

                return (
                  <TableRow key={consultant.id} hover selected={rowMeta.isDirty}>
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
                    <TableCell sx={{ width: 260 }}>
                      <TextField
                        size="small"
                        label="Default Pay Rate"
                        type="number"
                        value={rowMeta.currentRate}
                        onChange={(event) => handleRateChange(consultant.id, event.target.value)}
                        slotProps={{
                          input: {
                            startAdornment: <InputAdornment position="start">£</InputAdornment>,
                          },
                          htmlInput: { min: '0.01', step: '0.01' },
                        }}
                        error={Boolean(rowError)}
                        helperText={
                          rowError
                            ? rowError
                            : isSaving
                              ? 'Saving pay-rate change...'
                              : formatRateLabel(consultant.defaultPayRate)
                        }
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          color: rowError
                            ? palette.error
                            : rowMeta.isDirty
                              ? palette.warning
                              : palette.textSecondary,
                          fontWeight: rowMeta.isDirty || rowError ? 600 : 500,
                        }}
                      >
                        {rowError
                          ? 'Needs attention'
                          : isSaving
                            ? 'Saving...'
                            : rowMeta.isDirty
                              ? 'Unsaved change'
                              : 'Saved'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <StickyActionBar
        sx={{ mt: 3 }}
        secondary={
          <Stack spacing={0.75}>
            <SaveStateBanner state={saveState.state} message={saveState.message} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {stickyMessage}
            </Typography>
          </Stack>
        }
      >
        <Button
          variant="contained"
          size="large"
          startIcon={<SaveIcon />}
          disabled={savingIds.length > 0 || dirtyConsultants.length === 0 || invalidDirtyConsultants.length > 0}
          onClick={() => {
            void handleSaveAll()
          }}
        >
          {savingIds.length > 0
            ? 'Saving Pay Rates...'
            : dirtyConsultants.length > 0
              ? `Save ${dirtyConsultants.length} Change${dirtyConsultants.length === 1 ? '' : 's'}`
              : 'All Changes Saved'}
        </Button>
      </StickyActionBar>
    </Box>
  )
}
