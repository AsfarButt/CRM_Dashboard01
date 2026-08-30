// =========================================================
// vars.js
// Design tokens for the "Grind & Co." coffee shop dashboard
// Import these into home.tsx (or any other screen) to keep
// colors / spacing / typography consistent across the app.
//
// NOTE: BRANCH_DATA (the mock per-branch numbers) has been
// removed from this file. That data now comes live from
// sales-summary.json via lib/transformSalesData.ts — see
// toBranchData() there instead of importing it from here.
// =========================================================

// ---- Core palette -----------------------------------------------------
export const COLORS = {
  // Backgrounds
  bgApp: "#0a0a0b",          // outermost page background
  bgSidebar: "#0d0d0e",      // left sidebar
  bgCard: "#141416",         // card / panel background
  bgCardAlt: "#18181b",      // slightly lighter card (snapshot tiles)
  bgPill: "#1c1c1f",         // inactive pill/segmented button
  bgPillActive: "#2563eb",   // active pill (Downtown / This Week / 1Y)
  bgInput: "#141416",        // search / "Ask Grind AI" input

  // Brand / accent (blue family — professional, calm)
  accent: "#96afd6",         // primary accent (buttons, highlights)
  accentSoft: "#212c42",     // deeper blue for active pill backgrounds
  accentGlow: "rgba(59,130,246,0.25)", // glow behind revenue numbers
  gradientStart: "#000000",
  gradientEnd: "#0f1f3d",

  // Text
  textPrimary: "#ffffff",
  textSecondary: "#a1a1aa",  // muted gray for subtitles/labels
  textTertiary: "#71717a",   // dimmer gray (axis labels, timestamps)
  textAccent: "#60a5fa",     // blue text (name, tags)

  // Status
  positive: "#3bff83",       // green up-arrows / % gains
  negative: "#fa5353",       // red down-arrows

  // Borders
  border: "#26262a",
  borderSoft: "rgba(255,255,255,0.06)",

  // Chart
  chartLine: "#3b82f6",
  chartFillTop: "rgba(59,130,246,0.30)",
  chartFillBottom: "rgba(59,130,246,0.0)",
  chartGrid: "#212124",
};

// ---- Typography ---------------------------------------------------------
export const FONTS = {
  family: `'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif`,
  sizeXs: "12px",
  sizeSm: "13px",
  sizeMd: "14px",
  sizeLg: "16px",
  sizeXl: "20px",
  size2xl: "28px",
  size3xl: "34px",
  weightRegular: 400,
  weightMedium: 500,
  weightSemibold: 600,
  weightBold: 700,
};

// ---- Spacing / radius ----------------------------------------------------
export const RADIUS = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  pill: "999px",
};

export const SPACING = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
};

// ---- Static layout content (branches, sidebar nav, etc.) ----------------
export const BRANCHES = ["Downtown", "Uptown", "Riverside"];

export const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "clock" },
  { key: "analytics", label: "Sales Analytics", icon: "bar-chart" },
  { key: "summary", label: "LLM Summary", icon: "sparkles" },
  { key: "staff", label: "Staff", icon: "users" },
  { key: "readme", label: "README", icon: "file-text" },
];

export const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const TIME_RANGES = ["1D", "1W", "1M", "6M", "1Y"];
export const BEST_SELLER_TABS = ["This Week", "Top Rated", "Slow Movers"];