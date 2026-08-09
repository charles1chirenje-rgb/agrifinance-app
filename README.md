# AgriFinance

A full-stack financial and farm-management web application for small-to-medium-scale
Zimbabwean farmers, built as the practical component of Charles's diploma capstone
thesis (case study: Farm 54, Chiredzi). Built with vanilla HTML/CSS/JavaScript on the
frontend and a Node.js/Express REST API on the backend, deployable to Vercel.

## What it does

- **Accounts & roles** — email/password auth (JWT), `admin` and `user` roles. The
  first person to register with the admin invite code becomes the farm owner/admin;
  everyone else registers as a standard user.
- **AI Farm Assistant** — a floating chat widget on every page, backed by Claude,
  grounded in a live snapshot of the farm's actual data (crops, livestock, loans,
  transactions, forecast). It answers questions in the farm's own numbers rather
  than inventing anything, and a proactive insights panel on the dashboard surfaces
  the same "things worth your attention" without needing to ask. Works with zero
  configuration too — if no API key is set, the app tells you plainly and every
  other feature keeps working normally.
- **Automatic live crop & sugarcane tracking** — crops are scored against a
  phenology timeline purely from their planting date (sugar cane gets its own
  ~13-15 month Zimbabwe-realistic curve: germination → vegetative → flowering →
  maturing → harvest). Every time you open the Crops page you see days since
  planting, days to expected harvest, a progress bar, and a flag if the manually
  recorded stage has fallen behind what the model expects — with a one-click sync.
  No sensors required; it's driven by dates you already log.
- **Live weather** — real current conditions and a 4-day outlook for the farm's
  region, shown alongside the crops so rainfall/temperature context is right next
  to the plants it affects.
- **Income/Expense Ledger** — categorised transactions (cane sales, livestock sales,
  fertilizer, fuel, labour, veterinary, etc.), dual-currency (USD/ZiG) support,
  CSV export for an accountant or loan application.
- **Loan Manager** — loans from Agribank/AFC/CBZ-style lenders, repayment tracking,
  automatic status (active/repaid), due-date alerts.
- **Live livestock tracking** — cattle/goats by tag ID, health status, sales, notes.
- **Financial forecast** — linear-regression cash-flow projection (1–12 months
  ahead) over logged transactions, with rule-based alerts (declining trend,
  projected negative cash flow).
- **ROI analytics** — return on investment per crop/livestock enterprise (linking
  acquisition/planting cost and any tagged expenses against sale value and tagged
  income), plus a farm-wide ROI summary and best/worst performer.
- **Notifications** — always-on, rule-based alerts (loans due soon, stage
  mismatches, sick livestock) that need no AI configuration at all.
- **Farm Health Score** — a gamified 0-100 score computed live from your own
  data (cash flow, loan health, crop-tracking accuracy, livestock health),
  with level badges from "Needs Attention" to "Flourishing Farm". Shown on
  the dashboard with a full breakdown of what's driving the number.
- **Rainfall-aware Planting Advisor** — a Zimbabwe crop calendar
  cross-referenced against the live weather forecast, telling you what to
  plant this month vs. what opens up next month, plus a plain-language
  rain/dry-spell note. Rule-based, so it needs no AI configuration and never
  costs anything to run.
- **Community Marketplace** — a shared board (across every farmer using this
  deployment) to sell, buy, or barter produce, livestock, inputs, equipment
  and labour. Filter by category or deal type; mark your own listings
  fulfilled or delete them.
- **Community Knowledge Feed** — farm-to-farm tips, questions, pest/weather
  alerts, and success stories, with likes and threaded replies.
- **Admin panel** — manage user roles, and (as admin) toggle every page to a
  whole-farm view instead of just your own records.
- **Installable PWA basics** — manifest + icon so the app can be added to a
  phone's home screen from the browser.

## Architecture

