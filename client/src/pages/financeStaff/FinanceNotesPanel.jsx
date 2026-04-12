import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { palette } from '../../theme.js'
import { formatTimestamp } from '../../utils/dateFormatters.js'

export default function FinanceNotesPanel({ notes }) {
  if (notes.length === 0) return null

  return (
    <Paper sx={{ p: 3, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Finance Notes
      </Typography>
      <Stack spacing={2}>
        {notes.map((note) => (
          <Box
            key={note.id}
            sx={{
              p: 2,
              borderRadius: 0,
              backgroundColor: palette.surfaceMuted,
              border: `2px solid ${palette.border}`,
            }}
          >
            <Typography variant="body2">{note.note}</Typography>
            <Typography
              variant="caption"
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.65rem',
                mt: 0.5,
                display: 'block',
              }}
            >
              {note.authoredByName ?? 'Finance'} - {formatTimestamp(note.createdAt)}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Paper>
  )
}
