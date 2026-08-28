import json
from pathlib import Path

import numpy as np
import pandas as pd

SALES_JSON_PATH = Path("data/sales.json")
SUPPLY_JSON_PATH = Path("data/supply.json")
SUPPLIERS_JSON_PATH = Path("data/suppliers.json")
OUTPUT_PATH = Path("data/sales-analytics-summary.json")


def load_json_df(path):
    """Reads a JSON file into a DataFrame. Never raises — returns None on
    any failure (missing file, malformed JSON, etc.) so callers can decide
    how to fall back instead of the script dying mid-run."""
    try:
        return pd.read_json(path)
    except Exception as e:
        print(f"Error occured while loading {path}: ", e)
        return None


def percent_change_calculator(x, y):
    if y in (0, None) or pd.isna(y):
        return 0
    return round((x - y) / y * 100, 2)


def safe_sum(df, column):
    """Sums a column, returning 0 instead of raising for an empty
    dataframe, a None dataframe, or a dataframe missing that column."""
    if df is None or df.empty or column not in df.columns:
        return 0
    return df[column].sum()


def safe_count(df, column):
    if df is None or df.empty or column not in df.columns:
        return 0
    return df[column].count()


def revenue_and_profit_calculator(sales_present, sales_past, supply_present, supply_past):
    data = {}

    data['total_revenue'] = safe_sum(sales_present, 'total')
    data['L_total_revenue'] = safe_sum(sales_past, 'total')
    data['total_sales'] = safe_count(sales_present, 'order_id')
    data['L_total_sales'] = safe_count(sales_past, 'order_id')
    data['total_supplycost'] = safe_sum(supply_present, 'cost')
    data['L_total_supplycost'] = safe_sum(supply_past, 'cost')

    data['total_profit'] = data['total_revenue'] - data['total_supplycost']
    data['L_total_profit'] = data['L_total_revenue'] - data['L_total_supplycost']

    data['revenue_scale'] = percent_change_calculator(data['total_revenue'], data['L_total_revenue'])
    data['sales_scale'] = percent_change_calculator(data['total_sales'], data['L_total_sales'])
    data['supplycost_scale'] = percent_change_calculator(data['total_supplycost'], data['L_total_supplycost'])
    data['profit_scale'] = percent_change_calculator(data['total_profit'], data['L_total_profit'])

    return data


def branch_split_calculator(sales_present, supply_present):
    """Per-branch revenue and supply cost for the current window.

    Fix vs. the original: the original looped over `branch_supply.index`
    only, so a branch that had sales but zero supply orders in the window
    (or vice versa) would silently be dropped from the result. This takes
    the union of branches seen on either side instead, so every branch
    shows up with a real 0 rather than being missing entirely.
    """
    if sales_present is None or sales_present.empty or 'branch' not in sales_present.columns:
        branch_sales = pd.Series(dtype=float)
    else:
        branch_sales = sales_present.groupby('branch')['total'].sum()

    if supply_present is None or supply_present.empty or 'branch' not in supply_present.columns:
        branch_supply = pd.Series(dtype=float)
    else:
        branch_supply = supply_present.groupby('branch')['cost'].sum()

    all_branches = set(branch_sales.index) | set(branch_supply.index)

    branch_revenue_details = {}
    for branch in sorted(all_branches):
        branch_revenue_details[f"{branch}_revenue"] = float(branch_sales.get(branch, 0))
        branch_revenue_details[f"{branch}_supplycost"] = float(branch_supply.get(branch, 0))

    return branch_revenue_details


def monthly_supply_order_calculator(supply_present):
    """Aggregates this window's supply orders by material. Returns an
    empty list — instead of raising a KeyError — if there were no supply
    orders in the window or the expected columns aren't present."""
    required_cols = {'material', 'cost', 'quantity', 'unit', 'date'}
    if supply_present is None or supply_present.empty or not required_cols.issubset(supply_present.columns):
        return []

    grouped = (
        supply_present
        .groupby('material')
        .agg(
            cost=('cost', 'sum'),
            quantity=('quantity', 'sum'),
            unit=('unit', 'first'),
            delivery_date=('date', 'first'),
        )
        .reset_index()
    )
    return grouped.to_dict(orient='records')