```
agrifinance-app/
├── api/index.js          # Vercel serverless entry point (wraps the Express app)
├── vercel.json            # Vercel routing: /api/* -> serverless fn, /* -> static
├── server/
│   ├── app.js              # Express app: middleware + route mounting
│   ├── server.js            # Local dev entry point (npm start)
│   ├── db.js                 # Chooses MongoDB (Mongoose) or local JSON (lowdb)
│   ├── repo.js                # One async CRUD API used by every route, regardless
│   │                            of which storage backend is active
│   ├── models/                 # Mongoose schemas (User, Transaction, Loan, Crop,
│   │                            Livestock, Event)
│   ├── routes/                  # auth, users, transactions, loans, crops,
│   │                            livestock, forecast, roi, events, dashboard,
│   │                            assistant, weather, notifications, export
│   ├── middleware/auth.js         # JWT verification + admin-only guard
│   └── utils/
│       ├── analytics.js            # Linear regression forecast + ROI calculator
│       ├── growthModel.js           # Automatic crop/sugarcane growth-stage engine
│       ├── events.js                # Activity-log helper (powers live feeds)
│       └── seed.js                   # Demo data seeder (npm run seed)
└── public/                # Static frontend - plain HTML/CSS/JS, no build step
    ├── index.html / register.html      # Auth
    ├── dashboard.html                    # Overview + live activity feed + AI insights
    ├── ledger.html                        # Transactions + loans + CSV export
    ├── crops.html                          # Live tracking + weather + growth model
    ├── livestock.html                       # Live tracking
    ├── forecast.html / roi.html              # Analytics
    ├── admin.html                             # User management
    ├── manifest.json / favicon.svg             # PWA basics
    ├── css/style.css                            # Design system
    └── js/ (api.js, nav.js, chart.js,            # Fetch wrapper, nav, canvas charts,
           toast.js, modal.js, assistant.js)       # toasts, dialogs, AI chat widget
```

### Client ↔ server model

The `public/` folder is a pure static client: every page is plain HTML with a
`<script>` that calls the JSON API at `/api/...` via `public/js/api.js` (a thin
`fetch` wrapper that attaches the JWT from `localStorage`). The Express app in
`server/` is the single source of truth for data and business logic — the browser
never talks to a database directly. This is the same architecture in both local
development and the Vercel deployment; only how the server process is hosted
differs (`node server/server.js` locally vs. a serverless function on Vercel).

### Data storage — two modes, one API

`server/repo.js` exposes one async CRUD API (`create`, `list`, `findById`,
`updateById`, `removeById`) that every route file uses. Under the hood:

- **No `MONGODB_URI` set** → **local mode**: data lives in `server/data/db.json`
  via `lowdb`. Zero setup, perfect for running locally or for a diploma
  demonstration/marking session.
- **`MONGODB_URI` set** → **MongoDB mode**: Mongoose connects to MongoDB Atlas (or
  any MongoDB instance). Use this for the live Vercel deployment, since Vercel's
  filesystem is read-only/ephemeral in production and cannot persist a JSON file
  between requests.

"Live" tracking is implemented with a lightweight activity-event log
(`server/utils/events.js`) that every create/update writes to, and the dashboard
and crop/livestock pages poll every 8–15 seconds — this works identically on
Vercel's serverless functions, unlike a WebSocket/long-lived-connection approach.

## Enabling the AI Assistant

The floating chat widget and the dashboard's "Today's alerts & insights" panel
are powered by Claude via the Anthropic API. They need one thing to switch on:
an `ANTHROPIC_API_KEY` environment variable. Everything else in the app
(ledger, loans, crops, livestock, forecast, ROI, rule-based notifications)
works with zero AI configuration — the key only unlocks the assistant itself.

### 1. Get an API key

1. Go to **https://console.anthropic.com** and sign in (or create an account).
2. Open **Settings → API Keys** (or **Get API Keys** on the dashboard).
3. Click **Create Key**, give it a name (e.g. `agrifinance-dev`), and copy the
   value — it starts with `sk-ant-...` and is only shown once.
4. Anthropic's API is metered/pay-as-you-go, so you'll also need billing set
   up on the account (**Settings → Billing**) with at least a small credit
   balance. Chat + insight calls for this app are small (a few hundred tokens
   each), so typical local development and demo use costs very little.

### 2. Add the key — local development

1. If you haven't already, copy the example env file:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and uncomment/set the line:
   ```
   ANTHROPIC_API_KEY=sk-ant-your-real-key-here
   ```
3. Restart the server if it's running:
   ```bash
   npm start
   ```
4. Open the app, log in, and click the round chat button in the bottom-right
   corner. Ask it something like *"How's my sugar cane doing?"* — if it
   answers instead of showing a "not configured" message, it's working.

`.env` is already in `.gitignore`, so your real key never gets committed.

### 3. Add the key — Vercel deployment

1. In your Vercel project, go to **Settings → Environment Variables**.
2. Add a new variable:
   - **Key:** `ANTHROPIC_API_KEY`
   - **Value:** your `sk-ant-...` key
   - **Environments:** tick Production (and Preview/Development if you want
     the assistant working on preview deployments too)
