# Continental Provisions Co. — Business Intelligence Dashboard

A real-time, data-driven BI dashboard that gives a CEO or business owner a live, honest view of their company's performance — sales, imports, employees, and finance — straight from the source data, without waiting on manager reports. AI is layered on top as a feature (drill-down summaries, weekly digests), not the headline gimmick.

> **Tagline:** *Real data instead of manager lies.*

---

## Overview

This project simulates a full BI stack for a fictional large B2B food manufacturing & distribution company, **Continental Provisions Co.** (~4,200 employees, ~350 vendors, ~1,100 customer accounts, 5 product divisions, 12 months of operating history, mostly US retail stores with a few international flagship locations). It's built to demonstrate:

- Designing and generating a realistic, internally-consistent synthetic dataset at scale
- A real-time/reactive frontend dashboard architecture decoupled from live database reads
- Cost-aware backend design around a free-tier database
- A separate aggregation service for computing dashboard stats
- AI-generated insights (entity summaries, weekly digests) computed at runtime from live data, not pre-baked

The dashboard is organized into core business sections, each supporting drill-down into individual entities (a specific employee, vendor, or customer) with both raw historical numbers and an AI-generated plain-English summary of their performance/relationship with the company.

---

## Core Sections

| Section | What it covers |
|---|---|
| **Overview** | High-level company KPIs and trends across all divisions |
| **Sales** | Retail store performance + wholesale/bulk customer orders |
| **Import / Vendors** | Raw material vendors, delivery reliability, cost trends |
| **Employees** | Workforce performance, attendance, events (promotions, incidents, etc.) |
| **Finance / Cash Flow** | Revenue, cost of goods, payroll, gross/net profit — derived from the other three sections |

Each section supports **drill-down**: search a specific employee, vendor, or customer to pull their full historical record plus an AI-generated summary of trends, risk flags, or notable behavior.

---

## Tech Stack

- **Frontend:** React + Next.js
- **Database (source of truth):** Firebase Firestore (free Spark tier — 50,000 reads/day, no inactivity dormancy)
- **Static data layer:** Periodic export of Firestore data to static JSON, hosted on GitHub / GitHub Pages, so the dashboard reads from static files instead of hitting Firestore on every page load
- **Aggregation backend:** Separate Python service (FastAPI + pandas), deployed independently (Render/Railway/Fly.io free tier), fetches raw JSON from GitHub and exposes aggregation endpoints (e.g. revenue-by-branch, daily-revenue, top-items). Next.js route handlers proxy/fetch from this service rather than aggregating in JS or pre-baking aggregated JSON at export time
- **Automation:** GitHub Actions (scheduled cron jobs, running 4x/day) for periodic Firestore → static JSON export, plus a separate weekly cron job for the AI summary digest
- **AI:** Runtime-generated summaries (entity drill-downs, weekly digest) — not pre-written into the dataset
- **Dataset generation:** Deterministic, seeded Python scripts (not the originally-planned Groq/Colab pipeline) producing CSVs, one per table

---

## Architecture

**Why not just query Firestore live on every page load?**
Firestore's free tier caps daily reads at 50,000. A live dashboard that queries the DB on every visitor pageload risks blowing through that quota if the page gets reloaded repeatedly (e.g., by a recruiter or visitor).

**Solution — decoupled read path:**
1. Firestore remains the source of truth for all data.
2. A scheduled **GitHub Actions cron job** (4x/day) exports full-detail data from Firestore into static JSON files.
3. Those JSON files are pushed to static hosting (GitHub Pages / raw GitHub).
4. A separate **Python (FastAPI + pandas) aggregation service** fetches the raw static JSON and exposes computed aggregation endpoints.
5. The Next.js dashboard frontend calls that aggregation service (via route handlers) rather than querying Firestore or aggregating raw data client-side — so reads no longer scale with visitor traffic.
6. A separate weekly cron job generates an AI plain-English summary combined with real aggregated stats/charts.

