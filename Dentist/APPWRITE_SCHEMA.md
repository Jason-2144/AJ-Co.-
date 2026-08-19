# Appwrite Schema — Practice OS Shared Backend

One Appwrite project, one database (`practice_os`), shared by all 8 n8n workflows and read directly by the dashboard. Create these collections with permission `read: any` (or scoped to your team) and `write: role:api-key` (server-side only, written by n8n).

**Project details (already provisioned):**
- Endpoint: `https://sgp.cloud.appwrite.io/v1`
- Project ID: `6a7eafe70004501c7bf7`
- Project name: `DENTIST`
- Database ID (convention used throughout, create it under this ID): `practice_os`

Use these same values for every n8n workflow's `APPWRITE_ENDPOINT` / `APPWRITE_PROJECT_ID` / `APPWRITE_DATABASE_ID` environment variables, plus a server-side API key (Appwrite console → Overview → Integrations → API keys, with write scope on all 8 collections below) as `APPWRITE_API_KEY`. The dashboard itself only needs `read: any` permissions — it connects with the project ID alone, no API key (see `src/lib/appwrite.ts`).

**Convention: use natural keys as the Appwrite document `$id`.** This turns every "update" step in n8n from a look-up-then-update into a direct PATCH by ID — no query needed, no risk of matching the wrong row.

| Collection ID | Natural key used as `$id` | Attributes |
|---|---|---|
| `reengagement_log` | auto-generated (append-only) | patient_id (string), name (string), phone (string), months_lapsed (integer), sent_at (datetime), status (string: sent/booked/referral_sent/no_response) — each event (sent, then booked/referral/no-response) is its own row so weekly repeats never collide; the dashboard reads the most recent status per patient by `sent_at` |
| `calls_log` | auto-generated (append-only) | patient_name (string), phone (string), channel (string: phone/whatsapp), type (string: scheduling/support/conversion/escalation), summary (string), handled_at (datetime), missed (boolean) |
| `appointments` | `appointment_id` (or generated for website/treatment-sourced bookings) | source (string: phone/whatsapp/website/treatment_followup), patient_name (string), phone (string), reason (string), preferred_day_time (string), appointment_datetime (datetime, nullable until confirmed), status (string: pending_confirmation/confirmed/cancelled), no_show_count (integer) |
| `waitlist_offers` | auto-generated | patient_id (string), phone (string), offered_at (datetime), status (string: offered/filled) |
| `pending_treatments` | `patient_id` | name, phone, treatment, quoted_price (integer), follow_up_count (integer), status (string: pending/booked/declined/logged_and_closed) |
| `ratings` | auto-generated (append-only) | phone, name, rating (integer 1-5), outcome (string: sent_to_google/escalated_to_manager), logged_at (datetime) |
| `claims` | `claim_id` | patient_name, insurer, amount (integer), submitted_date (datetime), status (string: pending/paid/denied), days_since_submitted (integer), tier (string) |
| `revenue_recovered` | auto-generated (append-only) | claim_id, amount (integer), recovered_at (datetime) — captured but not yet wired into a dashboard card |
| `completed_visits` | `patient_id` | name, phone, visit_datetime, treatment, rating_requested (string: yes/no) — feeds the rating-request workflow, not read directly by the dashboard |
| `reminder_log` | auto-generated (append-only) | appointment_id, patient_id, reminder_window, is_chronic_no_show (boolean), sent_at — audit trail, not read directly by the dashboard |
| `practice_stats` | `"current"` (single row per deployed client) | google_place_id, display_name, rating (float), review_count (integer), review_link (string), synced_at (datetime) — written hourly by `syncGoogleRating()` via the Places API; only populated when `products.reputation.googleRatingSync: true` in the client config |

## Which dashboard card reads which collection

| Card | Reads | Notes |
|---|---|---|
| Re-Engagement Agent | `reengagement_log`, filter `sent_at >= today` | count + last 3 by status |
| AI Receptionist | `calls_log`, filter `handled_at >= today` | **new** — nothing logged calls before this integration; see Product 2 update |
| No-Show Recovery | `appointments`, filter `appointment_datetime` today, `status` | confirmation rate = confirmed / (confirmed + pending) |
| Treatment Follow-Up | `pending_treatments` | count pending, outreach progress = follow_up_count > 0 / total |
| Reputation Agent | `ratings` (our own captured ratings, filter `logged_at >= 7 days ago`) + `practice_stats/current` (live Google rating/review count, if sync is enabled) | two different numbers, see note below |
| Website & Booking | `appointments`, filter `source = website`, `created_at >= today` | bookings-made-today only; live visitors / traffic source are **not** covered — see note below |
| Insurance Agent | `claims`, filter `status = pending` | sum(amount) for open claims total, count where `tier = urgent_forgotten` |
| Practice Dashboard | — | **not covered by any of the 8 products** — see note below |

## Gaps — need a separate integration beyond the 8 products built

1. **Practice Dashboard card** (today's revenue, chairs occupied, avg wait time) — this is live PMS/ops data, not something any of the 8 WhatsApp/voice/web products produce. Needs a direct PMS API integration (Dentrix/Curve/OpenDental) or manual entry. Left as-is (mock) for now.
2. ~~**Reputation Agent's live Google star rating**~~ — **solved**, without Google Business Profile API (which requires the client to grant OAuth ownership access to their listing — too much friction to ask of every dentist we onboard). Instead `syncGoogleRating()` uses the **Places API (New)** — same Google Maps Platform key as Place Scout — which reads any public place's rating/review count with no ownership verification needed. Runs hourly, writes to `practice_stats/current`. Enable per client via `products.reputation.googleRatingSync: true` + `GOOGLE_MAPS_API_KEY` env var. Our `ratings` collection is still a separate, complementary number: patient responses to *our own* post-visit prompt (a leading indicator), not Google's public score.
3. **Website & Booking's live visitors / top traffic source** — needs a real analytics tool (Plausible, GA4) wired into the website from Product 7. Bookings-made-today is covered; visitor counts are not.
