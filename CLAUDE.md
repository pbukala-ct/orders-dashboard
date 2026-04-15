# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start Next.js dev server (http://localhost:3000)
npm run build    # Type-check and build for production
npm run start    # Run the production build locally
npm run lint     # Run ESLint (Next.js config)
```

There is no test suite in this project.

---

# Orders Dashboard — Project Guide

## What This App Does

A real-time analytics dashboard for commercetools-powered e-commerce. It provides visibility into:

- **Live orders** — sales performance, top products, order locations, filterable by time range
- **Discount management** — campaign grouping, budget cap tracking, application (usage) cap tracking

Built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, **Recharts**, **SWR**, and **Google BigQuery**. Deployed/hosted separately from the GCP Cloud Function.

---

## Architecture

```
commercetools Platform
    │
    ├── Orders API ──────────────────────────────────────────────────┐
    ├── Cart Discounts API (with Custom Fields) ─────────────────────┤
    └── Pub/Sub Events ──► GCP Cloud Function (processDiscountUsage) │
                                    │                                │
                                    ▼                                │
                            BigQuery Table                           │
                        (discount_budget_usage)                      │
                                    │                                │
                        ┌───────────┘                                │
                        │                                            │
                        ▼                                            ▼
                 Next.js API Routes  ◄────────────────────────────────
                        │
                        ▼
                Frontend React App
```

**Key data flows:**
- Orders are fetched directly from commercetools API via Next.js API routes
- Discount caps/budget fields come from custom fields on Cart Discounts
- BigQuery stores a historical record of every discount application (one row per discount per line item per order)
- The GCP Cloud Function is triggered by Pub/Sub when new orders arrive

---

## Project Structure

```
src/
  app/
    api/
      orders/route.ts               # Fetch orders with time range
      discounts/route.ts            # List cart discounts
      discounts/usage/route.ts      # Aggregated discount usage from orders
      discounts/caps/route.ts       # Usage + budget caps (reads CT + orders)
      discounts/budget/route.ts     # Budget tracking (BigQuery + CT)
    (dashboard)/
      layout.tsx                    # Navigation + layout wrapper
      page.tsx                      # Orders dashboard page
      discounts/page.tsx            # Discounts page
  components/
    Dashboard.tsx                   # Main orders orchestrator
    DiscountsViewer.tsx             # Discounts page orchestrator
    CampaignGroups.tsx              # Groups discounts by campaign
    DiscountBudget.tsx              # Budget cap tracking UI
    DiscountUsageCaps.tsx           # Application cap tracking UI
    SalesPerformance.tsx            # Bar chart: sales over time
    TopProducts.tsx                 # Top 10 products by revenue
    TotalSales.tsx                  # Summary card
    OrderLocations.tsx              # Geographic distribution
    Navigation.tsx                  # Sidebar nav
  lib/
    commercetools.ts                # CT SDK client singleton
    utils.ts
  types/
    index.ts                        # All TypeScript interfaces
gcp/
  processDiscountUsage/
    index.js                        # Cloud Function entry point
    commercetools.js                # CT SDK setup for GCP
    package.json
  discount_budget_usage_schema.json # BigQuery table schema
  deployment.txt                    # gcloud deploy command
  setup.txt                         # GCP/BigQuery setup commands
