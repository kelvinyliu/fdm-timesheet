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
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import SaveIcon from '@mui/icons-material/Save'
import DeleteIcon from '@mui/icons-material/Delete'

export default function UserList({
  users,
  pendingRoles,
  roles,
  getRoleLabel,
  isMobile,
  emptyMessage,
  onRoleChange,
  onSaveRole,
  onDeleteUser,
}) {
  if (isMobile) {
    if (users.length === 0) {
      return (
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
      )
    }

    return (
      <Stack
        divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}
        spacing={0}
      >
        {users.map((user) => {
          const currentRole = pendingRoles[user.id] ?? user.role
          const isDirty = pendingRoles[user.id] !== undefined && pendingRoles[user.id] !== user.role

          return (
            <Box key={user.id} sx={{ py: 2.5 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                    {user.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user.email}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    sx={{
                      display: 'block',
                      mb: 0.75,
                      fontSize: '0.68rem',
                      fontWeight: 500,
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.18em',
                    }}
                  >
                    Role
                  </Typography>
                  <Select
                    size="small"
                    fullWidth
                    value={currentRole}
                    onChange={(e) => onRoleChange(user.id, e.target.value)}
                  >
                    {roles.map((role) => (
                      <MenuItem key={role} value={role}>
                        {getRoleLabel(role)}
                      </MenuItem>
                    ))}
                  </Select>
                </Box>

                <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => {
                      void onDeleteUser(user.id, user.name)
                    }}
                  >
                    Delete
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    disabled={!isDirty}
                    onClick={() => {
                      void onSaveRole(user.id)
                    }}
                  >
                    Save Role
                  </Button>
                </Stack>
              </Stack>
            </Box>
          )
        })}
      </Stack>
    )
  }

  return (
    <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Role</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => {
            const currentRole = pendingRoles[user.id] ?? user.role
            const isDirty =
              pendingRoles[user.id] !== undefined && pendingRoles[user.id] !== user.role

            return (
              <TableRow key={user.id}>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {user.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {user.email}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Select
                      size="small"
                      value={currentRole}
                      onChange={(e) => onRoleChange(user.id, e.target.value)}
                      sx={{ minWidth: 180, fontSize: '0.85rem' }}
                    >
                      {roles.map((role) => (
                        <MenuItem key={role} value={role}>
                          {getRoleLabel(role)}
                        </MenuItem>
                      ))}
                    </Select>

                    <Tooltip title="Save role">
                      <span>
                        <IconButton
                          size="small"
                          color="primary"
                          disabled={!isDirty}
                          onClick={() => {
                            void onSaveRole(user.id)
                          }}
                        >
                          <SaveIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Delete user">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        void onDeleteUser(user.id, user.name)
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            )
          })}

          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
