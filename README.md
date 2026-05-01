# Marner Finances

A personal monthly-finance planner. Tracks bills, paid status, projected balance after outstanding costs, and includes a UK 2026/27 take-home pay calculator (PAYE, NI, student loans, pension treatments, Scottish bands, K codes, the £100k taper).

Stack: **Next.js 15 (App Router) · React 19 · Supabase Postgres · TypeScript**.

Theme: Insight (EMCC) dark.

**Single-user mode** — no auth, no login screen. The Supabase anon key in Vercel env vars is the only gate. If you want privacy on the public URL, add Vercel Password Protection (one toggle in Vercel project settings).

---

## Hub-friendly by design

Everything lives in a dedicated **`marner` Postgres schema**, so you can drop this into a Supabase project that already hosts other apps without colliding. The migration is idempotent — re-running it is a no-op.

---

## Setup

### 1. Clone & install

```bash
git clone <your-repo-url> marner-finances
cd marner-finances
npm install
```

### 2. Create a Supabase project (or reuse one)

Anything on the free tier works.

### 3. Run the migration

In the Supabase SQL Editor, paste the contents of:

```
supabase/migrations/20260501000000_marner_init.sql
```

…and run it. It's wrapped in a transaction and guarded with `if not exists` everywhere.

### 4. Expose the `marner` schema

Supabase dashboard → **Settings → API → Exposed schemas** → add `marner` → save.

Without this PostgREST hides the schema and the JS client can't reach it.

### 5. Environment variables

```bash
cp .env.example .env.local
```

Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from Settings → API>
```

### 6. Run

```bash
npm run dev
```

Open <http://localhost:3000>.

---

## Deploying to Vercel

```bash
vercel
```

Set the same two env vars in Vercel (Project → Settings → Environment Variables).

**Optional: lock down the public URL** — Vercel → Project → Settings → Deployment Protection → Password Protection → set a password. That's it. No auth code needed.

---

## Project structure

```
marner-finances/
├── supabase/migrations/      ← idempotent SQL
└── src/
    ├── app/
    │   ├── layout.tsx, globals.css
    │   └── page.tsx          ← single page, all tabs
    ├── components/           ← App, Bills, PayCalculator, DataTab, Header
    └── lib/
        ├── supabase/         ← browser client
        ├── tax/              ← UK 2026/27 calc engine
        └── store/            ← Supabase data layer
```

The tax engine in `src/lib/tax/` has zero React dependencies. Tax-year constants are isolated in `constants.ts`; April 2027 = one file edit.

---

## Tax engine notes

- **Tax codes**: `1257L` and other numeric forms, `BR`, `D0`, `D1`, `D2`, `NT`, `0T`, and `K` codes.
- **Pension treatments**: salary sacrifice (reduces both tax & NI base), net pay (reduces tax base only), relief at source (deducted from net).
- **Student loans**: Plans 1, 2, 4, 5 + Postgrad with correct stacking.
- **Regions**: rUK and Scottish bands.
- **PA taper**: handled — 60% effective marginal between £100k–£125,140.

Estimates only. Don't fire HMRC.

---

## Wiping it

Bottom of the migration file there's a commented `drop schema marner cascade` block. Uncomment, run, gone.

---

## Licence

MIT.
