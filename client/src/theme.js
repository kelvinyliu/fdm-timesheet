import { createTheme } from '@mui/material'

const palette = {
  bg: '#fcfbf9',
  surface: '#ffffff',
  surfaceMuted: '#f5f4f1',
  surfaceRaised: '#ffffff',
  textPrimary: '#2a2a28',
  textSecondary: '#6c6c6b',
  textMuted: '#a1a1a0',
  textInverse: '#ffffff',
  textInverseMuted: 'rgba(255,255,255,0.7)',
  border: '#e6e4e0',
  borderStrong: '#d1cfcb',
  primary: '#b2c784',
  primaryHover: '#9fb56b',
  primaryContrast: '#2a2a28',
  focusRing: 'rgba(178,199,132,0.4)',
  selectionBg: 'rgba(178,199,132,0.25)',
  sidebarBg: '#1f2118',
  sidebarBgAlt: '#161711',
  sidebarScrim: 'rgba(255,255,255,0.06)',
  shadowSoft: '0 4px 12px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)',
  shadowStrong: '0 12px 32px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.03)',
  success: '#2f6b36',
  successBg: '#f3faf0',
  warning: '#8a5a00',
  warningBg: '#fff8e6',
  error: '#e55c58',
  errorBg: '#fff5f4',
  info: '#26556f',
  infoBg: '#f0f8fc',
  overlayTextSoft: 'rgba(42,42,40,0.03)',
  overlayTextMuted: 'rgba(42,42,40,0.06)',
  overlayPrimarySoft: 'rgba(178,199,132,0.1)',
  overlayPrimaryMuted: 'rgba(178,199,132,0.15)',
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
      fontFamily: '"Outfit", system-ui, sans-serif',
      fontWeight: 500,
      fontSize: '1.35rem',
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h5: {
      fontFamily: '"Outfit", system-ui, sans-serif',
      fontWeight: 500,
      fontSize: '1.15rem',
      lineHeight: 1.35,
    },
    h6: {
      fontFamily: '"Outfit", system-ui, sans-serif',
      fontWeight: 500,
      fontSize: '1rem',
      lineHeight: 1.4,
    },
    subtitle1: {
      fontWeight: 500,
      fontSize: '0.95rem',
    },
    subtitle2: {
      fontWeight: 500,
      fontSize: '0.825rem',
      letterSpacing: '0.02em',
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
      fontWeight: 500,
      fontSize: '0.85rem',
      letterSpacing: '0.02em',
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    palette.shadowSoft,
    palette.shadowSoft,
    palette.shadowSoft,
    palette.shadowStrong,
    palette.shadowStrong,
    palette.shadowStrong,
    ...Array(18).fill(palette.shadowStrong),
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
            border: `2px solid ${palette.bg}`,
            '&:hover': {
              background: palette.textMuted,
            },
          },
        },
        '*': {
          '&::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: palette.border,
            borderRadius: 4,
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
          border: '1px solid transparent',
          transition: 'all 0.2s ease',
          backgroundColor: palette.surface,
          color: palette.textPrimary,
          boxShadow: palette.shadowSoft,
          '&:hover': {
            boxShadow: palette.shadowStrong,
            backgroundColor: palette.surfaceRaised,
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
            boxShadow: 'none',
          },
          '&.Mui-disabled': {
            boxShadow: 'none',
            transform: 'none',
            backgroundColor: palette.surfaceMuted,
            color: palette.textMuted,
          }
        },
        contained: {
          boxShadow: palette.shadowSoft,
        },
        containedPrimary: {
          backgroundColor: palette.primary,
          color: palette.primaryContrast,
          '&:hover': {
            backgroundColor: palette.primaryHover,
          },
        },
        containedSuccess: {
          backgroundColor: palette.success,
          color: palette.textInverse,
          '&:hover': {
            backgroundColor: '#25562b',
          },
        },
        containedError: {
          backgroundColor: palette.error,
          color: palette.textInverse,
          '&:hover': {
            backgroundColor: '#d7433c',
          },
        },
        outlined: {
          backgroundColor: 'transparent',
          border: `1px solid ${palette.borderStrong}`,
          boxShadow: 'none',
          '&:hover': {
            backgroundColor: palette.overlayTextSoft,
            border: `1px solid ${palette.textPrimary}`,
            boxShadow: 'none',
          },
        },
        sizeSmall: {
          padding: '6px 14px',
          fontSize: '0.8rem',
        },
        sizeLarge: {
          padding: '10px 24px',
          fontSize: '0.95rem',
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
          borderRadius: 12,
          backgroundColor: palette.surface,
          backgroundImage: 'none',
          boxShadow: palette.shadowSoft,
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
          boxShadow: palette.shadowSoft,
          overflow: 'hidden',
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${palette.border}`,
          boxShadow: palette.shadowSoft,
          overflow: 'hidden',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: palette.surfaceMuted,
            fontFamily: '"Outfit", system-ui, sans-serif',
            fontWeight: 500,
            fontSize: '0.8rem',
            letterSpacing: '0.02em',
            color: palette.textSecondary,
            borderBottom: `1px solid ${palette.border}`,
            padding: '16px 20px',
          },
        },
      },
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          '& .MuiTableRow-root': {
            transition: 'background-color 0.15s ease',
            '&:hover': {
              backgroundColor: palette.overlayTextSoft,
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
          padding: '14px 20px',
          fontSize: '0.9rem',
          color: palette.textPrimary,
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
            fontWeight: 400,
            fontFamily: '"Outfit", system-ui, sans-serif',
            fontSize: '0.9rem',
            '&.Mui-focused': {
              color: palette.textPrimary,
            },
          },
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: palette.surface,
            transition: 'all 0.2s ease',
            fontFamily: '"Outfit", system-ui, sans-serif',
            '& fieldset': {
              border: `1px solid ${palette.borderStrong}`,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: palette.textMuted,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#c5ff00',
              borderWidth: 2,
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
          fontFamily: '"Outfit", system-ui, sans-serif',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          border: `1px solid ${palette.border}`,
          boxShadow: palette.shadowStrong,
          backgroundColor: palette.surface,
        },
        backdrop: {
          backgroundColor: 'rgba(252, 251, 249, 0.8)',
          backdropFilter: 'blur(4px)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily: '"Instrument Serif", Georgia, serif',
          fontSize: '2rem',
          fontWeight: 400,
          padding: '24px 32px 16px',
          color: palette.textPrimary,
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '16px 32px',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '20px 32px 24px',
          gap: 12,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: '1px solid transparent',
          fontSize: '0.9rem',
          fontFamily: '"Outfit", system-ui, sans-serif',
          boxShadow: palette.shadowSoft,
        },
        standardError: {
          backgroundColor: palette.errorBg,
          borderColor: 'rgba(229, 92, 88, 0.2)',
          color: palette.error,
        },
        standardSuccess: {
          backgroundColor: palette.successBg,
          borderColor: 'rgba(47, 107, 54, 0.2)',
          color: palette.success,
        },
        standardWarning: {
          backgroundColor: palette.warningBg,
          borderColor: 'rgba(138, 90, 0, 0.2)',
          color: palette.warning,
        },
        standardInfo: {
          backgroundColor: palette.infoBg,
          borderColor: 'rgba(38, 85, 111, 0.2)',
          color: palette.info,
        },
      },
    },
    MuiSnackbar: {
      styleOverrides: {
        root: {
          '& .MuiAlert-root': {
            boxShadow: palette.shadowStrong,
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: palette.border,
          borderBottomWidth: 1,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: palette.textPrimary,
          color: palette.textInverse,
          fontSize: '0.75rem',
          borderRadius: 6,
          padding: '8px 12px',
          fontFamily: '"Outfit", system-ui, sans-serif',
          boxShadow: palette.shadowSoft,
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundColor: palette.surface,
          borderBottom: `1px solid ${palette.border}`,
          color: palette.textPrimary,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${palette.border}`,
          backgroundColor: palette.sidebarBg,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          fontWeight: 500,
          fontSize: '0.8rem',
          height: 28,
          fontFamily: '"Outfit", system-ui, sans-serif',
          border: `1px solid ${palette.borderStrong}`,
          backgroundColor: palette.surface,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: palette.overlayTextSoft,
          },
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          borderRadius: 8,
          boxShadow: palette.shadowStrong,
          border: `1px solid ${palette.borderStrong}`,
          marginTop: 8,
        },
      },
    },
  },
})

export default theme
export { palette }
