import { useState, useEffect } from 'react'
import { useLoaderData } from 'react-router'
import { useQueryStateObject } from '../../hooks/useQueryState.js'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Badge from '@mui/material/Badge'
import Pagination from '@mui/material/Pagination'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import TuneIcon from '@mui/icons-material/Tune'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import dayjs from 'dayjs'
import PageHeader from '../../components/shared/PageHeader'
import FilterBottomSheet from '../../components/shared/FilterBottomSheet.jsx'
import MobileDetailDrawer from '../../components/shared/MobileDetailDrawer.jsx'
import {
  getAuditActionDisplayLabel,
  getAuditActorDisplayLabel,
  getAuditTimesheetDisplayLabel,
} from '../../utils/displayLabels'
import { formatTimestamp } from '../../utils/dateFormatters'
import ActionBadge from '../../components/shared/ActionBadge'

const ACTION_OPTIONS = ['SUBMISSION', 'APPROVAL', 'REJECTION', 'FINANCE_RETURN', 'PROCESSING']

const QUERY_STATE_CONFIG = { action: '', author: '', from: '', to: '', page: '1' }
const QUERY_DATE_FORMAT = 'YYYY-MM-DD'
const FILTER_DISPLAY_DATE_FORMAT = 'DD-MM-YYYY'
const PAGE_SIZE = 25

function formatActionFilterLabel(action) {
  return typeof action === 'string' ? action.toUpperCase().replaceAll('_', ' ') : ''
}

function formatDetail(action, detail) {
  if (detail === null || detail === undefined) return '-'
  switch (action) {
    case 'SUBMISSION':
      return detail.submittedLate ? 'Submitted from draft · Late' : 'Submitted from draft'
    case 'APPROVAL':
      return 'Approved'
    case 'REJECTION':
      return detail.comment ? `Rejected: ${detail.comment}` : 'Rejected'
    case 'FINANCE_RETURN':
      return detail.comment ? `Returned to manager: ${detail.comment}` : 'Returned to manager'
    case 'PROCESSING': {
      if (Array.isArray(detail.breakdowns) && detail.breakdowns.length > 0) {
        const incoming =
          detail.totalBillAmount != null
            ? `In \u00A3${Number(detail.totalBillAmount).toFixed(2)}`
            : null
        const outgoing =
          detail.totalPayAmount != null
            ? `Out \u00A3${Number(detail.totalPayAmount).toFixed(2)}`
            : null
        const margin =
          detail.marginAmount != null ? `Net \u00A3${Number(detail.marginAmount).toFixed(2)}` : null
        return [
          `${detail.breakdowns.length} categories`,
          detail.totalHours != null ? `${Number(detail.totalHours).toFixed(2)}h` : null,
          incoming,
          outgoing,
          margin,
        ]
          .filter(Boolean)
          .join(' · ')
      }

      if (detail.totalBillAmount != null || detail.totalPayAmount != null) {
        return [
          detail.totalHours != null ? `${Number(detail.totalHours).toFixed(2)}h` : null,
          detail.totalBillAmount != null
            ? `In \u00A3${Number(detail.totalBillAmount).toFixed(2)}`
            : null,
          detail.totalPayAmount != null
            ? `Out \u00A3${Number(detail.totalPayAmount).toFixed(2)}`
            : null,
          detail.marginAmount != null
            ? `Net \u00A3${Number(detail.marginAmount).toFixed(2)}`
            : null,
        ]
          .filter(Boolean)
          .join(' · ')
      }

      const rateValue = detail.hourlyRate ?? detail.dailyRate
      const rate = rateValue != null ? `\u00A3${Number(rateValue).toFixed(2)}/hr` : ''
      const hours = detail.totalHours != null ? `${Number(detail.totalHours).toFixed(2)}h` : ''
      const amount = detail.amount != null ? `\u00A3${Number(detail.amount).toFixed(2)}` : ''
      return [rate, hours, amount].filter(Boolean).join(' x ').replace(' x \u00A3', ' = \u00A3')
    }
    default:
      return typeof detail === 'object' ? JSON.stringify(detail) : String(detail)
  }
}

