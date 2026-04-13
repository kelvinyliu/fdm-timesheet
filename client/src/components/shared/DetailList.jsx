import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export default function DetailList({ items, labelMinWidth = 140, columnGap = 2, rowGap = 1.5 }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          sm: `${labelMinWidth}px minmax(0, 1fr)`,
        },
        columnGap,
        rowGap,
      }}
    >
      {items.flatMap(({ key, label, value }) => [
        <Typography
          key={`${key}-label`}
          variant="body2"
          color="text.secondary"
          fontWeight={500}
          sx={{ mb: { xs: -0.5, sm: 0 } }}
        >
          {label}
        </Typography>,
        <Box key={`${key}-value`} sx={{ minWidth: 0 }}>
          {typeof value === 'string' ? (
            <Typography variant="body2" fontWeight={500}>
              {value}
            </Typography>
          ) : (
            value
          )}
        </Box>,
      ])}
    </Box>
  )
}
