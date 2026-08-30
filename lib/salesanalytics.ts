import fs from 'fs';
import path from 'path';

// --- Types ---
// Mirrors the shape written by scripts/salesanalytics.py

export interface DailyBranchRevenue {
  date: string; // ISO date, e.g. "2026-10-01"
  revenue: Record<string, number>; // branch name -> that branch's revenue for this day
}

export interface MaterialSupplierDetail {
  supplier_id: string;
  supplier: string; // supplier name, or "Unknown supplier" if unmatched
  cost: number;
  quantity: number;
  unit: string;
  delivery_date: string | null; // ISO date of the earliest delivery from this supplier this window
}

export interface SupplyOrderByMaterial {
  material: string;
  cost: number; // total across all suppliers of this material
  quantity: number;
  unit: string;
  delivery_date: string | null;
  suppliers: MaterialSupplierDetail[]; // every supplier that delivered this material this window
}

export interface SalesAnalyticsSummary {
  total_revenue: number;
  L_total_revenue: number;
  total_sales: number;
  L_total_sales: number;
  total_supplycost: number;
  L_total_supplycost: number;
  total_profit: number;
  L_total_profit: number;
  revenue_scale: number; // % change vs previous 30-day window
  sales_scale: number;
  supplycost_scale: number;
  profit_scale: number;
  branch_revenue_details: Record<string, number>; // e.g. "Downtown_revenue", "Downtown_supplycost"
  daily_revenue: DailyBranchRevenue[]; // powers the area chart + histogram
  this_month_supply_order: SupplyOrderByMaterial[]; // powers the supply table, each with a nested supplier drill-down
  generated_at: string;
}

// --- Data access ---
// Same convention as lib/staff.ts: always resolved from the repo-root
// /data folder via process.cwd(), regardless of where this file itself
// lives in the project tree.

const SALES_ANALYTICS_SUMMARY_PATH = path.join(process.cwd(), 'data', 'sales-analytics-summary.json');

export async function getSalesAnalyticsSummary(): Promise<SalesAnalyticsSummary> {
  let fileContents: string;

  try {
    fileContents = fs.readFileSync(SALES_ANALYTICS_SUMMARY_PATH, 'utf8');
  } catch (err) {
    throw new Error(
      `Could not read sales-analytics-summary.json at ${SALES_ANALYTICS_SUMMARY_PATH}. ` +
      `Make sure the Sales Report workflow has run scripts/salesanalytics.py and committed this file. ` +
      `Original error: ${(err as Error).message}`
    );
  }

  try {
    return JSON.parse(fileContents) as SalesAnalyticsSummary;
  } catch (err) {
    throw new Error(
      `sales-analytics-summary.json is not valid JSON: ${(err as Error).message}`
    );
  }
}