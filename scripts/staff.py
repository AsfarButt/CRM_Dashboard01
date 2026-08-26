import json
from pathlib import Path

import numpy as np
import pandas as pd

EMPLOYEES_JSON_PATH = Path("data/employeesdata.json")
EMPLOYEES_SALES_JSON_PATH = Path("data/employees.json")
OUTPUT_PATH = Path("data/staff-summary.json")


def load_json(path):
    try:
        return json.loads(path.read_text())
    except Exception as e:
        print("Error occured: ", e)
        return None


def safe_rate(numerator, denominator, invert=False):
    """
    Returns a 0-100 percentage. Falls back to 0 (instead of NaN or
    ZeroDivisionError) when there's no data to divide by.

    invert=True is for "wrong/bad count" numerators, e.g. orders_made_wrong,
    customer_complaints, (late_arrivals + absences) — it returns the
    "good" rate (100 - rate) instead of the raw bad rate.
    """
    if not denominator:
        return 0.0
    rate = numerator / denominator * 100
    return round((100 - rate) if invert else rate, 2)


def safe_avg(total, count):
    if not count:
        return 0.0
    return round(total / count, 2)


def presence_rate_calculator(late_sum, late_count, absence_sum, absence_count):
    """
    (30 - avg monthly late arrivals) * 0.3 + (30 - avg monthly absences) * 0.7,
    normalized from its natural 0-30 max to a 0-100 scale so it's comparable
    to correct_order_ratio / customer_success_rate. Clamped at 0 in case an
    employee's monthly average exceeds 30 (data error or extreme case).
    """
    if not late_count or not absence_count:
        return 0.0

    late_avg = late_sum / late_count
    absence_avg = absence_sum / absence_count
    raw_score = (30 - late_avg) * 0.3 + (30 - absence_avg) * 0.7

    normalized = raw_score * (100 / 30)
    return round(max(0.0, normalized), 2)


def build_employee_details(employees_data):
    """
    One entry per employee from employeesdata.json. Uses row.get(...) with
    a None fallback so a missing column doesn't crash the whole run.
    """
    details = []
    for _, row in employees_data.iterrows():
        details.append({
            'employee_id': row.get('employee_id'),
            'name': row.get('name'),
            'branch': row.get('branch'),
            'role': row.get('role'),
            'employment_type': row.get('employment_type'),
            'date_of_joining': row.get('date_of_joining'),
            'termination_date': (
                row.get('termination_date')
                if pd.notna(row.get('termination_date'))
                else None
            ),
            'status': row.get('status'),
        })
    return details


def performance_summary_calculator(sales_data):
    """
    One row per employee_id, aggregated across all their monthly records.
    Everything is summed first, then divided once — never averaged as
    per-month ratios — so a low-volume month doesn't get equal weight to
    a high-volume one (same fix we applied earlier for accuracy/rating).

    Returns a DataFrame indexed by employee_id so it can be safely looked
    up (with .get(..., default)) per employee, including employees who
    have zero sales records at all.
    """
    if sales_data is None or sales_data.empty:
        return pd.DataFrame()

    grouped = sales_data.groupby('employee_id').agg(
        total_performance=('performance_rating', 'sum'),
        months_recorded=('performance_rating', 'count'),
        total_hours_worked=('hours_worked', 'sum'),
        total_shifts_worked=('shifts_worked', 'sum'),
        total_late_arrivals=('late_arrivals', 'sum'),
        late_arrivals_count=('late_arrivals', 'count'),
        total_absences=('absences', 'sum'),
        absences_count=('absences', 'count'),
        total_orders_handled=('orders_handled', 'sum'),
        total_orders_made_wrong=('orders_made_wrong', 'sum'),
        total_customer_complaints=('customer_complaints', 'sum'),
    )

    summary = pd.DataFrame(index=grouped.index)

    summary['avg_performance'] = grouped.apply(
        lambda r: safe_avg(r['total_performance'], r['months_recorded']), axis=1
    )
    summary['avg_hours_worked'] = grouped.apply(
        lambda r: safe_avg(r['total_hours_worked'], r['months_recorded']), axis=1
    )
    summary['avg_shifts_worked'] = grouped.apply(
        lambda r: safe_avg(r['total_shifts_worked'], r['months_recorded']), axis=1
    )

    summary['presence_rate'] = grouped.apply(
        lambda r: presence_rate_calculator(
            r['total_late_arrivals'],
            r['late_arrivals_count'],
            r['total_absences'],
            r['absences_count'],
        ),
        axis=1,
    )

    summary['correct_order_ratio'] = grouped.apply(
        lambda r: safe_rate(
            r['total_orders_made_wrong'], r['total_orders_handled'], invert=True
        ),
        axis=1,
    )

    summary['customer_success_rate'] = grouped.apply(
        lambda r: safe_rate(
            r['total_customer_complaints'], r['total_orders_handled'], invert=True
        ),
        axis=1,
    )

    return summary


def process_staff_data(employees_path, sales_path):
    employees_raw = load_json(employees_path)
    sales_raw = load_json(sales_path)

    if employees_raw is None:
        print("Failed to read employeesdata.json — aborting.")
        return None

    employees_data = pd.DataFrame(employees_raw)
    sales_data = pd.DataFrame(sales_raw) if sales_raw is not None else pd.DataFrame()

    employee_details = build_employee_details(employees_data)
    performance_summary = performance_summary_calculator(sales_data)

    # Fallback performance block used for any employee with no sales
    # records at all (new hires, data gaps, etc.) so the output shape is
    # always consistent instead of missing keys.
    empty_performance = {
        'avg_performance': 0.0,
        'avg_hours_worked': 0.0,
        'avg_shifts_worked': 0.0,
        'presence_rate': 0.0,
        'correct_order_ratio': 0.0,
        'customer_success_rate': 0.0,
    }

    for employee in employee_details:
        employee_id = employee['employee_id']
        if employee_id in performance_summary.index:
            row = performance_summary.loc[employee_id]
            employee['performance'] = {
                'avg_performance': float(row['avg_performance']),
                'avg_hours_worked': float(row['avg_hours_worked']),
                'avg_shifts_worked': float(row['avg_shifts_worked']),
                'presence_rate': float(row['presence_rate']),
                'correct_order_ratio': float(row['correct_order_ratio']),
                'customer_success_rate': float(row['customer_success_rate']),
            }
        else:
            employee['performance'] = dict(empty_performance)

    result = {
        'employees': employee_details,
        'total_employee_records': len(employee_details),
        'generated_at': pd.Timestamp.now('UTC').isoformat(),
    }
    return result


class NpEncoder(json.JSONEncoder):
    """Handles numpy/pandas types that json.dumps can't serialize natively."""

    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, pd.Timestamp):
            return obj.isoformat()
        return super().default(obj)


def main():
    result = process_staff_data(EMPLOYEES_JSON_PATH, EMPLOYEES_SALES_JSON_PATH)
    if result is None:
        print("Failed to read or process staff data — aborting write.")
        return

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(result, indent=2, cls=NpEncoder))
    print(f"Wrote staff summary to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()