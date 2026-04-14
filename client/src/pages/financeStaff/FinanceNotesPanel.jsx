import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { formatTimestamp } from '../../utils/dateFormatters.js'

export default function FinanceNotesPanel({ notes }) {
  if (notes.length === 0) return null

  return (
    <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
      <Typography
        sx={{
          fontFamily: '"Outfit", system-ui, sans-serif',
          fontSize: '0.72rem',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          color: 'text.secondary',
          mb: 2,
        }}
      >
        Finance Notes
      </Typography>
      <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />} spacing={0}>
        {notes.map((note) => (
          <Box key={note.id} sx={{ py: 2 }}>
            <Typography variant="body2" sx={{ mb: 0.75 }}>
              {note.note}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.65rem',
                color: 'text.secondary',
                display: 'block',
              }}
            >
              {note.authoredByName ?? 'Finance'} - {formatTimestamp(note.createdAt)}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  )
}
