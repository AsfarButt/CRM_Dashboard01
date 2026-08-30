import type { SalesSummary } from './sales';

// ---------------------------------------------------------------
// Fallback lookup for presentation-only fields not present in
// sales-summary.json (category + icon per menu item). Extend this
// as new item names show up in best_sellers data.
// ---------------------------------------------------------------

console.log('>>> transformSalesData.ts LOADED FROM:', __filename);

const ITEM_META: Record<string, { category: string; icon: string }> = {
  Espresso: { category: "Drinks", icon: "☕" },
  Americano: { category: "Drinks", icon: "☕" },
  Cappuccino: { category: "Drinks", icon: "☕" },
  Latte: { category: "Drinks", icon: "☕" },
  Mocha: { category: "Drinks", icon: "☕" },
  "Flat White": { category: "Drinks", icon: "☕" },
  "Cold Brew": { category: "Drinks", icon: "🥤" },
  "Iced Latte": { category: "Drinks", icon: "🥤" },
  "Hot Chocolate": { category: "Drinks", icon: "🍵" },
  "Chai Latte": { category: "Drinks", icon: "🍵" },
  Croissant: { category: "Food", icon: "🥐" },
  "Blueberry Muffin": { category: "Food", icon: "🫐" },
  "Bagel with Cream Cheese": { category: "Food", icon: "🥯" },
  "Banana Bread": { category: "Food", icon: "🍞" },
  "Chocolate Chip Cookie": { category: "Food", icon: "🍪" },
  "Avocado Toast": { category: "Food", icon: "🥑" },
  "Breakfast Sandwich": { category: "Food", icon: "🥪" },
  Scone: { category: "Food", icon: "🥐" },
};
const DEFAULT_ITEM_META = { category: "Menu", icon: "🍽️" };

// ---------------------------------------------------------------
// Menu margin data (from the menu/pricing sheet) — price, cost,
// and margin per item. Kept here only as the source of truth for
// WHY the Top Rated / Slow Movers lists below look the way they
// do ("how much they make us" = margin, the dollar profit per
// item — not margin_pct). Not otherwise used at render time.
//
// Sorted by margin, high to low:
//   Avocado Toast        4.10
//   Breakfast Sandwich   3.90
//   Iced Latte           3.75
//   Flat White           3.60
//   Latte / Mocha        3.55
//   Cappuccino / Chai     3.40
//   Cold Brew            3.35
//   Hot Chocolate        2.95
//   Americano             2.85
//   Bagel w/ Cream Cheese 2.65
//   Banana Bread         2.60
//   Espresso             2.40
//   Blueberry Muffin     2.30
//   Scone                2.20
//   Croissant            2.15
//   Chocolate Chip Cookie 2.00
// ---------------------------------------------------------------

// ---------------------------------------------------------------
// "Top Rated" / "Slow Movers" tabs
// ---------------------------------------------------------------
// sales-summary.json only carries real per-item numbers for
// "This Week" (best_sellers.name/qty/scale). There's no per-branch
// sales-volume breakdown to rank margin against, so these two
// lists are hand-picked from the margin data above: highest-margin
// items for Top Rated, lowest-margin for Slow Movers — split across
// branches so no two branches show an identical set (some overlap
// is fine, all three matching is not).
//
// `sold` / `change` below are PLACEHOLDER display numbers, not
// pulled from real data (there's nothing to pull from yet). Swap
// these for real per-item, per-branch figures once that data
// exists, or tell me to change the selection/numbers.
// ---------------------------------------------------------------
type CuratedItem = { name: string; sold: number; change: number };

const TOP_RATED_BY_BRANCH: Record<string, CuratedItem[]> = {
  Downtown: [
    { name: "Avocado Toast", sold: 142, change: 18 },
    { name: "Breakfast Sandwich", sold: 128, change: 14 },
    { name: "Iced Latte", sold: 165, change: 9 },
  ],
  Uptown: [
    { name: "Avocado Toast", sold: 118, change: 12 },
    { name: "Flat White", sold: 134, change: 10 },
    { name: "Latte", sold: 151, change: 7 },
  ],
  Riverside: [
    { name: "Breakfast Sandwich", sold: 96, change: 11 },
    { name: "Mocha", sold: 112, change: 6 },
    { name: "Cold Brew", sold: 121, change: 8 },
  ],
};

const SLOW_MOVERS_BY_BRANCH: Record<string, CuratedItem[]> = {
  Downtown: [
    { name: "Chocolate Chip Cookie", sold: 22, change: -14 },
    { name: "Croissant", sold: 19, change: -9 },
    { name: "Scone", sold: 17, change: -11 },
  ],
  Uptown: [
    { name: "Blueberry Muffin", sold: 21, change: -8 },
    { name: "Espresso", sold: 26, change: -6 },
    { name: "Croissant", sold: 18, change: -13 },
  ],
  Riverside: [
    { name: "Scone", sold: 14, change: -17 },
    { name: "Chocolate Chip Cookie", sold: 16, change: -12 },
  ],
};