```

---

## commercetools Custom Type

Cart Discounts need a custom type with the following fields. The type must be created in commercetools before the app will work correctly.

**Type key:** `cart-discount-budget` (or any key — the app reads fields by name, not type key)

**Resource type association:** `cart-discount`

### Required Custom Fields

| Field Name | Field Type | Notes |
|---|---|---|
| `cap` | Money | Budget cap — total spend limit for this discount |
| `used` | Money | *(optional)* Tracked spend — not currently written by the app |
| `application-cap` | Number | Max times the discount can be applied across all orders |
| `auto` | Boolean | If true, auto-disable the discount when cap is reached |
| `campaing-key` | String | **Typo preserved** — groups discounts into campaigns |
| `campaign-name` | String | Human-readable campaign name |
| `start-date` | Date | Campaign start date |
| `end-date` | Date | Campaign end date |

> **Note:** `campaing-key` is intentionally misspelled — this is the field name used in production. Do not rename it without a data migration.

### commercetools API — Create Custom Type

```json
{
  "key": "cart-discount-budget",
  "name": { "en-AU": "Discount Budget & Campaign" },
  "resourceTypeIds": ["cart-discount"],
  "fieldDefinitions": [
    {
      "name": "cap",
      "label": { "en-AU": "Budget Cap" },
      "required": false,
      "type": { "name": "Money" }
    },
    {
      "name": "used",
      "label": { "en-AU": "Budget Used" },
      "required": false,
      "type": { "name": "Money" }
    },
    {
      "name": "application-cap",
      "label": { "en-AU": "Application Cap (max uses)" },
      "required": false,
      "type": { "name": "Number" }
    },
    {
      "name": "auto",
      "label": { "en-AU": "Auto-disable when cap reached" },
      "required": false,
      "type": { "name": "Boolean" }
    },
    {
      "name": "campaing-key",
      "label": { "en-AU": "Campaign Key" },
      "required": false,
      "type": { "name": "String" }
    },
    {
      "name": "campaign-name",
      "label": { "en-AU": "Campaign Name" },
      "required": false,
      "type": { "name": "String" }
    },
    {
      "name": "start-date",
      "label": { "en-AU": "Campaign Start Date" },
      "required": false,
      "type": { "name": "Date" }
    },
    {
      "name": "end-date",
      "label": { "en-AU": "Campaign End Date" },
      "required": false,
      "type": { "name": "Date" }
    }
  ]
}
```

---

## BigQuery

- **Project:** `ct-sales-207211` (or `GOOGLE_CLOUD_PROJECT` env var)
- **Dataset:** `commerce_analytics` (or `BIGQUERY_DATASET_ID` env var)
- **Table:** `discount_budget_usage` (or `BIGQUERY_TABLE_ID` env var)

### Table Schema

| Column | Type | Mode | Description |
|---|---|---|---|
| `discount_id` | STRING | REQUIRED | Cart discount ID |
| `order_id` | STRING | REQUIRED | Order where discount was applied |
| `timestamp` | TIMESTAMP | REQUIRED | Order creation time (UTC) |
| `discount_amount` | FLOAT | REQUIRED | Amount discounted in dollars (centAmount / 100) |
| `currency_code` | STRING | REQUIRED | e.g. `AUD` |
| `quantity` | INTEGER | REQUIRED | Items discounted in this line |
| `product_id` | STRING | REQUIRED | Product ID |

Each row = one discount applied to one line item in one order. A single order can produce many rows.

---

## GCP Cloud Function

- **Name:** `processDiscountUsage`
- **Trigger:** Pub/Sub topic `pb-discounts-orders`
- **Region:** `australia-southeast1`
- **Runtime:** Node.js 20
- **Entry point:** `processDiscountUsage`

The function receives a Pub/Sub message containing an order ID, fetches the full order from commercetools, extracts discount usage from line items, and inserts rows into BigQuery.

See `gcp/processDiscountUsage/` for the full source and `gcp/deployment.txt` for the deploy command.

---

## Environment Variables

### Next.js App (`.env.local`)

```bash
# commercetools
NEXT_PUBLIC_CTP_PROJECT_KEY=
NEXT_PUBLIC_CTP_AUTH_URL=https://auth.australia-southeast1.gcp.commercetools.com
NEXT_PUBLIC_CTP_API_URL=https://api.australia-southeast1.gcp.commercetools.com
NEXT_PUBLIC_CTP_SCOPE=manage_project:<project_key>
CTP_CLIENT_ID=
CTP_CLIENT_SECRET=

# Google Cloud / BigQuery
GOOGLE_CLOUD_PROJECT=
GOOGLE_CLOUD_CLIENT_EMAIL=
GOOGLE_CLOUD_PRIVATE_KEY=    # Escape newlines as \\n

# Optional overrides
BIGQUERY_DATASET_ID=commerce_analytics
BIGQUERY_TABLE_ID=discount_budget_usage
```

### GCP Cloud Function

```bash
CTP_PROJECT_KEY=
CTP_CLIENT_ID=
CTP_CLIENT_SECRET=
CTP_AUTH_URL=https://auth.australia-southeast1.gcp.commercetools.com
CTP_API_URL=https://api.australia-southeast1.gcp.commercetools.com
CTP_SCOPES=manage_project:<project_key>
DATASET_ID=commerce_analytics
TABLE_ID=discount_budget_usage
ENFORCE_CAPS=false   # Set to 'true' to auto-deactivate discounts when application-cap is reached
```

---

## Timezone

All order queries use **`Australia/Sydney`** timezone for display and date-range boundaries. Queries to commercetools are converted to UTC before being sent. BigQuery timestamps are stored in UTC.

---

## Development Notes

- In `NODE_ENV !== 'production'`, BigQuery query failures fall back to randomly generated mock data so the UI remains functional during local development.
- The `/api/discounts/caps` route fetches up to 500 orders directly from CT (no BigQuery) — sufficient for dev but will need pagination for high-volume production use.
- Campaign grouping relies on the `campaing-key` custom field (typo intentional). Discounts sharing the same key are aggregated into one campaign card.
