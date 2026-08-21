# Continental Provisions Co. — Business Intelligence Dashboard

A real-time, data-driven BI dashboard that gives a CEO or business owner a live, honest view of their company's performance — sales, imports, employees, and finance — straight from the source data, without waiting on manager reports. AI is layered on top as a feature (drill-down summaries, weekly digests), not the headline gimmick.

> **Tagline:** *Real data instead of manager lies.*

---

## Overview

This project simulates a full BI stack for a fictional large B2B food manufacturing & distribution company, **Continental Provisions Co.** (~4,200 employees, ~350 vendors, ~1,100 customer accounts, 5 product divisions, 12 months of operating history). It's built to demonstrate:

- Designing and generating a realistic, internally-consistent synthetic dataset at scale
- A real-time/reactive frontend dashboard architecture
- Cost-aware backend design around a free-tier database
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
- **Database (source of truth):** Firebase Firestore (free Spark tier)
- **Static data layer:** Periodic export of Firestore data to static JSON, hosted separately (GitHub / GitHub Pages), so the dashboard reads from static files instead of hitting Firestore on every page load
- **Automation:** GitHub Actions (scheduled cron jobs) for periodic data export and the weekly AI summary generation
- **AI:** Runtime-generated summaries (entity drill-downs, weekly digest) — not pre-written into the dataset

---

## Architecture

**Why not just query Firestore live on every page load?**
Firestore's free tier caps daily reads. A live dashboard that queries the DB on every visitor pageload risks blowing through that quota if the page gets reloaded repeatedly (e.g., by a recruiter or visitor).

**Solution — decoupled read path:**
1. Firestore remains the source of truth for all data.
2. A scheduled **GitHub Actions cron job** periodically exports full-detail data from Firestore into static JSON files.
3. Those JSON files are pushed to static hosting (e.g., GitHub Pages / raw GitHub).
4. The dashboard frontend fetches the **static JSON**, not Firestore directly — so reads no longer scale with visitor traffic.
5. A separate weekly cron job generates an AI plain-English summary combined with real aggregated stats/charts.

This architecture was validated first on a smaller test scenario (a fictional 3-branch coffee shop chain) before being applied to the full Continental Provisions Co. dataset.

---

## Dataset

The dataset is fully synthetic but built with deliberate realism and internal consistency — deterministic, seeded generation (Python), overwhelmingly numeric/categorical, with minimal free-text fields (capped at 1–2 lines where present).

### Structure

- **Part 0 — Company Foundation:** reference tables (divisions, regions, product categories, etc.)
- **Part 1 — Employees:** static profiles (ID, name, department, role, region, hire date, status, salary band) + 12 monthly performance rows per employee (attendance, output, quality/error rate, flags) + an `employee_events` table (promotions, disciplinary incidents, conflicts, etc. — most employees have zero events)
- **Part 2 — Sales:** majority via own retail stores (mostly US, a few international flagship locations), minority via wholesale/bulk orders to retail marketers/vendors
- **Part 3 — Import / Vendors:** ~50–60 vendors following a Pareto pattern (8–12 core vendors supply ~80% of raw material volume; the rest are small/niche/specialized), plus a `vendor_notes` table and monthly order/delivery records with reliability variance by vendor category
- **Part 4 — Finance:** monthly rollup derived entirely from Parts 1–3 (no new raw data) — revenue, cost of goods, payroll, gross/net profit, cash flow adjusted for payment terms — plus one-off variance events (vendor delay spikes, marketing pushes, currency/duty variance)

### Realism details

- Deliberate performance variance built into employees (most steady, ~10–15% dip-and-recover, ~5% declining trend, ~5% standouts) so AI drill-down summaries have real signal to work with
- Vendor reliability varies by category (agricultural = most volatile, packaging = steadiest, cold-chain = reliability-critical), plus a few consistently excellent/problematic vendors
- A scale correction (documented `SCALE_FACTOR`, applied uniformly to revenue and cost-of-materials in the Finance rollup) was needed to bring payroll and revenue into realistic proportion without regenerating earlier parts — landed at ~3.1% net margin, thin but plausible for food distribution

### Validation dataset (coffee shop scenario)

A smaller test dataset — a fictional 3-branch coffee shop chain — was built first to validate the export/static-JSON architecture at a safe scale (~32,000 records total, under Firestore's free-tier daily read budget):

- `suppliers.json` — 10 suppliers across 5 raw-material categories
- 16 monthly `supply_orders` files (Apr 2025–Jul 2026)
- `employees.json` — 32 profiles including mid-period turnover
- 16 monthly `employee_records` files — hours, orders handled/wrong, lateness, absences, complaints, tips, performance rating
- `menu_items.json` — 18 items with price/cost/margin
- 16 monthly sales files — full-detail order records

---

## AI Features

- **Entity drill-down summaries:** generated at runtime from live current data (not pre-written) when a CEO looks up a specific employee, vendor, or customer
- **Weekly summary digest:** runs automatically via a GitHub Actions cron job, combining an AI-generated plain-English summary with real aggregated stats and charts — fully hands-off

---

## Status

- [x] All 5 dataset parts (0–4) specced and generated
- [x] Coffee shop validation dataset built and complete
- [x] Firestore + static-JSON export architecture designed
- [ ] Dashboard frontend build
- [ ] GitHub Actions export + weekly summary cron jobs
- [ ] AI drill-down summary feature
- [ ] Deployment

---

## License

TBD
