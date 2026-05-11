# CARBONEX Portal — Setup Guide

> CARBONEX VENTURES SDN. BHD. — 碳索未来

This guide covers everything you need to go from a fresh clone to a fully running portal.

---

## 1. Prerequisites

- A **Supabase** project (free tier is fine to start)
- A **Google Gemini API key** (for AI receipt scanning in Staff Claim)
- An **EmailJS** account (for email notifications)
- A static file host: Netlify, Vercel, GitHub Pages, or any web server

---

## 2. Add the Carbonex Logo

Place the Carbonex Ventures Sdn. Bhd. logo file at the **root** of this repository:

```
carbonex/
  logo.png      ← put the logo here
  index.html
  po/
  cashclaim/
  ...
```

The logo is referenced as `logo.png` (root pages) and `../logo.png` (module pages).

---

## 3. Supabase Setup

### 3.1 Create a new Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Note your **Project URL** and **anon public key** from Settings → API

### 3.2 Replace credentials in all files

Search for `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY` and replace in:

| File | Occurrences |
|------|-------------|
| `index.html` | 1 each |
| `po/index.html` | 1 each |
| `cashclaim/index.html` | 1 each |
| `staffclaim/index.html` | 1 each |
| `leave/index.html` | 1 each |

### 3.3 Run the SQL schema

Go to Supabase → SQL Editor and run the following:

```sql
-- ============================================================
-- CARBONEX VENTURES SDN. BHD. — Database Schema
-- ============================================================

-- Staff directory (used by Leave & Staff Claim for auto-fill)
CREATE TABLE IF NOT EXISTS staff (
  id          BIGSERIAL PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  department  TEXT,
  position    TEXT,
  phone       TEXT,
  join_date   DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS po_logs (
  id              BIGSERIAL PRIMARY KEY,
  po_number       TEXT UNIQUE NOT NULL,   -- CBX-PO-YYYYMMDD-XX
  requester_email TEXT NOT NULL,
  requester_name  TEXT,
  vendor_name     TEXT,
  vendor_contact  TEXT,
  vendor_email    TEXT,
  category        TEXT,
  items           JSONB DEFAULT '[]',     -- [{desc, qty, unit, price}]
  subtotal        NUMERIC(12,2),
  tax             NUMERIC(12,2),
  total           NUMERIC(12,2),
  currency        TEXT DEFAULT 'MYR',
  notes           TEXT,
  status          TEXT DEFAULT 'Pending', -- Pending | Approved | Rejected | Ordered | Received
  approved_by     TEXT,
  approver_note   TEXT,
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Cash Claims
CREATE TABLE IF NOT EXISTS cash_claims (
  id              BIGSERIAL PRIMARY KEY,
  claim_number    TEXT UNIQUE NOT NULL,   -- CBX-CC-YYYYMMDD-XX
  claimant_email  TEXT NOT NULL,
  claimant_name   TEXT,
  department      TEXT,
  claim_date      DATE,
  items           JSONB DEFAULT '[]',     -- [{description, qty, unit_price}]
  total_amount    NUMERIC(12,2),
  currency        TEXT DEFAULT 'MYR',
  purpose         TEXT,
  notes           TEXT,
  status          TEXT DEFAULT 'Pending', -- Pending | Approved | Rejected | Paid
  approved_by     TEXT,
  approver_note   TEXT,
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Staff Claims (with AI receipt scanning)
CREATE TABLE IF NOT EXISTS staff_claims (
  id              BIGSERIAL PRIMARY KEY,
  claim_number    TEXT UNIQUE NOT NULL,   -- CBX-SC-YYYYMMDD-XX
  claimant_email  TEXT NOT NULL,
  claimant_name   TEXT,
  department      TEXT,
  items           JSONB DEFAULT '[]',     -- [{vendor, amount, project, remarks}]
  total_amount    NUMERIC(12,2),
  currency        TEXT DEFAULT 'MYR',
  notes           TEXT,
  status          TEXT DEFAULT 'Pending', -- Pending | Approved | Rejected | Paid
  approved_by     TEXT,
  approver_note   TEXT,
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Leave System
CREATE TABLE IF NOT EXISTS logs (
  id              BIGSERIAL PRIMARY KEY,
  email           TEXT NOT NULL,
  name            TEXT,
  leave_type      TEXT NOT NULL,          -- Annual | Sick | Hospitalization | Maternity | Paternity | Compassionate | Unpaid
  duration        TEXT DEFAULT 'full',    -- full | half_am | half_pm
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  days            NUMERIC(4,1) NOT NULL,
  reason          TEXT,
  year            INT,
  status          TEXT DEFAULT 'Pending', -- Pending | Approved | Rejected | Cancelled
  approved_by     TEXT,
  approver_note   TEXT,
  applied_at      TIMESTAMPTZ DEFAULT NOW(),
  approved_at     TIMESTAMPTZ
);

-- Settings / configuration (optional)
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_po_logs_email   ON po_logs(requester_email);
CREATE INDEX IF NOT EXISTS idx_po_logs_status  ON po_logs(status);
CREATE INDEX IF NOT EXISTS idx_cc_email        ON cash_claims(claimant_email);
CREATE INDEX IF NOT EXISTS idx_sc_email        ON staff_claims(claimant_email);
CREATE INDEX IF NOT EXISTS idx_logs_email      ON logs(email);
CREATE INDEX IF NOT EXISTS idx_logs_year       ON logs(year);
CREATE INDEX IF NOT EXISTS idx_logs_status     ON logs(status);
```

### 3.4 Row Level Security (RLS)

Enable RLS on all tables in Supabase → Authentication → Policies, then apply:

