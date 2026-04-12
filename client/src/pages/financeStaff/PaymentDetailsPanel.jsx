import { Fragment } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import InputAdornment from '@mui/material/InputAdornment'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import FastForwardIcon from '@mui/icons-material/FastForward'
import PaymentIcon from '@mui/icons-material/Payment'
import { palette } from '../../theme.js'
import { getWorkBucketDisplayLabel } from '../../utils/displayLabels.js'
import { getWorkBucketKey } from '../../utils/timesheetMatrix.js'

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
}) {
  return (
    <Paper sx={{ p: { xs: 2.5, sm: 3 }, backgroundColor: palette.surfaceRaised }}>
      <Typography variant="h6" gutterBottom>
        Payment Details
      </Typography>
      <Alert severity="info" sx={{ mb: 4 }}>
        Rates are pre-filled from client assignments and submitter defaults.
        Overrides only affect this payment processing.
      </Alert>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: '1fr 160px 160px',
          },
          columnGap: 2,
          rowGap: { xs: 4, sm: 3 },
          alignItems: 'start',
        }}
      >
        {!isMobile && (
          <>
            <Typography variant="caption" fontWeight={700} sx={{ color: palette.textPrimary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Work Category
            </Typography>
            <Typography variant="caption" fontWeight={700} sx={{ color: palette.textPrimary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Client Bill Rate
            </Typography>
            <Typography variant="caption" fontWeight={700} sx={{ color: palette.textPrimary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Submitter Pay Rate
            </Typography>
            <Box sx={{ gridColumn: '1 / -1', mt: -1 }}>
              <Divider />
            </Box>
          </>
        )}

        {computedBuckets.map((item) => {
          const bucketKey = getWorkBucketKey(item)

          return (
            <Fragment key={bucketKey}>
              <Box sx={{ pt: { sm: 1 } }}>
                <Typography variant="body2" fontWeight={700}>
                  {getWorkBucketDisplayLabel(item.bucketLabel)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {item.totalHours} hours recorded
                </Typography>
              </Box>

              <TextField
                label={isMobile ? 'Client Bill Rate (£/hr)' : ''}
                type="number"
                size="small"
                required={item.entryKind === 'CLIENT'}
                value={bucketRates[bucketKey]?.billRate ?? ''}
                onChange={(event) => setBucketRates((prev) => ({
                  ...prev,
                  [bucketKey]: {
                    ...(prev[bucketKey] ?? {}),
                    billRate: event.target.value,
                  },
                }))}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">£</InputAdornment>,
                    readOnly: item.entryKind === 'INTERNAL',
                  },
                  htmlInput: { min: 0, step: '0.01' },
                }}
                disabled={item.entryKind === 'INTERNAL'}
                fullWidth
              />

              <TextField
                label={isMobile ? 'Submitter Pay Rate (£/hr)' : ''}
                type="number"
                size="small"
                required
                value={bucketRates[bucketKey]?.payRate ?? ''}
                onChange={(event) => setBucketRates((prev) => ({
                  ...prev,
                  [bucketKey]: {
                    ...(prev[bucketKey] ?? {}),
                    payRate: event.target.value,
                  },
                }))}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">£</InputAdornment>,
                  },
                  htmlInput: { min: 0.01, step: '0.01' },
                }}
                fullWidth
              />
            </Fragment>
          )
        })}
      </Box>

      <Box
        sx={{
          p: 3,
          mt: 5,
          borderTop: `4px solid ${palette.textPrimary}`,
          borderBottom: `4px solid ${palette.textPrimary}`,
          backgroundColor: palette.surface,
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Finance Totals
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 3,
            mb: computedBuckets.length > 0 ? 4 : 0,
          }}
        >
          <Box>
            <Typography variant="caption" sx={{ color: palette.textMuted, display: 'block', mb: 0.5, fontWeight: 700 }}>
              MONEY IN
            </Typography>
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '1.8rem',
                fontWeight: 800,
                color: isPaymentReady ? palette.success : palette.textPrimary,
                lineHeight: 1,
              }}
            >
              {isPaymentReady ? formatCurrency(totals.incoming) : '-'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: palette.textMuted, display: 'block', mb: 0.5, fontWeight: 700 }}>
              MONEY OUT
            </Typography>
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '1.8rem',
                fontWeight: 800,
                color: isPaymentReady ? palette.error : palette.textPrimary,
                lineHeight: 1,
              }}
            >
              {isPaymentReady ? formatCurrency(totals.outgoing) : '-'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: palette.textMuted, display: 'block', mb: 0.5, fontWeight: 700 }}>
              NET MARGIN
            </Typography>
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '1.8rem',
                fontWeight: 800,
                color: isPaymentReady
                  ? netMargin >= 0
                    ? palette.success
                    : palette.error
                  : palette.textPrimary,
                lineHeight: 1,
              }}
            >
              {isPaymentReady ? formatCurrency(netMargin) : '-'}
            </Typography>
          </Box>
        </Box>

        {computedBuckets.length > 0 && (
          <Stack spacing={1} sx={{ pt: 2, borderTop: `2px solid ${palette.border}` }}>
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
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.725rem',
                  }}
                >
                  <Typography variant="inherit" sx={{ fontWeight: 600, color: palette.textSecondary, minWidth: 120 }}>
                    {getWorkBucketDisplayLabel(item.bucketLabel)}:
                  </Typography>
                  <Typography variant="inherit" sx={{ color: palette.textMuted }}>
                    {item.hours}h
                  </Typography>
                  <Typography variant="inherit" sx={{ color: palette.border }}>|</Typography>
                  <Typography variant="inherit" sx={{ color: palette.success, fontWeight: 500 }}>
                    In {item.hasValidBillRate ? formatCurrency(item.billAmount ?? 0) : '-'}
                  </Typography>
                  <Typography variant="inherit" sx={{ color: palette.border }}>|</Typography>
                  <Typography variant="inherit" sx={{ color: palette.error, fontWeight: 500 }}>
                    Out {item.hasValidPayRate ? formatCurrency(item.payAmount ?? 0) : '-'}
                  </Typography>
                  {item.hasValidBillRate && item.hasValidPayRate && (
                    <>
                      <Typography variant="inherit" sx={{ color: palette.border }}>|</Typography>
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

      <Box sx={{ mt: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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
        </Stack>
      </Box>
    </Paper>
  )
}
