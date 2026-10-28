# SHL — سهل | Premium Car Rental Platform

Starter project for the SHL car-rental platform. The current build includes a polished Arabic RTL responsive UI, sample catalog pages, search/filter UI, and a first-pass Supabase/PostgreSQL schema.

## Current implementation status

### Included
- React + TypeScript + Vite + Tailwind CSS v4 scaffold.
- Arabic RTL visual system and responsive layouts.
- Home, catalog, car details, login placeholder, and 404 routes.
- Client-side catalog filtering and price sorting against clearly labeled demo records.
- Motion effects respect reduced-motion preferences.
- Supabase client bootstrap from public environment variables.
- Initial PostgreSQL migration with core entities, indexes, role helper, exclusion constraint for overlapping bookings, and initial RLS policies.

### Not production-ready yet
- Login form deliberately does not authenticate users yet.
- Demo car data and sample prices are not real availability or offers.
- Booking creation must be moved to a trusted RPC/server flow that validates price and availability transactionally.
- Admin UI and secure one-time admin bootstrap are not implemented.
- Payment providers, OTP/SMS, email notifications, refunds, and identity verification require real provider setup.
- Review all RLS policies and test them in a dedicated Supabase project before deployment. The migration is a foundation, not a security certification.

## Requirements
- Node.js 20.19+ or 22.12+
- npm
- A Supabase project for backend integration (optional for viewing the UI)

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

To configure Supabase, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`. These are public browser settings; never add a `service_role` key or admin secret to any `VITE_*` variable.

## Build

```bash
npm run build
```

## Database setup
1. Create a fresh Supabase project.
2. Review `database/migrations/001_initial_schema.sql`.
3. Apply it in Supabase SQL Editor or via the Supabase CLI.
4. Configure Storage buckets and policies for car images.
5. Configure Supabase Auth providers and allowed redirect URLs.
6. Test RLS as anonymous, customer, and each staff role before using real customer data.

## Admin bootstrap security
The initial admin identifier/secret supplied in the project brief must not be hard-coded in source control or frontend bundles. Build a one-time server-side bootstrap procedure, verify it with an operator-controlled secret stored in deployment environment, create the first admin, require credential rotation, then disable bootstrap. Never grant a role because a user merely knows a phone number.

## Currency and pricing
Prices shown in the demo UI are illustrative MRU values. Production pricing must be calculated server-side from database values using decimal/numeric types, with taxes/fees/discounts validated by trusted code.

## Deployment checklist
- [ ] Set production environment variables in hosting provider.
- [ ] Enable HTTPS and configure exact allowed origins.
- [ ] Configure Supabase Auth redirect URLs.
- [ ] Apply and test RLS policies.
- [ ] Add storage bucket policies and image size/type validation.
- [ ] Implement transactional booking creation and server-enforced status transitions.
- [ ] Implement payment webhooks with signature verification and idempotency.
- [ ] Configure rate limits, monitoring, backups, and alerting.
- [ ] Replace demo data with real database queries.
- [ ] Run authorization and concurrent-booking tests.
