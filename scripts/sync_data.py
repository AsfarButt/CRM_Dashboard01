import json
import os
import re
import firebase_admin
from firebase_admin import credentials, firestore

# --- Setup ---
cred = credentials.Certificate(os.environ["FIREBASE_CREDENTIALS_PATH"])
firebase_admin.initialize_app(cred)
db = firestore.client()

# Category prefix -> output filename
CATEGORIES = {
    "SalesData": "sales.json",
    "EmployeesData": "employees.json",
    "SupplyData": "supply.json",
}

OUTPUT_DIR = "data"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def month_key_from_collection(name: str) -> str:
    # "SalesData-2026-01" -> "2026-01"
    match = re.search(r"(\d{4}-\d{2})$", name)
    return match.group(1) if match else name

for prefix, filename in CATEGORIES.items():
    merged = {}
    # list_collections() only lists top-level collections; filter by prefix
    all_collections = [c.id for c in db.collections() if c.id.startswith(prefix)]

    for coll_name in sorted(all_collections):
        month = month_key_from_collection(coll_name)
        docs = db.collection(coll_name).stream()
        merged[month] = [ {**doc.to_dict(), "_id": doc.id} for doc in docs ]

    out_path = os.path.join(OUTPUT_DIR, filename)
    with open(out_path, "w") as f:
        json.dump(merged, f, indent=2, default=str)

    print(f"Wrote {sum(len(v) for v in merged.values())} records across "
          f"{len(merged)} months -> {out_path}")