```sql
-- Enable RLS
ALTER TABLE staff       ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings    ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own records; admins can see all
-- Simple policy: authenticated users can access all (tighten as needed)
CREATE POLICY "auth_all" ON po_logs      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON cash_claims  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON staff_claims FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON logs         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON staff        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON settings     FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### 3.5 Auth settings

In Supabase → Authentication → Settings:
- Enable **Email** provider
- Set **Site URL** to your deployed domain (e.g. `https://portal.carbonexventures.com`)
- Add redirect URLs if using magic links

---

## 4. Admin Emails

In each module's `index.html`, find and update the `ADMIN_EMAILS` array:

```javascript
const ADMIN_EMAILS = ['admin@carbonexventures.com'];
```

Add all email addresses that should have admin/approval access.

### 4.1 PO Approver Map (po/index.html)

Update `APPROVER_MAP` with your approvers' initials:

```javascript
const APPROVER_MAP = {
  'admin@carbonexventures.com': 'ADM',
  'manager@carbonexventures.com': 'MGR',
};
```

### 4.2 Company details (po/index.html)

Update the `CO` object:

```javascript
const CO = {
  name: 'CARBONEX VENTURES SDN. BHD.',
  reg:  '202X-XXXXXX (XXXXXXX-X)',   // SSM registration number
  email: 'admin@carbonexventures.com',
  address: 'Your Full Address, Postcode, City, State',
  tel: '+60 X-XXXX XXXX'
};
```

---

## 5. Gemini API (AI Receipt Scanning)

In `staffclaim/index.html`, replace:

```javascript
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY';
```

Get your key at [aistudio.google.com](https://aistudio.google.com) → Get API Key.
The free tier supports generous usage for receipt scanning.

---

## 6. EmailJS (Email Notifications)

EmailJS sends notifications when claims/POs are submitted or approved.

1. Create account at [emailjs.com](https://www.emailjs.com)
2. Add an **Email Service** (Gmail, Outlook, etc.)
3. Create **Email Templates** for:
   - Submission confirmation (to claimant)
   - Approval/rejection notification (to claimant)
   - New submission alert (to admin)
4. In each `index.html`, replace:

```javascript
const EMAILJS_SERVICE  = 'YOUR_EMAILJS_SERVICE_ID';
const EMAILJS_TEMPLATE = 'YOUR_EMAILJS_TEMPLATE_ID';
const EMAILJS_KEY      = 'YOUR_EMAILJS_PUBLIC_KEY';
```

---

## 7. Staff Records

Leave balance and Staff Claim auto-fill require a staff record in the `staff` table.
Insert records for each employee:

```sql
INSERT INTO staff (email, name, department, position, join_date)
VALUES
  ('alice@carbonexventures.com', 'Alice Tan', 'Operations', 'Manager', '2022-03-01'),
  ('bob@carbonexventures.com',   'Bob Lee',   'Sales',       'Executive', '2023-06-15');
```

Or build an admin UI entry form as a future enhancement.

---

## 8. Deployment

### Option A — Netlify (recommended)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy from repo root
netlify deploy --prod --dir .
```

Or connect the GitHub repo in Netlify UI → it auto-deploys on push.

### Option B — Vercel

```bash
npx vercel --prod
```

### Option C — GitHub Pages

1. Go to repo Settings → Pages
2. Set source to branch `main` (or your production branch), folder `/root`
3. Your site will be at `https://hiufsitake.github.io/carbonex/`

### Option D — Any static host / nginx

Copy all files to your web root. No build step needed — this is plain HTML/CSS/JS.

---

## 9. Module Summary

| Module | URL Path | DB Table | Number Format |
|--------|----------|----------|---------------|
| Portal Login | `/` | — | — |
| Purchase Orders | `/po/` | `po_logs` | `CBX-PO-YYYYMMDD-XX` |
| Cash Claim | `/cashclaim/` | `cash_claims` | `CBX-CC-YYYYMMDD-XX` |
| Staff Claim | `/staffclaim/` | `staff_claims` | `CBX-SC-YYYYMMDD-XX` |
| Leave System | `/leave/` | `logs` | Integer ID |

---

## 10. Leave Entitlements (Malaysian Employment Act)

| Years of Service | Annual Leave | Medical Leave |
|-----------------|-------------|---------------|
| < 2 years | 12 days | 14 days |
| 2–4 years | 16 days | 18 days |
| ≥ 5 years | 18 days | 18 days |

Hospitalisation leave: 60 days/year (in addition to medical leave).
Carry-forward: max 5 days from previous year (enabled from 2025 cycle onwards).

---

## 11. Security Notes

- Never commit real API keys or Supabase credentials to git
- Use environment variables or a `.env` file (excluded from git) if using a build tool
- For production, restrict Supabase RLS policies to enforce per-user data access
- The `ADMIN_EMAILS` array is client-side only — use Supabase RLS for true server-side authorization

---

## 12. Credentials Checklist

- [ ] `SUPABASE_URL` replaced in all 5 HTML files
- [ ] `SUPABASE_ANON_KEY` replaced in all 5 HTML files
- [ ] `GEMINI_API_KEY` replaced in `staffclaim/index.html`
- [ ] `EMAILJS_SERVICE`, `EMAILJS_TEMPLATE`, `EMAILJS_KEY` replaced where used
- [ ] `CO` object (company details) updated in `po/index.html`
- [ ] `ADMIN_EMAILS` updated in all module files
- [ ] `logo.png` uploaded to repo root
- [ ] SQL schema run in Supabase
- [ ] Staff records inserted in `staff` table
- [ ] Supabase Auth Site URL set to deployed domain
