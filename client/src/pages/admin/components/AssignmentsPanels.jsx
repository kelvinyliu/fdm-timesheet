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
import IconButton from '@mui/material/IconButton'
import Alert from '@mui/material/Alert'
import Tooltip from '@mui/material/Tooltip'
import Stack from '@mui/material/Stack'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import { getSubmitterDisplayLabel } from '../../../utils/displayLabels'
import { formatDate } from '../../../utils/dateFormatters'
import { formatCurrency } from '../../../utils/currency'

export function ClientAssignmentsPanel({
  assignments,
  isMobile,
  userById,
  error,
  onDismissError,
  onDeleteAssignment,
}) {
  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={onDismissError}>
          {error}
        </Alert>
      )}

      {isMobile ? (
        assignments.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderStyle: 'dashed' }}>
            <Typography variant="body2" color="text.secondary">
              No client assignments found.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {assignments.map((assignment) => {
              const submitterLabel = getSubmitterDisplayLabel(
                userById.get(assignment.consultantId)?.name ?? null
              )

              return (
                <Paper key={assignment.id} sx={{ p: 2.5 }}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                        Submitter
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {submitterLabel}
                      </Typography>
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
                          Client
                        </Typography>
                        <Typography variant="body2">{assignment.clientName}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                          Client Bill Rate
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem' }}
                        >
                          {formatCurrency(assignment.clientBillRate)}
                        </Typography>
                      </Box>
                    </Box>

                    <Box>
                      <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                        Created
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem' }}
                      >
                        {formatDate(assignment.createdAt)}
                      </Typography>
                    </Box>

                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => {
                        void onDeleteAssignment(
                          assignment.id,
                          `${assignment.clientName} for ${submitterLabel}`
                        )
                      }}
                    >
                      Remove Assignment
                    </Button>
                  </Stack>
                </Paper>
              )
            })}
          </Stack>
        )
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Submitter</TableCell>
                <TableCell>Client Name</TableCell>
                <TableCell>Client Bill Rate</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignments.map((assignment) => {
                const submitterLabel = getSubmitterDisplayLabel(
                  userById.get(assignment.consultantId)?.name ?? null
                )

                return (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {submitterLabel}
                      </Typography>
                    </TableCell>
                    <TableCell>{assignment.clientName}</TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem' }}
                      >
                        {formatCurrency(assignment.clientBillRate)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem' }}
                      >
                        {formatDate(assignment.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Remove assignment">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            void onDeleteAssignment(
                              assignment.id,
                              `${assignment.clientName} for ${submitterLabel}`
                            )
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
              {assignments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No client assignments found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}

export function ManagerAssignmentsPanel({
  assignments,
  isMobile,
  error,
  onDismissError,
  onEditAssignment,
  onDeleteAssignment,
}) {
  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={onDismissError}>
          {error}
        </Alert>
      )}

      {isMobile ? (
        assignments.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderStyle: 'dashed' }}>
            <Typography variant="body2" color="text.secondary">
              No manager assignments found.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {assignments.map((assignment) => (
              <Paper key={assignment.id} sx={{ p: 2.5 }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                      Manager
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {assignment.managerName}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                      Submitter
                    </Typography>
                    <Typography variant="body2">{assignment.consultantName}</Typography>
                  </Box>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Button
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => onEditAssignment(assignment)}
                      fullWidth
                    >
                      Edit Assignment
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => {
                        void onDeleteAssignment(
                          assignment.id,
                          `${assignment.managerName} -> ${assignment.consultantName}`
                        )
                      }}
                      fullWidth
                    >
                      Remove Assignment
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Manager</TableCell>
                <TableCell>Submitter</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {assignment.managerName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {assignment.consultantName}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Edit assignment">
                        <IconButton size="small" onClick={() => onEditAssignment(assignment)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remove assignment">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            void onDeleteAssignment(
                              assignment.id,
                              `${assignment.managerName} -> ${assignment.consultantName}`
                            )
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {assignments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No manager assignments found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}