export default function AuditLogPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { entries, error: loadError } = useLoaderData()
  const [error, setError] = useState(loadError)
  const [queryState, setQueryState] = useQueryStateObject(QUERY_STATE_CONFIG)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [selectedMobileId, setSelectedMobileId] = useState(null)

  const actionFilter = queryState.action || null
  const authorFilter = queryState.author || null
  const dateFrom = queryState.from ? dayjs(queryState.from) : null
  const dateTo = queryState.to ? dayjs(queryState.to) : null
  const parsedPage = Number.parseInt(queryState.page, 10)
  const requestedPage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1

  const handleClearFilters = () => {
    setQueryState({ action: '', author: '', from: '', to: '', page: '1' })
  }

  useEffect(() => {
    setError(loadError)
  }, [loadError])

  const authorOptions = [
    ...new Set(entries.map((e) => getAuditActorDisplayLabel(e.performedByName))),
  ].sort()

  const hasFilters = Boolean(actionFilter || authorFilter || dateFrom || dateTo)
  const activeFilterCount = [actionFilter, authorFilter, dateFrom, dateTo].filter(Boolean).length

  const filterInputs = (
    <>
      <Autocomplete
        options={ACTION_OPTIONS}
        getOptionLabel={formatActionFilterLabel}
        value={actionFilter}
        onChange={(_e, value) => setQueryState({ action: value ?? '', page: '1' })}
        size="small"
        sx={{ width: { xs: '100%', sm: 'auto' }, flex: { sm: '1 1 180px' }, minWidth: { sm: 180 } }}
        renderInput={(params) => <TextField {...params} label="Action" />}
      />
      <Autocomplete
        options={authorOptions}
        value={authorFilter}
        onChange={(_e, value) => setQueryState({ author: value ?? '', page: '1' })}
        size="small"
        sx={{ width: { xs: '100%', sm: 'auto' }, flex: { sm: '1 1 200px' }, minWidth: { sm: 200 } }}
        renderInput={(params) => <TextField {...params} label="Performed By" />}
      />
      <DatePicker
        label="From"
        format={FILTER_DISPLAY_DATE_FORMAT}
        value={dateFrom}
        onChange={(value) =>
          setQueryState({
            from: value && value.isValid() ? value.format(QUERY_DATE_FORMAT) : '',
            page: '1',
          })
        }
        slotProps={{
          field: { clearable: true, size: 'small' },
          textField: { size: 'small' },
        }}
        sx={{ width: { xs: '100%', sm: 'auto' }, flex: { sm: '1 1 150px' }, minWidth: { sm: 150 } }}
      />
      <DatePicker
        label="To"
        format={FILTER_DISPLAY_DATE_FORMAT}
        value={dateTo}
        onChange={(value) =>
          setQueryState({
            to: value && value.isValid() ? value.format(QUERY_DATE_FORMAT) : '',
            page: '1',
          })
        }
        slotProps={{
          field: { clearable: true, size: 'small' },
          textField: { size: 'small' },
        }}
        sx={{ width: { xs: '100%', sm: 'auto' }, flex: { sm: '1 1 150px' }, minWidth: { sm: 150 } }}
      />
    </>
  )

  const filtered = entries.filter((e) => {
    if (actionFilter && e.action !== actionFilter) return false
    if (authorFilter && getAuditActorDisplayLabel(e.performedByName) !== authorFilter) return false
    if (dateFrom && dayjs(e.createdAt).isBefore(dateFrom, 'day')) return false
    if (dateTo && dayjs(e.createdAt).isAfter(dateTo, 'day')) return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(requestedPage, totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageEnd = pageStart + PAGE_SIZE
  const pagedEntries = filtered.slice(pageStart, pageEnd)
  const selectedMobileLog = pagedEntries.find((e) => e.id === selectedMobileId) ?? null

  useEffect(() => {
    if (queryState.page !== String(currentPage)) {
      setQueryState({ page: String(currentPage) })
    }
  }, [currentPage, queryState.page, setQueryState])

  useEffect(() => {
    setSelectedMobileId(null)
  }, [currentPage, actionFilter, authorFilter, queryState.from, queryState.to])

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        <PageHeader title="Audit Log" subtitle="Track all timesheet actions and events" />

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3, pb: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
          {isMobile ? (
            <Badge badgeContent={activeFilterCount} color="primary" sx={{ '& .MuiBadge-badge': { right: 8, top: 8 } }}>
              <Button
                variant="outlined"
                startIcon={<TuneIcon />}
                onClick={() => setFilterSheetOpen(true)}
                fullWidth
              >
                Filters
              </Button>
            </Badge>
          ) : (
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
              {filterInputs}
              {hasFilters && (
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleClearFilters}
                  sx={{ flex: '0 0 auto', height: 40, whiteSpace: 'nowrap' }}
                >
                  Clear Filters
                </Button>
              )}
            </Stack>
          )}
        </Box>

        <FilterBottomSheet
          open={filterSheetOpen}
          onClose={() => setFilterSheetOpen(false)}
          title="Filters"
          onClear={hasFilters ? handleClearFilters : undefined}
          clearLabel="Clear"
          applyLabel="Done"
        >
          {filterInputs}
        </FilterBottomSheet>

        {/* Desktop View */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <TableContainer component={Paper}>
            <Table size="small" sx={{ tableLayout: 'auto' }}>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Performed By</TableCell>
                  <TableCell>Timesheet</TableCell>
                  <TableCell>Detail</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedEntries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.75rem',
                        }}
                      >
                        {formatTimestamp(e.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <ActionBadge action={e.action} />
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                      >
                        {getAuditActorDisplayLabel(e.performedByName)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                      >
                        {getAuditTimesheetDisplayLabel({
                          consultantName: e.timesheetConsultantName,
                          weekStart: e.timesheetWeekStart,
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell
                      sx={{
                        maxWidth: { md: 320 },
                        whiteSpace: 'normal',
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word',
                      }}
                      title={formatDetail(e.action, e.detail)}
                    >
                      <Typography
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.72rem',
                          color: 'text.secondary',
                          whiteSpace: 'normal',
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word',
                        }}
                      >
                        {formatDetail(e.action, e.detail)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary" variant="body1" gutterBottom>
                        {hasFilters ? 'No entries match your filters.' : 'No audit log entries found.'}
                      </Typography>
                      {hasFilters && (
                        <Button variant="outlined" size="small" onClick={handleClearFilters} sx={{ mt: 1 }}>
                          Clear Filters
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Mobile View */}
        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
          {filtered.length === 0 ? (
            <Box
              sx={{
                py: 6,
                textAlign: 'center',
                borderTop: '1px dashed',
                borderBottom: '1px dashed',
                borderColor: 'divider',
              }}
            >
              <Typography color="text.secondary" variant="body2" gutterBottom>
                {hasFilters ? 'No entries match your filters.' : 'No audit log entries found.'}
              </Typography>
              {hasFilters && (
                <Button variant="outlined" size="small" onClick={handleClearFilters} sx={{ mt: 1 }}>
                  Clear Filters
                </Button>
              )}
            </Box>
          ) : (
            <Stack
              divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}
              spacing={0}
            >
              {pagedEntries.map((e) => (
                <ButtonBase
                  key={e.id}
                  component="button"
                  type="button"
                  onClick={() => setSelectedMobileId(e.id)}
                  aria-label={`Open audit log details for ${getAuditActorDisplayLabel(e.performedByName)} at ${formatTimestamp(e.createdAt)}`}
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
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.25} spacing={1.5}>
                    <ActionBadge action={e.action} />
                    <Typography
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.7rem',
                        color: 'text.secondary',
                      }}
                    >
                      {formatTimestamp(e.createdAt)}
                    </Typography>
                  </Stack>

                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.25 }}>
                    {getAuditActorDisplayLabel(e.performedByName)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {getAuditTimesheetDisplayLabel({
                      consultantName: e.timesheetConsultantName,
                      weekStart: e.timesheetWeekStart,
                    })}
                  </Typography>
                </ButtonBase>
              ))}
            </Stack>
          )}
        </Box>

        {isMobile && selectedMobileLog && (
          <MobileDetailDrawer
            open={!!selectedMobileId}
            onClose={() => setSelectedMobileId(null)}
            title={getAuditActorDisplayLabel(selectedMobileLog.performedByName)}
            subtitle={formatTimestamp(selectedMobileLog.createdAt)}
            data={[
              {
                label: 'Action',
                value: getAuditActionDisplayLabel(selectedMobileLog.action)
              },
              {
                label: 'Timesheet',
                value: getAuditTimesheetDisplayLabel({
                  consultantName: selectedMobileLog.timesheetConsultantName,
                  weekStart: selectedMobileLog.timesheetWeekStart,
                })
              },
              {
                label: 'Details',
                node: (
                  <Typography
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.85rem',
                      color: 'text.primary',
                      whiteSpace: 'normal',
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                    }}
                  >
                    {formatDetail(selectedMobileLog.action, selectedMobileLog.detail)}
                  </Typography>
                )
              }
            ]}
          />
        )}

        {filtered.length > 0 && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
            sx={{ mt: 2.5 }}
          >
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.7rem',
                color: 'text.secondary',
              }}
            >
              Showing {pageStart + 1}-{Math.min(pageEnd, filtered.length)} of {filtered.length} entries
              {filtered.length !== entries.length ? ` (${entries.length} total)` : ''}
            </Typography>

            {totalPages > 1 && (
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(_event, page) => setQueryState({ page: String(page) })}
                color="primary"
                shape="circular"
                size={isMobile ? 'medium' : 'small'}
                siblingCount={isMobile ? 0 : 1}
                boundaryCount={1}
                showFirstButton
                showLastButton
              />
            )}
          </Stack>
        )}
      </Box>
    </LocalizationProvider>
  )
}
