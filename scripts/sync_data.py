import json
import os
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

for prefix, filename in CATEGORIES.items():
    merged = []  # flat list instead of month-keyed dict

    # list_collections() only lists top-level collections; filter by prefix
    all_collections = [c.id for c in db.collections() if c.id.startswith(prefix)]

    # sorted() keeps records in chronological order within the flat list,
    # since collection names end in zero-padded YYYY-MM (e.g. SalesData-2026-01)
    for coll_name in sorted(all_collections):
        docs = db.collection(coll_name).stream()
        merged.extend({**doc.to_dict(), "_id": doc.id} for doc in docs)

    out_path = os.path.join(OUTPUT_DIR, filename)
    with open(out_path, "w") as f:
        json.dump(merged, f, indent=2, default=str)

    print(f"{filename}: merged {len(all_collections)} collections, "
          f"{len(merged)} total records -> {out_path}")
