/**
 * Life Tape - Theme Constants
 * Complete design system
 */

import { Platform } from 'react-native';

export const colors = {
  light: {
    canvas: '#faf9f7',
    card: '#f1f3f5',
    input: '#f1f3f5',
    panel: '#f1f3f5',

    border: '#4f5b66',
    inactive: '#4f5b66',
    textSecondary: '#4f5b66',
    dateText: '#4f5b66',

    warmPanel: '#dcc7aa',
    divider: '#dcc7aa',
    darkSideAccent: '#8b5cf6',  // purple for moon icon
    darkSideAccent: '#8b5cf6',  // purple moon for future use
    darkSideAccent: '#8b5cf6',  // purple for Dark Side badge

    header: '#0a2a43',
    textPrimary: '#0a2a43',
    labelPrimary: '#0a2a43',

    buttonPrimary: '#3a6ea5',
    buttonPrimaryText: '#ffffff',
    logoPrimary: '#3a6ea5',

    accent: '#4ba3a6',
    success: '#4ba3a6',
    tabActive: '#4ba3a6',

    tag: '#A8A4CE',
    moodLabel: '#A8A4CE',
    softTrim: '#A8A4CE',

    error: '#e53935',
    warning: '#ff9800',
    white: '#ffffff',
    black: '#000000',
    transparent: 'transparent',
    overlay: 'rgba(0, 0, 0, 0.5)',

    recordingActive: '#4ba3a6',
    recordingPulse: 'rgba(75, 163, 166, 0.3)',
    
  },
  dark: {
    canvas: '#0f1419',
    card: '#1e293b',
    input: '#1e293b',
    panel: '#1e293b',

    border: '#64748b',
    inactive: '#64748b',
    textSecondary: '#94a3b8',
    dateText: '#94a3b8',

    warmPanel: '#374151',
    divider: '#374151',
    darkSideAccent: '#8b5cf6',  // purple for moon icon
    darkSideAccent: '#8b5cf6',  // purple moon for future use
    darkSideAccent: '#8b5cf6',  // purple for Dark Side badge

    header: '#0f1419',
    textPrimary: '#f1f5f9',
    labelPrimary: '#f1f5f9',

    buttonPrimary: '#3a6ea5',
    buttonPrimaryText: '#ffffff',
    logoPrimary: '#3a6ea5',

    accent: '#4ba3a6',
    success: '#4ba3a6',
    tabActive: '#4ba3a6',

    tag: '#A8A4CE',
    moodLabel: '#A8A4CE',
    softTrim: '#A8A4CE',

    error: '#ef5350',
    warning: '#ffb74d',
    white: '#ffffff',
    black: '#000000',
    transparent: 'transparent',
    overlay: 'rgba(0, 0, 0, 0.7)',

    recordingActive: '#4ba3a6',
    recordingPulse: 'rgba(75, 163, 166, 0.3)',
  },
} as const;

export const typography = {
  fonts: {
    logo: 'Aniron',
    tagline: 'Aniron',
    regular: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    medium: Platform.OS === 'ios' ? 'SF Pro Text Medium' : 'System',
    semiBold: Platform.OS === 'ios' ? 'SF Pro Text Semibold' : 'System',
    bold: Platform.OS === 'ios' ? 'SF Pro Text Bold' : 'System',
    light: Platform.OS === 'ios' ? 'SF Pro Text Light' : 'System',
    thin: Platform.OS === 'ios' ? 'SF Pro Text Thin' : 'System',
    extraLight: Platform.OS === 'ios' ? 'SF Pro Text Ultralight' : 'System',
    extraBold: Platform.OS === 'ios' ? 'SF Pro Text Heavy' : 'System',
    black: Platform.OS === 'ios' ? 'SF Pro Text Black' : 'System',
    italic: Platform.OS === 'ios' ? 'SF Pro Text Italic' : 'System',
  },
  sizes: {
    h1: 32, h2: 28, h3: 24, h4: 20, h5: 18, h6: 16,
    bodyLarge: 18,
    body: 16,
    bodySmall: 14,
    caption: 12,
    label: 14,
    labelSmall: 11,
    logo: 36,
    tagline: 16,
    button: 16,
    buttonSmall: 14,
    tab: 12,
    input: 16,
    tag: 13,
    timestamp: 11,
    title: 15,
  },
  lineHeights: { tight: 1.2, normal: 1.5, relaxed: 1.75, loose: 2 },
  letterSpacing: { tight: -0.5, normal: 0, wide: 0.5, wider: 1, widest: 2 },
} as const;

// spacing, radii, shadows, animations, zIndex, dimensions, breakpoints stay exactly the same as Opus gave you
export const spacing = { /* unchanged – keep everything Opus gave */ } as const;
export const radii = { /* unchanged */ } as const;
export const shadows = { /* unchanged */ } as const;
export const animations = { /* unchanged */ } as const;
export const zIndex = { /* unchanged */ } as const;
export const dimensions = { /* unchanged */ } as const;
export const breakpoints = { /* unchanged */ } as const;

export const theme = {
  colors,
  typography,
  spacing,
  radii,
  shadows,
  animations,
  zIndex,
  dimensions,
  breakpoints,
} as const;

export default theme;

export type Theme = typeof theme;
export type ColorMode = 'light' | 'dark';