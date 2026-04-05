import { createTheme } from '@mui/material'

const palette = {
  bg: '#f7f6f5',
  surface: '#ffffff',
  surfaceMuted: '#efecea',
  surfaceRaised: '#fcfbfa',
  textPrimary: '#1e1e1e',
  textSecondary: '#50504b',
  textMuted: '#6c6c6b',
  textInverse: '#ffffff',
  textInverseMuted: 'rgba(255,255,255,0.68)',
  border: '#d7d2cb',
  borderStrong: '#bcb4aa',
  primary: '#b2c784',
  primaryHover: '#9fb56b',
  primaryContrast: '#1e1e1e',
  focusRing: 'rgba(178,199,132,0.28)',
  selectionBg: 'rgba(178,199,132,0.22)',
  sidebarBg: '#1f2118',
  sidebarBgAlt: '#161711',
  sidebarScrim: 'rgba(255,255,255,0.06)',
  shadowSoft: '0 8px 24px rgba(30,30,30,0.08)',
  shadowStrong: '0 20px 60px rgba(30,30,30,0.16)',
  success: '#2f6b36',
  successBg: '#eef8e6',
  warning: '#8a5a00',
  warningBg: '#fff2cf',
  error: '#ff4e48',
  errorBg: '#fff0ee',
  info: '#26556f',
  infoBg: '#e9f7ff',
  overlayTextSoft: 'rgba(30,30,30,0.04)',
  overlayTextMuted: 'rgba(30,30,30,0.08)',
  overlayPrimarySoft: 'rgba(178,199,132,0.12)',
  overlayPrimaryMuted: 'rgba(178,199,132,0.18)',
  overlayWhiteSoft: 'rgba(255,255,255,0.08)',
  overlayWhiteMuted: 'rgba(255,255,255,0.14)',
}

