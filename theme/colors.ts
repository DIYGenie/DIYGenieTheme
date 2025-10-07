export const brand = {
  primary: '#7C4DFF',      // main DIY Genie purple
  primary600: '#6A3CE9',
  primary700: '#5B2ED1',
  primary300: '#B39DFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F6F6FA',
  text: '#101828',
  textMuted: '#667085',
  success: '#12B76A',
  danger:  '#EF4444',
  border:  '#E5E7EB',
};

export const colors = {
  // Gradient colors for background only (unchanged from Welcome)
  gradientStart: '#C4B5FD', // Light Lavender
  gradientEnd: '#93C5FD',   // Soft Sky Blue
  
  // High-contrast UI surfaces
  bg: '#F1F5F9',        // slate-50 - page background under gradient fade
  surface: '#FFFFFF',    // white cards/sheets
  
  // Text colors
  textPrimary: '#0F172A',   // slate-900 - main headings/content
  textSecondary: '#475569', // slate-600 - secondary text
  
  // Interactive colors
  accent: brand.primary,     // Updated to purple
  accentPressed: brand.primary600, // Updated to purple pressed
  brandPurpleDeep: '#5B21B6', // purple-800 - nav bars/background accents
  purpleLight: '#C4B5FD',     // purple-300 - inactive tab/icon tint
  
  // UI elements
  muted: '#E5E7EB',      // gray-200 - skeletons/dividers
  
  // Legacy colors for Welcome screen (keep unchanged)
  white: '#FFFFFF',
  black: '#000000',
  ctaOrange: '#F59E0B',
  ctaOrangePressed: '#EA580C',
  
  // Tab bar colors (updated for new design)
  tabActive: '#0F172A',
  tabInactive: '#64748B',
  tabBackground: 'rgba(255, 255, 255, 0.95)',
};