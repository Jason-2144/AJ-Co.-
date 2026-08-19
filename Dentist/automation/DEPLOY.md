# Practice OS Automation — Deploy Guide

This one service replaces the entire n8n instance. **No Docker, nothing to install locally.**
You push to GitHub, connect the repo to a host, and it runs.

---

## What this service does

| Trigger | What runs |
|---|---|
| Mon 10:00 (cron) | Re-engagement campaign — messages patients lapsed 6+ months |
| Hourly (cron) | Appointment reminders at 72h / 24h / 2h |
| Wed 11:00 (cron) | Treatment follow-up — chases unbooked quoted treatments |
| Daily 18:00 (cron) | Rating requests to patients who visited today |
| Daily 09:00 (cron) | Claim/balance monitor — escalates by age |
| Incoming call | AI receptionist answers, books, escalates |
| Patient replies | Routed to the right product automatically |
| Website form | `POST /webhook/booking` |
| Kiosk widget | `POST /webhook/rating` |

All schedules are editable in `config/default.json` — no code changes needed.

---

## Step 1 — Push to GitHub

From the repo root:

```bash
git add automation
git commit -m "Add unified automation service (replaces n8n)"
git push
```

## Step 2 — Deploy on Railway (recommended)

Railway is usage-based and a service this small typically costs a few dollars a month.
Render works identically; its background worker tier starts at $7/mo.

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Pick your `Dentist` repo
3. Under **Settings → Root Directory**, enter `automation`
4. Railway auto-detects Node and runs `npm start`

## Step 3 — Set environment variables

In Railway: **Variables** tab → paste each of these. Values are in `.env.example`.

**Start with `DRY_RUN=true`.** Everything runs and logs, but nothing sends and nothing writes.
Watch the logs through one full cycle before switching it off.

Required for all clients:

```
DRY_RUN=true
APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=6a7eafe70004501c7bf7
APPWRITE_DATABASE_ID=6a7ebc0000056a68c221
APPWRITE_API_KEY=<your server-side key>
```

India clients (WhatsApp):
```
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=practice-os-verify
```

Houston clients (SMS) — also set `"channel": "sms"` in the config file:
```
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

AI receptionist (both markets):
```
OPENAI_API_KEY=
PUBLIC_HOSTNAME=<your-app>.up.railway.app
FRONT_DESK_WHATSAPP_NUMBER=
```

## Step 4 — Point the webhooks at your service

Once deployed you'll have a URL like `https://practice-abc.up.railway.app`.

**Meta (WhatsApp)** — Business Manager → WhatsApp → Configuration → Webhook:
- Callback URL: `https://your-app.up.railway.app/webhook/whatsapp`
- Verify token: whatever you set as `WHATSAPP_VERIFY_TOKEN`
- Subscribe to the `messages` field

**Twilio (voice)** — Console → Phone Numbers → your number → Voice Configuration:
- "A call comes in" → Webhook → `https://your-app.up.railway.app/voice` (HTTP POST)

**Twilio (SMS, Houston only)** — same number → Messaging Configuration:
- "A message comes in" → Webhook → `https://your-app.up.railway.app/webhook/sms` (HTTP POST)

**Website booking form** — point it at `https://your-app.up.railway.app/webhook/booking`

**Kiosk widget** — point it at `https://your-app.up.railway.app/webhook/rating`

## Step 5 — Test before going live

Check it's up:
```bash
curl https://your-app.up.railway.app/
```

Trigger any campaign manually instead of waiting for its cron slot:
```bash
curl -X POST https://your-app.up.railway.app/run/reengagement
curl -X POST https://your-app.up.railway.app/run/reminders
curl -X POST https://your-app.up.railway.app/run/followup
curl -X POST https://your-app.up.railway.app/run/ratings
curl -X POST https://your-app.up.railway.app/run/claims
```

With `DRY_RUN=true` these log exactly what *would* have been sent. Read the logs, confirm the
patient lists and message copy look right, **then** set `DRY_RUN=false` and redeploy.

---

## Onboarding a second practice

Deploy a **separate instance** per client rather than multi-tenanting one:

1. Copy `config/default.json` → `config/practice-name.json`
2. Edit the practice name, timezone, currency, channel, schedules, and message copy
3. Deploy a new Railway service from the same repo with `CLIENT_CONFIG=practice-name.json`
4. Give it its own Appwrite database (or project) and its own credentials

This keeps each practice's patient data fully isolated, which matters for anything
healthcare-adjacent — one client's misconfiguration can't leak another's data.

---

## Local development

```bash
cd automation
npm install
cp .env.example .env     # fill in what you need
npm run dry-run          # boots with DRY_RUN=true
npm run test:routes      # smoke-tests every endpoint
```

The smoke test boots the service, hits all 17 endpoints, and reports pass/fail without
sending anything.

---

## Troubleshooting

**Service won't start** — check the Railway logs. Missing env vars are named explicitly at boot.

**WhatsApp verification fails** — the token in Meta's form must match `WHATSAPP_VERIFY_TOKEN` exactly.

**Messages aren't sending in India** — templates must be pre-approved in Meta Business Manager
before they can be used. Names in `config/default.json` must match the approved template names.

**Marketing messages rejected for US numbers** — expected. Meta has blocked WhatsApp
marketing-category messages to US numbers since April 2025. Set `"channel": "sms"` for
Houston clients.

**Cron jobs not firing** — verify the timezone in your config file. Schedules run in that
timezone, not the server's.