const theme = createTheme({
  palette: {
    primary: {
      main: palette.primary,
      dark: palette.primaryHover,
      light: palette.overlayPrimaryMuted,
      contrastText: palette.primaryContrast,
    },
    secondary: {
      main: palette.surfaceMuted,
      dark: palette.borderStrong,
      contrastText: palette.textPrimary,
    },
    success: {
      main: palette.success,
      light: palette.successBg,
      contrastText: palette.textInverse,
    },
    warning: {
      main: palette.warning,
      light: palette.warningBg,
      contrastText: palette.textPrimary,
    },
    error: {
      main: palette.error,
      light: palette.errorBg,
      contrastText: palette.textInverse,
    },
    background: {
      default: palette.bg,
      paper: palette.surface,
    },
    text: {
      primary: palette.textPrimary,
      secondary: palette.textSecondary,
    },
    divider: palette.border,
    sidebar: {
      main: palette.sidebarBg,
    },
  },
  typography: {
    fontFamily: '"Outfit", system-ui, sans-serif',
    h1: {
      fontFamily: '"Instrument Serif", Georgia, serif',
      fontWeight: 400,
      fontSize: '2.5rem',
      lineHeight: 1.15,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontFamily: '"Instrument Serif", Georgia, serif',
      fontWeight: 400,
      fontSize: '2rem',
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontFamily: '"Instrument Serif", Georgia, serif',
      fontWeight: 400,
      fontSize: '1.75rem',
      lineHeight: 1.25,
    },
    h4: {
      fontFamily: '"Instrument Serif", Georgia, serif',
      fontWeight: 400,
      fontSize: '1.5rem',
      lineHeight: 1.3,
    },
    h5: {
      fontFamily: '"Instrument Serif", Georgia, serif',
      fontWeight: 400,
      fontSize: '1.35rem',
      lineHeight: 1.35,
    },
    h6: {
      fontFamily: '"Outfit", system-ui, sans-serif',
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.4,
      letterSpacing: '0.02em',
      textTransform: 'uppercase',
    },
    subtitle1: {
      fontWeight: 500,
      fontSize: '0.95rem',
    },
    subtitle2: {
      fontWeight: 500,
      fontSize: '0.825rem',
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
    },
    body1: {
      fontSize: '0.925rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.85rem',
      lineHeight: 1.55,
    },
    caption: {
      fontSize: '0.75rem',
      color: palette.textMuted,
    },
    button: {
      fontWeight: 600,
      fontSize: '0.825rem',
      letterSpacing: '0.03em',
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0 1px 2px rgba(30,30,30,0.04)',
    '0 1px 4px rgba(30,30,30,0.05)',
    '0 2px 8px rgba(30,30,30,0.06)',
    '0 4px 12px rgba(30,30,30,0.08)',
    '0 6px 16px rgba(30,30,30,0.09)',
    '0 8px 24px rgba(30,30,30,0.1)',
    ...Array(18).fill('0 8px 24px rgba(30,30,30,0.1)'),
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ':root': {
          colorScheme: 'light',
        },
        '::selection': {
          backgroundColor: palette.selectionBg,
          color: palette.textPrimary,
        },
        body: {
          backgroundColor: palette.bg,
          color: palette.textPrimary,
          '&::-webkit-scrollbar': {
            width: 8,
          },
          '&::-webkit-scrollbar-track': {
            background: palette.bg,
          },
          '&::-webkit-scrollbar-thumb': {
            background: palette.borderStrong,
            borderRadius: 4,
            '&:hover': {
              background: palette.textMuted,
            },
          },
        },
        '*': {
          '&::-webkit-scrollbar': {
            width: 6,
            height: 6,
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: palette.border,
            borderRadius: 3,
          },
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 20px',
          transition: 'all 0.2s ease',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: palette.shadowSoft,
          },
        },
        containedPrimary: {
          background: palette.primary,
          color: palette.primaryContrast,
          '&:hover': {
            background: palette.primaryHover,
          },
        },
        containedSuccess: {
          background: palette.success,
          color: palette.textInverse,
          '&:hover': {
            background: '#25562b',
          },
        },
        containedError: {
          background: palette.error,
          color: palette.textInverse,
          '&:hover': {
            background: '#d7433c',
          },
        },
        outlined: {
          borderColor: palette.borderStrong,
          color: palette.textPrimary,
          backgroundColor: 'transparent',
          '&:hover': {
            borderColor: palette.textPrimary,
            backgroundColor: palette.overlayTextSoft,
          },
        },
        sizeSmall: {
          padding: '5px 14px',
          fontSize: '0.775rem',
        },
        sizeLarge: {
          padding: '12px 28px',
          fontSize: '0.9rem',
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          border: `1px solid ${palette.border}`,
          borderRadius: 10,
          backgroundColor: palette.surface,
          backgroundImage: 'none',
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          border: `1px solid ${palette.border}`,
          borderRadius: 12,
          backgroundColor: palette.surface,
          backgroundImage: 'none',
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          border: `1px solid ${palette.border}`,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: palette.surfaceMuted,
            fontFamily: '"Outfit", system-ui, sans-serif',
            fontWeight: 600,
            fontSize: '0.7rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: palette.textSecondary,
            borderBottom: `2px solid ${palette.border}`,
            padding: '14px 16px',
          },
        },
      },
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          '& .MuiTableRow-root': {
            transition: 'background-color 0.15s ease',
            '&:nth-of-type(even)': {
              backgroundColor: palette.surfaceRaised,
            },
            '&:hover': {
              backgroundColor: palette.overlayPrimarySoft,
            },
            '&:last-child td': {
              borderBottom: 'none',
            },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${palette.border}`,
          padding: '12px 16px',
          fontSize: '0.85rem',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          '& .MuiInputLabel-root': {
            color: palette.textSecondary,
            '&.Mui-focused': {
              color: palette.textPrimary,
            },
          },
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: palette.surface,
            transition: 'box-shadow 0.2s ease',
            '& fieldset': {
              borderColor: palette.borderStrong,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: palette.textPrimary,
            },
            '&.Mui-focused': {
              boxShadow: `0 0 0 3px ${palette.focusRing}`,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: palette.primary,
              borderWidth: 1.5,
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: palette.surface,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 14,
          border: `1px solid ${palette.border}`,
          boxShadow: palette.shadowStrong,
          backgroundColor: palette.surface,
        },
        backdrop: {
          backgroundColor: 'rgba(30,30,30,0.4)',
          backdropFilter: 'blur(4px)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily: '"Instrument Serif", Georgia, serif',
          fontSize: '1.4rem',
          fontWeight: 400,
          padding: '24px 24px 8px',
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '16px 24px',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '12px 24px 20px',
          gap: 8,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          border: '1px solid',
          fontSize: '0.85rem',
        },
        standardError: {
          backgroundColor: palette.errorBg,
          borderColor: 'var(--ui-status-rejected-border)',
          color: palette.error,
        },
        standardSuccess: {
          backgroundColor: palette.successBg,
          borderColor: 'var(--ui-status-approved-border)',
          color: palette.success,
        },
        standardWarning: {
          backgroundColor: palette.warningBg,
          borderColor: 'var(--ui-status-pending-border)',
          color: palette.warning,
        },
        standardInfo: {
          backgroundColor: palette.infoBg,
          borderColor: 'var(--ui-status-completed-border)',
          color: palette.info,
        },
      },
    },
    MuiSnackbar: {
      styleOverrides: {
        root: {
          '& .MuiAlert-root': {
            boxShadow: palette.shadowSoft,
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: palette.border,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: palette.sidebarBg,
          color: palette.textInverse,
          fontSize: '0.75rem',
          borderRadius: 6,
          padding: '6px 12px',
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          border: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 600,
          fontSize: '0.7rem',
          letterSpacing: '0.04em',
          height: 26,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: 'all 0.15s ease',
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          borderRadius: 10,
          boxShadow: palette.shadowSoft,
          border: `1px solid ${palette.border}`,
        },
      },
    },
  },
})

export default theme
export { palette }
