import { createTheme, alpha } from '@mui/material'

const palette = {
  navy: '#1A1A2E',
  navyLight: '#252540',
  navyLighter: '#2F2F4A',
  steel: '#3D5A80',
  steelDark: '#2C4057',
  steelLight: '#5B7EA1',
  coral: '#EE6C4D',
  coralDark: '#D45A3C',
  cream: '#FAFAF7',
  warmWhite: '#FFFFFF',
  border: '#E5E2DD',
  borderLight: '#F0EDE8',
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  success: '#4A7C59',
  successBg: '#EDF5F0',
  warning: '#D4A843',
  warningBg: '#FDF6E3',
  error: '#C4453C',
  errorBg: '#FDF0EF',
  infoBg: '#EDF2F7',
}

const theme = createTheme({
  palette: {
    primary: {
      main: palette.steel,
      dark: palette.steelDark,
      light: palette.steelLight,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: palette.coral,
      dark: palette.coralDark,
      contrastText: '#FFFFFF',
    },
    success: {
      main: palette.success,
      light: palette.successBg,
    },
    warning: {
      main: palette.warning,
      light: palette.warningBg,
    },
    error: {
      main: palette.error,
      light: palette.errorBg,
    },
    background: {
      default: palette.cream,
      paper: palette.warmWhite,
    },
    text: {
      primary: palette.textPrimary,
      secondary: palette.textSecondary,
    },
    divider: palette.border,
    navy: palette.navy,
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
    '0 1px 2px rgba(26,26,46,0.04)',
    '0 1px 4px rgba(26,26,46,0.06)',
    '0 2px 8px rgba(26,26,46,0.06)',
    '0 4px 12px rgba(26,26,46,0.08)',
    '0 6px 16px rgba(26,26,46,0.08)',
    '0 8px 24px rgba(26,26,46,0.10)',
    ...Array(18).fill('0 8px 24px rgba(26,26,46,0.10)'),
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: palette.cream,
          '&::-webkit-scrollbar': {
            width: 8,
          },
          '&::-webkit-scrollbar-track': {
            background: palette.cream,
          },
          '&::-webkit-scrollbar-thumb': {
            background: palette.border,
            borderRadius: 4,
            '&:hover': {
              background: palette.textMuted,
            },
          },
        },
        '*': {
          '&::-webkit-scrollbar': {
            width: 6,
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
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(61,90,128,0.25)',
          },
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${palette.steel} 0%, ${palette.steelDark} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${palette.steelLight} 0%, ${palette.steel} 100%)`,
          },
        },
        containedSuccess: {
          background: `linear-gradient(135deg, ${palette.success} 0%, #3D6B4A 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, #5A8C69 0%, ${palette.success} 100%)`,
            boxShadow: '0 4px 12px rgba(74,124,89,0.25)',
          },
        },
        containedError: {
          background: `linear-gradient(135deg, ${palette.error} 0%, #A83832 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, #D45550 0%, ${palette.error} 100%)`,
            boxShadow: '0 4px 12px rgba(196,69,60,0.25)',
          },
        },
        outlined: {
          borderColor: palette.border,
          color: palette.textPrimary,
          '&:hover': {
            borderColor: palette.steel,
            backgroundColor: alpha(palette.steel, 0.04),
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
            backgroundColor: palette.cream,
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
              backgroundColor: alpha(palette.cream, 0.5),
            },
            '&:hover': {
              backgroundColor: alpha(palette.steel, 0.04),
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
          borderBottom: `1px solid ${palette.borderLight}`,
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
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            transition: 'box-shadow 0.2s ease',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: palette.steel,
            },
            '&.Mui-focused': {
              boxShadow: `0 0 0 3px ${alpha(palette.steel, 0.12)}`,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: palette.steel,
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
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 14,
          border: `1px solid ${palette.border}`,
          boxShadow: '0 20px 60px rgba(26,26,46,0.15)',
        },
        backdrop: {
          backgroundColor: 'rgba(26,26,46,0.4)',
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
          borderColor: alpha(palette.error, 0.2),
          color: palette.error,
        },
        standardSuccess: {
          backgroundColor: palette.successBg,
          borderColor: alpha(palette.success, 0.2),
          color: palette.success,
        },
        standardWarning: {
          backgroundColor: palette.warningBg,
          borderColor: alpha(palette.warning, 0.2),
          color: '#8B6914',
        },
        standardInfo: {
          backgroundColor: palette.infoBg,
          borderColor: alpha(palette.steel, 0.15),
          color: palette.steel,
        },
      },
    },
    MuiSnackbar: {
      styleOverrides: {
        root: {
          '& .MuiAlert-root': {
            boxShadow: '0 8px 32px rgba(26,26,46,0.12)',
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
          backgroundColor: palette.navy,
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
          boxShadow: '0 8px 24px rgba(26,26,46,0.12)',
          border: `1px solid ${palette.border}`,
        },
      },
    },
  },
})

export default theme
export { palette }
