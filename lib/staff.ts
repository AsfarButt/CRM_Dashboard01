import fs from 'fs';
import path from 'path';

// --- Types ---
// Mirrors the shape written by scripts/staff.py

export interface StaffPerformance {
  avg_performance: number;
  avg_hours_worked: number;
  avg_shifts_worked: number;
  presence_rate: number;
  correct_order_ratio: number;
  customer_success_rate: number;
}

export interface StaffMember {
  employee_id: string;
  name: string;
  branch: string;
  role: string;
  employment_type: string;
  date_of_joining: string;
  termination_date: string | null;
  status: string;
  performance: StaffPerformance;
}

export interface StaffSummary {
  employees: StaffMember[];
  total_employee_records: number;
  generated_at: string;
}


// --- Data access ---
// Same convention as lib/sales.ts: always resolved from the repo-root
// /data folder via process.cwd(), regardless of where this file itself
// lives in the project tree.

const STAFF_SUMMARY_PATH = path.join(process.cwd(), 'data', 'staff-summary.json');

export async function getStaffSummary(): Promise<StaffSummary> {
  let fileContents: string;

  try {
    fileContents = fs.readFileSync(STAFF_SUMMARY_PATH, 'utf8');
  } catch (err) {
    throw new Error(
      `Could not read staff-summary.json at ${STAFF_SUMMARY_PATH}. ` +
      `Make sure the Sales Report workflow has run scripts/staff.py and committed this file. ` +
      `Original error: ${(err as Error).message}`
    );
  }

  try {
    return JSON.parse(fileContents) as StaffSummary;
  } catch (err) {
    throw new Error(
      `staff-summary.json is not valid JSON: ${(err as Error).message}`
    );
  }
}