def supplier_breakdown_calculator(supply_present, suppliers_data):
    """Material x supplier cost/quantity breakdown, joined to supplier
    name. Falls back to 'Unknown supplier' rather than failing if the
    suppliers dataset is missing, empty, or a supplier_id can't be
    matched (e.g. suppliers.json failed to load)."""
    required_cols = {'material', 'supplier_id', 'cost', 'quantity'}
    if supply_present is None or supply_present.empty or not required_cols.issubset(supply_present.columns):
        return []

    grouped = (
        supply_present
        .groupby(['material', 'supplier_id'])
        .agg(cost=('cost', 'sum'), quantity=('quantity', 'sum'))
        .reset_index()
    )

    if (
        suppliers_data is not None
        and not suppliers_data.empty
        and {'supplier_id', 'name'}.issubset(suppliers_data.columns)
    ):
        grouped = grouped.merge(
            suppliers_data[['supplier_id', 'name']],
            on='supplier_id',
            how='left',
        ).rename(columns={'name': 'supplier'})
        grouped['supplier'] = grouped['supplier'].fillna('Unknown supplier')
    else:
        grouped['supplier'] = 'Unknown supplier'

    return grouped.to_dict(orient='records')


def process_sales_analytics(sales_path, supply_path, suppliers_path):
    sales_data = load_json_df(sales_path)
    supply_data = load_json_df(supply_path)
    suppliers_data = load_json_df(suppliers_path)  # optional — handled gracefully if missing

    if sales_data is None or supply_data is None:
        print("Missing required sales or supply data — aborting analytics.")
        return None

    # Parse dates defensively: malformed/missing dates become NaT and are
    # dropped rather than crashing the later window comparisons.
    for df, label in ((sales_data, 'sales'), (supply_data, 'supply')):
        if 'date' not in df.columns:
            print(f"Warning: {label} data has no 'date' column — aborting analytics.")
            return None
        df['date'] = pd.to_datetime(df['date'], errors='coerce')

    sales_data = sales_data.dropna(subset=['date'])
    supply_data = supply_data.dropna(subset=['date'])

    if sales_data.empty:
        print("Warning: no sales rows with a valid date — aborting analytics.")
        return None

    today = pd.Timestamp.today().normalize() - pd.DateOffset(years=1)
    last_30th_day = today - pd.DateOffset(months=1)
    last_60th_day = today - pd.DateOffset(months=2)

    present_sales = sales_data[(sales_data['date'] > last_30th_day) & (sales_data['date'] < today)]
    present_supply = supply_data[(supply_data['date'] > last_30th_day) & (supply_data['date'] < today)]
    past_sales = sales_data[(sales_data['date'] > last_60th_day) & (sales_data['date'] < last_30th_day)]
    past_supply = supply_data[(supply_data['date'] > last_60th_day) & (supply_data['date'] < last_30th_day)]

    analytics_data = revenue_and_profit_calculator(present_sales, past_sales, present_supply, past_supply)
    analytics_data['branch_revenue_details'] = branch_split_calculator(present_sales, present_supply)
    analytics_data['this_month_supply_order'] = monthly_supply_order_calculator(present_supply)
    analytics_data['this_month_supply_order_by_supplier'] = supplier_breakdown_calculator(present_supply, suppliers_data)
    analytics_data['generated_at'] = pd.Timestamp.utcnow().isoformat()

    return analytics_data


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
    result = process_sales_analytics(SALES_JSON_PATH, SUPPLY_JSON_PATH, SUPPLIERS_JSON_PATH)
    if result is None:
        print("Failed to read or process sales analytics data — aborting write.")
        return

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(result, indent=2, cls=NpEncoder))
    print(f"Wrote sales analytics summary to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
