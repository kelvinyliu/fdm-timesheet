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
              No client assignments found.
            </Typography>
          </Box>
        ) : (
          <Stack
            divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}
            spacing={0}
          >
            {assignments.map((assignment) => {
              const submitterLabel = getSubmitterDisplayLabel(
                userById.get(assignment.consultantId)?.name ?? null
              )

              return (
                <Box key={assignment.id} sx={{ py: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5} sx={{ mb: 1.25 }}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {submitterLabel}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {assignment.clientName}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem', fontWeight: 600 }}
                    >
                      {formatCurrency(assignment.clientBillRate)}
                    </Typography>
                  </Stack>

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem' }}
                    >
                      Created {formatDate(assignment.createdAt)}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon sx={{ fontSize: '0.9rem' }} />}
                      onClick={() => {
                        void onDeleteAssignment(
                          assignment.id,
                          `${assignment.clientName} for ${submitterLabel}`
                        )
                      }}
                    >
                      Remove
                    </Button>
                  </Stack>
                </Box>
              )
            })}
          </Stack>
        )
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
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
              No manager assignments found.
            </Typography>
          </Box>
        ) : (
          <Stack
            divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}
            spacing={0}
          >
            {assignments.map((assignment) => (
              <Box key={assignment.id} sx={{ py: 2.5 }}>
                <Stack spacing={1.25}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {assignment.managerName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      → {assignment.consultantName}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<EditIcon sx={{ fontSize: '0.9rem' }} />}
                      onClick={() => onEditAssignment(assignment)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon sx={{ fontSize: '0.9rem' }} />}
                      onClick={() => {
                        void onDeleteAssignment(
                          assignment.id,
                          `${assignment.managerName} -> ${assignment.consultantName}`
                        )
                      }}
                    >
                      Remove
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Stack>
        )
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Manager</TableCell>
                <TableCell>Employee</TableCell>
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