3. Click **Save**, then **redeploy** the project (environment variable
   changes only take effect on the next deployment — Vercel will prompt you,
   or trigger one from the Deployments tab).
4. Open the live site and test the chat widget the same way as above.

### How to tell it's working vs. not configured

- **Not configured:** the chat widget replies with *"The AI assistant is not
  configured. Set ANTHROPIC_API_KEY on the server to enable it."* and the
  dashboard's insights panel simply shows nothing from the AI (the rule-based
  alerts like loan due dates still appear normally).
- **Working:** the chat widget gives a real, data-grounded answer about your
  crops/livestock/finances, and the dashboard insights panel may show 1-3
  short AI-generated observations alongside the rule-based ones.

### Troubleshooting

| Symptom | Likely cause |
|---|---|
| "Not configured" message even after setting the key | Server wasn't restarted (local) or project wasn't redeployed (Vercel) after adding the variable |
| 502 "could not respond right now" | Invalid key, no billing/credit on the Anthropic account, or a temporary API outage — check the server logs for the underlying error |
| Works locally but not on Vercel | The env var was only added to one environment (e.g. Development but not Production) — check it's ticked for the environment you're testing |
| Assistant answers seem generic / not using your data | Make sure you're logged in as the account that owns the crops/livestock/transactions you're asking about — each answer is scoped to the logged-in user (or the whole farm if you're an admin with "show whole-farm data" ticked) |

The same key also powers the optional AI insights on the dashboard
(`GET /api/assistant/insights`) — no separate setup needed, it uses the same
`ANTHROPIC_API_KEY`.

## Running locally

```bash
npm install
cp .env.example .env      # edit JWT_SECRET / ADMIN_INVITE_CODE if you like
npm run seed               # optional: creates demo admin + user accounts and sample data
npm start                   # http://localhost:3000
```

Demo accounts created by `npm run seed`:

| Role  | Email                    | Password   |
|-------|--------------------------|------------|
| Admin | owner@farm54.co.zw       | secret123  |
| User  | manager@farm54.co.zw     | secret123  |

Or just register your own account at `/register.html` — enter `FARM54-OWNER` (or
whatever you set `ADMIN_INVITE_CODE` to) in the "Admin invite code" field to create
the first admin account; leave it blank for a standard user account.

## Deploying to Vercel

1. Push this project to a GitHub repository.
2. In Vercel, "New Project" → import the repository. Vercel will detect
   `vercel.json` and configure the build automatically (no framework preset needed).
3. Set environment variables in the Vercel project settings:
   - `MONGODB_URI` — a MongoDB Atlas connection string (**required** in production —
     see note above on why local-JSON mode can't be used on Vercel)
   - `JWT_SECRET` — a long random string
   - `ADMIN_INVITE_CODE` — the code farm owners use to register as admin
4. Deploy. The static frontend is served from `/public`, and every `/api/*`
   request is routed to the Express app running as a serverless function
   (`api/index.js`).

## Thesis objectives → implementation

| Objective (Ch. 1.4) | Where it's met |
|---|---|
| System for farmers to manage accounts and data | JWT auth, `admin`/`user` roles, per-user data scoping (`server/middleware/auth.js`, `routes/auth.js`, `routes/users.js`) |
| Modules for tracking income, expenses and loans | `ledger.html` + `routes/transactions.js`, `routes/loans.js` |
| Track external factors that may affect the farm | Live crop stage/health tracking, field notes, and the activity feed surface on-the-ground events (`routes/crops.js`, `routes/livestock.js`, `utils/events.js`) |
| PWA / accessible, responsive web functionality | Responsive layout down to mobile (`public/css/style.css`), deployable as a standard responsive web app on Vercel |

Financial forecast and ROI analytics extend the original scope per Charles's
planned expansion notes (predictive analysis covering both yield and ROI/
profitability prediction).

## Notes & known limitations

- The ROI calculation attributes a transaction to a crop/livestock record only when
  it's explicitly linked via the "Enterprise" + "Linked record" fields when logging
  a transaction in the ledger — unlinked transactions count toward the farm total
  but not toward any single enterprise's ROI.
- "Live" tracking is poll-based (8–15s refresh), not push/WebSocket-based, so it
  works reliably on Vercel's serverless model without needing a persistent
  connection service.
- Local JSON mode is for development/demo only; switch to `MONGODB_URI` before
  relying on the app for real records, and before deploying to Vercel.
