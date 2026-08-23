import json
from pathlib import Path

import numpy as np
import pandas as pd

SALES_JSON_PATH = Path("data/sales.json")
OUTPUT_PATH = Path("data/sales-summary.json")


def load_sales_json(path):
    try:
        return json.loads(path.read_text())
    except Exception as e:
        print("Error occured: ", e)
        return None


def percent_change_calculator(x, y):
    return round((x - y) / y * 100, 2) if y != 0 else 0


def todays_snapshot_calculator(sales_data, date):
    snapshot_data = {}
    todays_data = sales_data[sales_data['date'] == date]

    snapshot_data['today_revenue'] = todays_data['total'].sum()
    snapshot_data['today_sales'] = todays_data['order_id'].count()

    exploded_items = todays_data['items'].explode().dropna()
    snapshot_data['items_sold'] = (
        exploded_items.apply(lambda item: item['qty']).sum()
        if not exploded_items.empty else 0
    )

    snapshot_data['avg_order_value'] = (
        round(snapshot_data['today_revenue'] / snapshot_data['today_sales'], 2)
        if snapshot_data['today_sales'] > 0 else 0
    )
    return snapshot_data


def sales_data_calculator(sales_data, today):
    result = {}

    annual_revenue = sales_data.groupby('year')['total'].sum().reset_index()
    last_year = str(pd.Timestamp.today().year - 1)
    annual_row = annual_revenue[annual_revenue['year'] == last_year]
    result['annual_revenue'] = (
        float(annual_row['total'].iloc[0]) if not annual_row.empty else 0
    )

    current_7_start = today - pd.Timedelta(days=6)
    previous_7_start = today - pd.Timedelta(days=13)
    previous_7_end = today - pd.Timedelta(days=7)

    current_7_days = sales_data[
        (sales_data['date'] >= current_7_start) & (sales_data['date'] <= today)
    ]
    previous_7_days = sales_data[
        (sales_data['date'] >= previous_7_start) & (sales_data['date'] <= previous_7_end)
    ]

    def best_sellers_for(df):
        return (
            df.explode('items')
            .assign(
                name=lambda x: x['items'].str['name'],
                qty=lambda x: x['items'].str['qty'],
            )
            .groupby('name')['qty']
            .sum()
            .reset_index()
            .sort_values('qty', ascending=False)
        )

    current_best_sellers = best_sellers_for(current_7_days)
    past_best_sellers = best_sellers_for(previous_7_days)

    best_sellers = {
        'name': current_best_sellers['name'].head(3).tolist(),
        'qty': current_best_sellers['qty'].head(3).tolist(),
    }

    # Safe lookup: item may not have sold at all in the previous window
    past_reference_data = []
    for name in best_sellers['name']:
        match = past_best_sellers.loc[past_best_sellers['name'] == name, 'qty']
        past_reference_data.append(match.iloc[0] if not match.empty else 0)

    # Safe scale: avoid divide-by-zero when an item had 0 sales last week
    best_sellers['scale'] = [
        round((current - past) / past * 100, 2) if past != 0 else 0
        for current, past in zip(best_sellers['qty'], past_reference_data)
    ]

    result['best_sellers'] = best_sellers

    todays_snapshot_data = todays_snapshot_calculator(sales_data, today)
    yesterday_snapshot_data = todays_snapshot_calculator(sales_data, today - pd.Timedelta(days=1))

    todays_snapshot_data['todays_revenue_scale'] = percent_change_calculator(
        todays_snapshot_data['today_revenue'], yesterday_snapshot_data['today_revenue']
    )
    todays_snapshot_data['today_sales_scale'] = percent_change_calculator(
        todays_snapshot_data['today_sales'], yesterday_snapshot_data['today_sales']
    )
    todays_snapshot_data['items_sold_scale'] = percent_change_calculator(
        todays_snapshot_data['items_sold'], yesterday_snapshot_data['items_sold']
    )
    todays_snapshot_data['avg_order_value_scale'] = percent_change_calculator(
        todays_snapshot_data['avg_order_value'], yesterday_snapshot_data['avg_order_value']
    )

    result['snapshot_data'] = todays_snapshot_data
    return result


def process_sales_data(path):
    """
    Reads the local sales JSON (already pulled into the repo by the Firebase
    export workflow) and returns per-branch summaries (downtown / uptown /
    riverside) ready for JSON serialization.
    """
    response = load_sales_json(path)
    if response is None:
        return None

    sales_data = pd.DataFrame(r for r in response)
    sales_data['date'] = pd.to_datetime(sales_data['date'])
    sales_data['month'] = sales_data['date'].dt.strftime('%Y-%m')
    sales_data['year'] = sales_data['date'].dt.strftime('%Y')

    today = pd.Timestamp.today().normalize() - pd.DateOffset(years=1)

    branches = {
        'downtown': sales_data[sales_data['branch'] == 'Downtown'],
        'uptown': sales_data[sales_data['branch'] == 'Uptown'],
        'riverside': sales_data[sales_data['branch'] == 'Riverside'],
    }

    result = {
        name: sales_data_calculator(df, today) for name, df in branches.items()
    }
    result['total_sales_records'] = int(sales_data['order_id'].count())
    result['generated_at'] = pd.Timestamp.utcnow().isoformat()
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
    result = process_sales_data(SALES_JSON_PATH)
    if result is None:
        print("Failed to read or process sales data — aborting write.")
        return

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(result, indent=2, cls=NpEncoder))
    print(f"Wrote sales summary to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
    