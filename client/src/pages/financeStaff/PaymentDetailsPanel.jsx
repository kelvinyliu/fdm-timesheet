import { Fragment } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import FastForwardIcon from '@mui/icons-material/FastForward'
import PaymentIcon from '@mui/icons-material/Payment'
import SaveStateBanner from '../../components/shared/SaveStateBanner.jsx'
import StickyActionBar from '../../components/shared/StickyActionBar.jsx'
import { palette } from '../../theme.js'
import { getWorkBucketDisplayLabel } from '../../utils/displayLabels.js'
import { getWorkBucketKey } from '../../utils/timesheetMatrix.js'

const overlineSx = {
  fontFamily: '"Outfit", system-ui, sans-serif',
  fontSize: '0.72rem',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.2em',
  color: 'text.secondary',
  mb: 2,
}

export default function PaymentDetailsPanel({
  isMobile,
  computedBuckets,
  bucketRates,
  setBucketRates,
  notes,
  setNotes,
  isPaymentReady,
  totals,
  netMargin,
  submitting,
  nextId,
  onProcessPayment,
  formatCurrency,
  saveState,
  disabledReason,
}) {
  return (
    <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
      <Typography sx={overlineSx}>Payment Details</Typography>

      <Alert severity="info" sx={{ mb: 4 }}>
        Rates are pre-filled from client assignments and submitter defaults. Overrides only affect
        this payment processing.
      </Alert>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 160px 160px' },
          columnGap: 2,
          rowGap: { xs: 4, sm: 3 },
          alignItems: 'start',
        }}
      >
        {!isMobile && (
          <>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                fontWeight: 500,
                fontSize: '0.68rem',
              }}
            >
              Work Category
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                fontWeight: 500,
                fontSize: '0.68rem',
              }}
            >
              Client Bill Rate
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                fontWeight: 500,
                fontSize: '0.68rem',
              }}
            >
              Submitter Pay Rate
            </Typography>
            <Box sx={{ gridColumn: '1 / -1', mt: -1 }}>
              <Divider />
            </Box>
          </>
        )}

        {computedBuckets.map((item) => {
          const bucketKey = getWorkBucketKey(item)
          const showBillRateError = item.entryKind === 'CLIENT' && !item.hasValidBillRate
          const showPayRateError = !item.hasValidPayRate
          const billRateHelper =
            item.entryKind === 'INTERNAL'
              ? 'Internal work uses a fixed bill rate of £0.00.'
              : showBillRateError
                ? 'Enter a bill rate greater than 0.'
                : undefined
          const payRateHelper = showPayRateError
            ? 'Enter a pay rate greater than 0.'
            : undefined

          return (
            <Fragment key={bucketKey}>
              <Box sx={{ pt: { sm: 1 } }}>
                <Typography variant="body2" fontWeight={600}>
                  {getWorkBucketDisplayLabel(item.bucketLabel)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {item.totalHours != null ? Number(item.totalHours).toFixed(2) : '-'} hours recorded
                </Typography>
              </Box>

              <TextField
                label={isMobile ? 'Client Bill Rate (£/hr)' : ''}
                type="number"
                size="small"
                required={item.entryKind === 'CLIENT'}
                value={bucketRates[bucketKey]?.billRate ?? ''}
                onChange={(event) =>
                  setBucketRates((prev) => ({
                    ...prev,
                    [bucketKey]: {
                      ...(prev[bucketKey] ?? {}),
                      billRate: event.target.value,
                    },
                  }))
                }
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">£</InputAdornment>,
                    readOnly: item.entryKind === 'INTERNAL',
                  },
                  htmlInput: { min: 0, step: '0.01' },
                }}
                disabled={item.entryKind === 'INTERNAL'}
                fullWidth
                error={showBillRateError}
                helperText={billRateHelper}
              />

              <TextField
                label={isMobile ? 'Submitter Pay Rate (£/hr)' : ''}
                type="number"
                size="small"
                required
                value={bucketRates[bucketKey]?.payRate ?? ''}
                onChange={(event) =>
                  setBucketRates((prev) => ({
                    ...prev,
                    [bucketKey]: {
                      ...(prev[bucketKey] ?? {}),
                      payRate: event.target.value,
                    },
                  }))
                }
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">£</InputAdornment>,
                  },
                  htmlInput: { min: 0.01, step: '0.01' },
                }}
                fullWidth
                error={showPayRateError}
                helperText={payRateHelper}
              />
            </Fragment>
          )
        })}
      </Box>

      <Box
        sx={{
          mt: 5,
          pt: 3,
          pb: 3,
          borderTop: '1px solid',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography sx={{ ...overlineSx, mb: 3 }}>Finance Totals</Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: { xs: 3, sm: 4 },
            mb: computedBuckets.length > 0 ? 4 : 0,
          }}
        >
          {[
            {
              label: 'Money In',
              value: isPaymentReady ? formatCurrency(totals.incoming) : '-',
              color: isPaymentReady ? palette.success : 'text.primary',
            },
            {
              label: 'Money Out',
              value: isPaymentReady ? formatCurrency(totals.outgoing) : '-',
              color: isPaymentReady ? palette.error : 'text.primary',
            },
            {
              label: 'Net Margin',
              value: isPaymentReady ? formatCurrency(netMargin) : '-',
              color: isPaymentReady
                ? netMargin >= 0
                  ? palette.success
                  : palette.error
                : 'text.primary',
            },
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
                  fontSize: { xs: '1.9rem', sm: '2.2rem' },
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                  color: item.color,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {item.value}
              </Typography>
            </Box>
          ))}
        </Box>

        {computedBuckets.length > 0 && (
          <Stack
            divider={<Box sx={{ borderBottom: '1px dashed', borderColor: 'divider' }} />}
            spacing={0}
            sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}
          >
            {computedBuckets.map((item) => {
              const itemMargin = (item.billAmount ?? 0) - (item.payAmount ?? 0)

              return (
                <Box
                  key={`working-${getWorkBucketKey(item)}`}
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 1,
                    py: 1.25,
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.725rem',
                  }}
                >
                  <Typography
                    variant="inherit"
                    sx={{ fontWeight: 600, color: 'text.primary', minWidth: 120 }}
                  >
                    {getWorkBucketDisplayLabel(item.bucketLabel)}:
                  </Typography>
                  <Typography variant="inherit" sx={{ color: 'text.secondary' }}>
                    {Number(item.hours).toFixed(2)}h
                  </Typography>
                  <Typography variant="inherit" sx={{ color: 'divider' }}>
                    |
                  </Typography>
                  <Typography variant="inherit" sx={{ color: palette.success, fontWeight: 500 }}>
                    In {item.hasValidBillRate ? formatCurrency(item.billAmount ?? 0) : '-'}
                  </Typography>
                  <Typography variant="inherit" sx={{ color: 'divider' }}>
                    |
                  </Typography>
                  <Typography variant="inherit" sx={{ color: palette.error, fontWeight: 500 }}>
                    Out {item.hasValidPayRate ? formatCurrency(item.payAmount ?? 0) : '-'}
                  </Typography>
                  {item.hasValidBillRate && item.hasValidPayRate && (
                    <>
                      <Typography variant="inherit" sx={{ color: 'divider' }}>
                        |
                      </Typography>
                      <Typography
                        variant="inherit"
                        sx={{
                          fontWeight: 700,
                          color: itemMargin >= 0 ? palette.success : palette.error,
                        }}
                      >
                        Net {formatCurrency(itemMargin)}
                      </Typography>
                    </>
                  )}
                </Box>
              )
            })}
          </Stack>
        )}
      </Box>

      <Box sx={{ mt: 4 }}>
        <TextField
          label="Payment Notes"
          multiline
          minRows={3}
          fullWidth
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional notes for this payment (e.g. processing references)"
        />
      </Box>

      <StickyActionBar
        sx={{ mt: 3 }}
        secondary={
          <Stack spacing={0.75}>
            {saveState ? (
              <SaveStateBanner state={saveState.state} message={saveState.message} />
            ) : null}
            {disabledReason ? (
              <Typography variant="body2" sx={{ color: palette.textSecondary }}>
                {disabledReason}
              </Typography>
            ) : null}
          </Stack>
        }
      >
        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<PaymentIcon />}
          onClick={() => {
            void onProcessPayment(false)
          }}
          disabled={submitting || !isPaymentReady}
          fullWidth={isMobile}
        >
          Process Payment
        </Button>
        {nextId && (
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<FastForwardIcon />}
            onClick={() => {
              void onProcessPayment(true)
            }}
            disabled={submitting || !isPaymentReady}
            fullWidth={isMobile}
          >
            Process & Next
          </Button>
        )}
      </StickyActionBar>
    </Box>
  )
}