**Viewing offset:** the dashboard displays the dataset with a 1-year-in-the-past offset (today's real date minus 1 year), so the "current" data shown actually advances day to day even though the underlying dataset covers a fixed 12-month historical window.

This architecture was validated first on a smaller test scenario (a fictional 3-branch coffee shop chain) before being applied to the full Continental Provisions Co. dataset.

**Known open issue:** the export cron job needs retry/fallback logic — if a run hits an error mid-fetch (e.g. a Firestore read-limit hit), the workflow currently still reports success without actually updating the files, so failures can go silent.

---

## Dataset

The dataset is fully synthetic but built with deliberate realism and internal consistency — deterministic, seeded generation (Python), overwhelmingly numeric/categorical, with minimal free-text fields (capped at 1–2 lines where present).

### Structure

- **Part 0 — Company Foundation:** 7 reference tables (divisions, regions, product categories, etc.)
- **Part 1 — Employees:** static profiles (ID, name, department, role, region, hire date, status, salary band) + 12 monthly performance rows per employee (attendance, output, quality/error rate, flags) + a separate `employee_events` table (promotions, disciplinary incidents, conflicts, substance-related, etc. — 1–2 line descriptions; most employees have zero events)
- **Part 2 — Sales:** two channels — majority via own retail stores (aggregated store-level sales, mostly US with a few international flagship stores, with a country field to support currency/duty variance), minority via wholesale/bulk orders to retail marketers/vendors
- **Part 3 — Import / Vendors:** ~50–60 vendors following a Pareto pattern (8–12 core vendors supply ~80% of raw material volume; the rest are small/niche/specialized — packaging-only, logo/label-only, single-flavor, etc.), plus a `vendor_notes` table and monthly order/delivery records with reliability variance by vendor category
- **Part 4 — Finance:** monthly rollup derived entirely from Parts 1–3 (no new raw data) — revenue, cost of goods, payroll, gross/net profit, cash flow adjusted for payment terms — plus one-off variance events (vendor delay spikes, marketing pushes, currency/duty variance)

### Realism details

- Deliberate performance variance built into employees (most steady, ~10–15% dip-and-recover, ~5% declining trend, ~5% standouts) so AI drill-down summaries have real signal to work with
- Vendor reliability varies by category (agricultural = most volatile, packaging = steadiest, cold-chain = reliability-critical), plus a few consistently excellent/problematic vendors
- **Scale correction:** raw Part 1–3 data produced a large mismatch — ~$206M/yr in payroll against ~$27M/yr in raw revenue (a -763% margin). Rather than regenerate Parts 0–2, a documented `SCALE_FACTOR` (32x) is applied uniformly to revenue and cost-of-materials in the Finance rollup, preserving every relative pattern from Parts 2–3 (seasonality, trends, vendor concentration) while landing at a realistic ~3.1% net margin — thin but plausible for food distribution

### Validation dataset (coffee shop scenario)

A smaller test dataset — a fictional 3-branch coffee shop chain — was built first to validate the export/static-JSON architecture at a safe scale (~31,993 records total, under the ~37,500 record budget target and Firestore's free-tier daily read limit):

- `suppliers.json` — 10 suppliers, 2 per raw-material category (Coffee Beans, Dairy/Milk, Bakery Ingredients, Packaging/Cups, Syrups & Flavorings)
- 16 monthly `supply_orders` files (Apr 2025–Jul 2026, ~957 records) — restock transactions per branch/supplier
- `employees.json` — 32 profiles including mid-period turnover (2 baristas left, 2 replacement hires)
- 16 monthly `employee_records` files (480 records) — hours worked, orders handled/made wrong, late arrivals, absences, complaints, tips, performance rating, flag, with built-in performance tiers (steady/improving/declining/standout/inconsistent)
- `menu_items.json` — 18 items (drinks + food) with price/cost/margin
- 16 monthly sales files — full-detail order records (date, order ID, branch, items, total, payment method)

---

## AI Features

- **Entity drill-down summaries:** generated at runtime from live current data (not pre-written) when a CEO looks up a specific employee, vendor, or customer
- **Weekly summary digest:** runs automatically via a GitHub Actions cron job, combining an AI-generated plain-English summary with real aggregated stats and charts — fully hands-off

---

## Status

- [x] All 5 dataset parts (0–4) specced and generated (Continental Provisions Co.)
- [x] Coffee shop validation dataset built and complete
- [x] Firestore + static-JSON export architecture designed
- [x] Scale correction applied to Finance rollup (Part 4)
- [x] Aggregation backend architecture decided (Python/FastAPI + pandas, separate service)
- [ ] Aggregation endpoints built and tested locally against raw GitHub JSON
- [ ] Aggregation service deployed (Render/Railway/Fly.io)
- [ ] Dashboard frontend build (Next.js, wired to aggregation service)
- [ ] GitHub Actions export cron (retry/fallback logic still needed) + weekly summary cron
- [ ] AI drill-down summary feature
- [ ] Deployment

---

## License

TBD
