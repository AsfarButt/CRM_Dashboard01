import json
import os
import sys
import firebase_admin
from firebase_admin import credentials, firestore
from google.api_core import exceptions as gcloud_exceptions

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


def fetch_category(prefix):
    """Fetch and merge all collections for a given prefix. Raises on error."""
    merged = []
    all_collections = [c.id for c in db.collections() if c.id.startswith(prefix)]
    for coll_name in sorted(all_collections):
        docs = db.collection(coll_name).stream()
        merged.extend({**doc.to_dict(), "_id": doc.id} for doc in docs)
    return all_collections, merged


def main():
    # Buffer everything in memory first. Files are only written once every
    # category has been fetched successfully, so a mid-run failure never
    # leaves partial/stale output on disk.
    results = {}

    for prefix, filename in CATEGORIES.items():
        try:
            all_collections, merged = fetch_category(prefix)
        except gcloud_exceptions.ResourceExhausted:
            print(f"[warn] Firebase quota exceeded while fetching '{prefix}'. "
                  f"Aborting run without writing any files.")
            return 0  # exit cleanly, don't fail the workflow
        except gcloud_exceptions.GoogleAPICallError as e:
            print(f"[warn] Firebase API error while fetching '{prefix}': {e}. "
                  f"Aborting run without writing any files.")
            return 0
        except Exception as e:
            print(f"[warn] Unexpected error while fetching '{prefix}': {e}. "
                  f"Aborting run without writing any files.")
            return 0

        results[filename] = (all_collections, merged)

    # All categories fetched successfully — safe to write.
    for filename, (all_collections, merged) in results.items():
        out_path = os.path.join(OUTPUT_DIR, filename)
        with open(out_path, "w") as f:
            json.dump(merged, f, indent=2, default=str)
        print(f"{filename}: merged {len(all_collections)} collections, "
              f"{len(merged)} total records -> {out_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