function toDisplayItem(item: CuratedItem) {
  const meta = ITEM_META[item.name] ?? DEFAULT_ITEM_META;
  return {
    name: item.name,
    category: meta.category,
    icon: meta.icon,
    sold: item.sold,
    change: item.change,
  };
}

// ---------------------------------------------------------------
// Defensive helpers — every field pulled from real data goes
// through one of these so a missing/malformed branch never
// crashes the UI. Numbers default to 0, strings to "", arrays to [].
// ---------------------------------------------------------------
function num(value: unknown): number {
  return typeof value === "number" && !Number.isNaN(value) ? value : 0;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function arr<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function formatGeneratedAt(value: unknown): string {
  const s = str(value);
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatRevenueTag(value: unknown): string {
  const v = num(value);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toString();
}

type BranchSummary = Partial<SalesSummary["downtown"]>;

export function mapBranch(branch: BranchSummary | undefined | null, branchName: string) {
  const b = branch ?? {};
  const bestSellers = b.best_sellers ?? { name: [], qty: [], scale: [] };
  const snapshot = b.snapshot_data ?? ({} as NonNullable<typeof b.snapshot_data>);

  const names = arr<string>(bestSellers.name);
  const qtys = arr<number>(bestSellers.qty);
  const scales = arr<number>(bestSellers.scale);

  return {
    totalAnnualRevenue: num(b.annual_revenue),
    totalAnnualRevenueTag: formatRevenueTag(b.annual_revenue),

    // Keyed by the exact BEST_SELLER_TABS labels from vars.js so
    // BestSellersCard can index straight off the active tab.
    bestSellers: {
      "This Week": names.map((name, i) => {
        const safeName = str(name) || "Unknown item";
        const meta = ITEM_META[safeName] ?? DEFAULT_ITEM_META;
        return {
          name: safeName,
          category: meta.category,
          icon: meta.icon,
          sold: num(qtys[i]),
          change: num(scales[i]),
        };
      }),
      "Top Rated": (TOP_RATED_BY_BRANCH[branchName] ?? []).map(toDisplayItem),
      "Slow Movers": (SLOW_MOVERS_BY_BRANCH[branchName] ?? []).map(toDisplayItem),
    },

    snapshot: {
      revenue: {
        value: num(snapshot?.today_revenue),
        change: num(snapshot?.todays_revenue_scale),
      },
      sales: {
        value: num(snapshot?.today_sales),
        change: num(snapshot?.today_sales_scale),
        suffix: "orders",
      },
      // NOTE: UI label for this tile is "Items Sold" (see SnapshotCard
      // in home.tsx) — mapped to real items_sold data, not an actual
      // profit figure. dashboard.py doesn't track cost/profit yet.
      profit: {
        value: num(snapshot?.items_sold),
        change: num(snapshot?.items_sold_scale),
      },
      avgOrderValue: {
        value: num(snapshot?.avg_order_value),
        change: num(snapshot?.avg_order_value_scale),
      },
    },
      monthlyRevenue: arr<{
      month: number;
      year: number;
      revenue: number;
      current_month: boolean;
      day: number | false;
    }>(b.monthly_revenue).map((m) => ({
      month: num(m.month),
      year: num(m.year),
      revenue: num(m.revenue),
      current_month: Boolean(m.current_month),
      day: m.day === false ? (false as const) : num(m.day),
    })),
  };
}

// NOTE: keys here are capitalized ("Downtown"/"Uptown"/"Riverside") to
// match home.tsx's TransformedBranchData["Downtown"] usage and the
// BRANCHES array in vars.js. The source JSON keys (s.downtown, etc.)
// stay lowercase — only the OUTPUT object's keys are capitalized.
// branchName is also passed into mapBranch so it can look up that
// branch's curated Top Rated / Slow Movers lists above.
export function toBranchData(summary: SalesSummary | undefined | null) {
  const s = summary ?? ({} as Partial<SalesSummary>);
  console.log('toBranchData received:', s);
  return {
    branches: {
      Downtown: mapBranch(s.downtown, "Downtown"),
      Uptown: mapBranch(s.uptown, "Uptown"),
      Riverside: mapBranch(s.riverside, "Riverside"),
    },
    generatedAt: formatGeneratedAt(s.generated_at),
  };
}

export type TransformedBranchData = ReturnType<typeof toBranchData>["branches"];