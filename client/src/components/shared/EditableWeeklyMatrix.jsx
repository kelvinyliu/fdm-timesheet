import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { palette } from '../../theme.js'
import { formatDayName } from '../../utils/dateFormatters'
import { getBucketValue, getMatrixRowTotal } from '../../utils/timesheetMatrix.js'

function getAssignmentOptionLabel(assignment) {
  if (!assignment) return 'Unknown client assignment'
  return assignment.archived ? `${assignment.clientName} (Archived)` : assignment.clientName
}

export default function EditableWeeklyMatrix({
  rows,
  weekDates,
  totalHours,
  availableAssignments,
  canChangeBuckets,
  isBusy,
  onAddRow,
  onRemoveRow,
  onRowCategoryChange,
  onRowHoursChange,
}) {
  return (
    <Paper sx={{ mb: 3, p: { xs: 0, sm: 0 }, overflow: 'hidden' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: palette.sidebarBg, color: palette.textInverse }}>
         <Typography variant="h6" sx={{ color: palette.textInverse }}>Weekly Matrix</Typography>
         <Typography variant="h6" sx={{ fontFamily: '"JetBrains Mono", monospace', color: palette.primary }}>
           {totalHours.toFixed(2)}h Total
         </Typography>
      </Box>
      <TableContainer sx={{ borderTop: `2px solid ${palette.borderStrong}` }}>
        <Table size="small" sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 250, borderRight: `2px solid ${palette.border}` }}>Work Category</TableCell>
              {weekDates.map((date) => (
                <TableCell key={date} align="center" sx={{ width: 80, borderRight: `2px solid ${palette.border}` }}>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: palette.textPrimary }}>
                    {formatDayName(date).slice(0, 3)}
                  </Typography>
                  <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', color: palette.textMuted }}>
                    {date.slice(5)}
                  </Typography>
                </TableCell>
              ))}
              <TableCell align="center" sx={{ width: 80, borderRight: `2px solid ${palette.border}` }}>Total</TableCell>
              <TableCell align="center" sx={{ width: 60 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 6, color: palette.textSecondary }}>
                  No rows added. Click "Add Row" below.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const rowTotal = getMatrixRowTotal(row, weekDates)
                return (
                  <TableRow key={row.id}>
                    <TableCell sx={{ borderRight: `2px solid ${palette.border}` }}>
                      <TextField
                        select
                        variant="outlined"
                        size="small"
                        value={getBucketValue(row.entryKind, row.assignmentId)}
                        onChange={(e) => onRowCategoryChange(row.id, e.target.value)}
                        disabled={isBusy || !canChangeBuckets}
                        fullWidth
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }}
                      >
                        {availableAssignments.map((assignment) => (
                          <MenuItem key={assignment.id} value={assignment.id}>
                            {getAssignmentOptionLabel(assignment)}
                          </MenuItem>
                        ))}
                        <MenuItem value="INTERNAL">Internal</MenuItem>
                      </TextField>
                    </TableCell>
                    {weekDates.map((date) => (
                      <TableCell key={date} align="center" sx={{ p: 1, borderRight: `2px solid ${palette.border}` }}>
                        <TextField
                          variant="outlined"
                          size="small"
                          type="number"
                          value={row.hours[date] ?? ''}
                          onChange={(e) => onRowHoursChange(row.id, date, e.target.value)}
                          disabled={isBusy}
                          slotProps={{ htmlInput: { min: 0, max: 24, step: '0.25', style: { textAlign: 'center', padding: '8px 4px' } } }}
                          sx={{ width: '100%', '& .MuiOutlinedInput-root': { borderRadius: 0 } }}
                        />
                      </TableCell>
                    ))}
                    <TableCell align="center" sx={{ borderRight: `2px solid ${palette.border}` }}>
                      <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}>
                        {rowTotal.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                       {canChangeBuckets && (
                       <IconButton
                          onClick={() => {
                            void onRemoveRow(row.id)
                          }}
                          disabled={isBusy}
                          color="error"
                          size="small"
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {canChangeBuckets && (
        <Box sx={{ p: 2, borderTop: `2px solid ${palette.border}` }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={onAddRow}
            disabled={isBusy}
          >
            Add Row
          </Button>
        </Box>
      )}
    </Paper>
  )
}
