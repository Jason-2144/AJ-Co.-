# Houston Outreach — Phone Call Scripts

Phone-only, no Apollo. Every lead comes from `score_leads.py`, which already tells you the
opening line (`Pitch Angle` column) and why the lead is ranked where it is (`Flags`). This doc
gives you the rest of the call: what to say after the opener, common objections, and how to
close. Keep each call under 3 minutes — you're booking a 15-minute demo, not selling on the spot.

## Before you dial

Pull up the lead's row from the scored CSV. You already know:
- Their name and practice name
- Whether they have a website
- Their Google rating and review count
- Which product to lead with (`Primary Product` column)

Say the practice name early and naturally — "Hi, is this Bright Smile Dental?" — front desk
staff screen harder for calls that sound like a script.

---

## Opener by lead type

### No website (Product 7)
> "Hi, this is Jason calling — I run a small studio that builds websites for dental practices.
> I was looking up dentists in [area] and noticed [Practice Name] doesn't have one Google can
> find, which means anyone searching for a dentist near them right now is probably ending up on
> a competitor's site instead of yours. I can have one live with online booking in about a
> week — mind if I ask who handles that kind of thing for you?"

### Low rating (Product 6)
> "Hi, this is Jason — I noticed [Practice Name] is sitting around [X] stars on Google. Most
> practices don't realize how much that costs them until they see the numbers — patients
> compare ratings before they even call. I've got a system that automatically asks happy
> patients for a review right after their visit and catches unhappy ones privately before they
> post publicly. Worth a quick look?"

### Everything else / general bundle
> "Hi, this is Jason — I help dental practices in [area] automate the stuff that eats up front
> desk time: no-show reminders, insurance follow-up, patient recall. Most practices we work
> with recover a few thousand dollars a month they were losing to missed appointments and
> forgotten claims. Do you have 15 minutes this week to see how it'd work for your practice?"

---

## If they ask "how much does this cost?"

Don't quote the full bundle price cold — anchor low, on the specific pain point you opened with:

- Website: "Standalone it's $999 to build plus $49 a month for hosting — but if you're
  interested in more than just the site, it's part of a bundle that works out cheaper per
  product."
- Reputation: "It's $149 a month standalone."
- Full bundle: "All 8 tools together run $999 a month — most practices piecing together
  something similar from Weave, RevenueWell, and a marketing agency separately pay
  $2,000-5,000 a month for less."

Full pricing sheet: `pricing/AJCo_Dental_Pricing_2026.xlsx` (Houston TX Pricing tab).

## Common objections

**"We already have a website / use Weave / etc."**
> "Good to hear — how's it working for you? [Listen.] A lot of practices end up paying for
> three or four separate tools that don't talk to each other. Ours all feed one dashboard, so
> you're not jumping between five logins. Even if you keep what you have, happy to show you
> what's different — no pressure."

**"We're not looking for anything right now."**
> "Totally fair — mind if I send you a one-pager so you have it if that changes? Most people
> take a look when a slow month reminds them how much a missed appointment costs."
(Get an email or text number for the follow-up — this is a soft close, not a dead end.)

**"How do I know this actually works?"**
> Lead with a proof point that matches their situation:
> - Re-engagement: "One practice recovered ₹80,000 in a single week just messaging lapsed
>   patients."
> - No-show: "Filling one cancelled slot from the waitlist recovers about ₹400 in lost revenue
>   — it adds up fast at scale."
> - Insurance: "We caught ₹1.8L in forgotten claims for one practice in a month."
> (Use the Houston-equivalent dollar figures from `pricing/AJCo_Dental_Pricing_2026.xlsx` if
> you've localized the proof points — flag if you want me to convert these.)

## Closing every call

Always end with a specific next step, never "I'll follow up":
> "Can I grab 15 minutes on your calendar Thursday or Friday to show you exactly how this would
> work for [Practice Name]?"

Log the outcome in the scored CSV (add a `Call Outcome` column) so you're not re-calling the
same lead twice: `booked demo`, `callback requested`, `not interested`, `no answer`, `voicemail`.

---

## Call cadence

- **No answer / voicemail**: try again in 2-3 days, different time of day (front desks are
  slammed 9-11am and 2-4pm — try late morning or right before close).
- **"Not now"**: follow up in 60 days, not never. Practices' priorities shift.
- **"Send info"**: text/email same day while the conversation is fresh, then call back in a week.
