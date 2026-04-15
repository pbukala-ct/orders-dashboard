# Orders Dashboard

A real-time analytics dashboard for commercetools-powered e-commerce. Provides visibility into live orders, sales performance, and discount campaign management including budget and usage cap tracking.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · Recharts · SWR · Google BigQuery · commercetools

---

## Features

- **Orders Dashboard** — sales performance charts, top products by revenue, order locations, filterable by time range
- **Campaigns** — discount grouping by campaign key, start/end dates, active/inactive status
- **Budget Tracker** — tracks discount spend vs. budget cap (sourced from BigQuery)
- **Usage Cap Monitor** — tracks application count vs. application cap (sourced from BigQuery)
- **Impact Analysis** — discount usage breakdown with per-discount order counts and amounts

---

## Architecture

```
commercetools Platform
    │
    ├── Orders API ──────────────────────────────────────────────────┐
    ├── Cart Discounts API (Custom Fields) ──────────────────────────┤
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

Budget and usage tracking is sourced exclusively from BigQuery — only orders where discounts were actually applied appear there, giving accurate per-discount spend and application counts without noise from unrelated orders.

---

## Local Development

### Prerequisites

- Node.js 20+
- A commercetools project with API credentials
- A GCP project with BigQuery and Pub/Sub set up (see `gcp/setup.txt`)

### Setup

```bash
npm install
cp .env.local.example .env.local   # then fill in your credentials
npm run dev
```

App runs at `http://localhost:3000`.

### Environment Variables

Create `.env.local` with the following:

```bash
# commercetools
NEXT_PUBLIC_CTP_PROJECT_KEY=your-project-key
NEXT_PUBLIC_CTP_AUTH_URL=https://auth.australia-southeast1.gcp.commercetools.com
NEXT_PUBLIC_CTP_API_URL=https://api.australia-southeast1.gcp.commercetools.com
NEXT_PUBLIC_CTP_SCOPE=manage_project:your-project-key
CTP_CLIENT_ID=your-client-id
CTP_CLIENT_SECRET=your-client-secret

# Google Cloud / BigQuery (service account credentials)
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_CLIENT_EMAIL=your-sa@your-project.iam.gserviceaccount.com
# Paste the full private key on one line with \n for newlines, wrapped in double quotes:
GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"

# Optional — defaults shown
BIGQUERY_DATASET_ID=commerce_analytics
BIGQUERY_TABLE_ID=discount_budget_usage
```

> **Private key format:** copy the `private_key` value from your GCP service account JSON file. It must be on a single line with literal `\n` between each line, wrapped in double quotes.

---

## GCP Cloud Function

The `processDiscountUsage` Cloud Function listens on a Pub/Sub topic and writes one BigQuery row per discount per line item per order.

```
gcp/
  processDiscountUsage/   # Cloud Function source
  deployment.txt          # gcloud deploy command
  setup.txt               # GCP/BigQuery initial setup
```

Deploy:
```bash
# Fill in the variables in gcp/deployment.txt first, then:
bash gcp/deploy.sh
```

See `gcp/deployment.txt` for the full `gcloud functions deploy` command and environment variable list.

---

## commercetools Custom Type

Cart Discounts require a custom type (`cart-discount-budget`) with these fields:

| Field | Type | Purpose |
|---|---|---|
| `cap` | Money | Budget cap — max discount spend |
| `application-cap` | Number | Max times the discount can be applied |
| `auto` | Boolean | Auto-disable when cap is reached |
| `campaing-key` | String | Groups discounts into campaigns *(typo is intentional — matches production data)* |
| `campaign-name` | String | Human-readable campaign name |
| `start-date` | Date | Campaign start |
| `end-date` | Date | Campaign end |

The full type definition JSON is in `CLAUDE.md`.

---

## Deployment

### Netlify (recommended)

1. Connect the repository in the Netlify dashboard
2. Set all environment variables from `.env.local` in **Site settings → Environment variables**
3. Deploy — `netlify.toml` handles the build config and Next.js runtime automatically

### Commands

```bash
npm run dev      # development server
npm run build    # type-check + production build
npm run start    # serve production build locally
npm run lint     # ESLint
```
