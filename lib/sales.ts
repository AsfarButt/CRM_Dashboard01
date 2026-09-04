import fs from 'fs';
import path from 'path';

// --- Types ---
// Mirrors the shape written by scripts/dashboard.py

interface BestSellers {
  name: string[];
  qty: number[];
  scale: number[];
}

interface SnapshotData {
  today_revenue: number;
  today_sales: number;
  items_sold: number;
  avg_order_value: number;
  todays_revenue_scale: number;
  today_sales_scale: number;
  items_sold_scale: number;
  avg_order_value_scale: number;
}

interface BranchSummary {
  annual_revenue: { year: number; revenue: number }[];
  best_sellers: BestSellers;
  snapshot_data: SnapshotData;
  monthly_revenue: {
    month: number;
    year: number;
    revenue: number;
    current_month: boolean;
    day: number | false;
  }[];
}

export interface SalesSummary {
  downtown: BranchSummary;
  uptown: BranchSummary;
  riverside: BranchSummary;
  total_sales_records: number;
  generated_at: string;
}

// --- Data access ---

const SALES_SUMMARY_PATH = path.join(process.cwd(), 'data', 'sales-summary.json');

export async function getSalesSummary(): Promise<SalesSummary> {
  let fileContents: string;

  try {
    fileContents = fs.readFileSync(SALES_SUMMARY_PATH, 'utf8');
  } catch (err) {
    throw new Error(
      `Could not read sales-summary.json at ${SALES_SUMMARY_PATH}. ` +
      `Make sure the Sales Report workflow has run and committed this file. ` +
      `Original error: ${(err as Error).message}`
    );
  }

  try {
    return JSON.parse(fileContents) as SalesSummary;
  } catch (err) {
    throw new Error(
      `sales-summary.json is not valid JSON: ${(err as Error).message}`
    );
  }
}
