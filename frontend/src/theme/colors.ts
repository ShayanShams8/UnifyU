// Design system extracted from the reference HTML files (blogs_feed_vibrant.html, uniai_chat_vibrant.html)
export const colors = {
  primary: "#2563eb",
  primaryDim: "#1d4ed8",
  primaryContainer: "#dbeafe",
  primaryFixed: "#dbeafe",

  secondary: "#475569",
  secondaryContainer: "#d0e9d3",

  tertiary: "#4f46e5",
  tertiaryContainer: "#e0e7ff",

  // Coral accent (from UniAI screen)
  coral: "#fb7185",

  // Surfaces
  surface: "#ffffff",
  surfaceBright: "#ffffff",
  surfaceContainer: "#f1f5f9",
  surfaceContainerLow: "#f8fafc",
  surfaceContainerHigh: "#e2e8f0",
  surfaceContainerHighest: "#cbd5e1",
  surfaceDim: "#f0ede9",

  background: "#f8fafc",

  // Text
  onSurface: "#0f172a",
  onSurfaceVariant: "#475569",
  onBackground: "#0f172a",
  onPrimary: "#ffffff",
  onSecondary: "#e8ffea",

  // Error
  error: "#dc2626",
  errorContainer: "#fee2e2",
  onError: "#ffffff",

  // Outline
  outline: "#71787e",
  outlineVariant: "#d2d5d8",

  // Inverse
  inverseSurface: "#1e293b",
  inverseOnSurface: "#f1f5f9",
  inversePrimary: "#93c5fd",

  // Status
  white: "#ffffff",
  black: "#000000",
  transparent: "transparent",
};

export const typography = {
  fontFamily: "Manrope_400Regular",
  fontFamilyMedium: "Manrope_500Medium",
  fontFamilySemiBold: "Manrope_600SemiBold",
  fontFamilyBold: "Manrope_700Bold",
  fontFamilyExtraBold: "Manrope_800ExtraBold",
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
};
