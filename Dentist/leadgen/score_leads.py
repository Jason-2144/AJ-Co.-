#!/usr/bin/env python3
"""
Lead scorer for Place Scout exports.

Takes the CSV that Place Scout's "Export CSV" button produces (Name, Website,
Phone, Address, Rating, Review Count — see place-scout app.tsx handleExport)
and scores each business against AJ & Co.'s 8 dental products, using only
what Google Places already told us. No Apollo credits spent here — this is
the free filtering pass that decides WHO is worth spending a credit on.

Usage:
    python score_leads.py leads.csv                  # writes leads_scored.csv
    python score_leads.py leads.csv --top 30          # only keep the best 30
    python score_leads.py leads.csv --min-priority 40 # drop weak leads

Scoring logic (see SCORING NOTES at bottom of this file for the full rationale):
  - No website          -> strong Product 7 (Website + Booking) lead
  - No phone number      -> heavily deprioritized (can't cold-call a lead you can't reach)
  - Rating 3.0-4.2 w/ 10+ reviews -> strong Product 6 (Reputation) lead
  - Rating >= 4.6 w/ 100+ reviews -> deprioritized (already excelling, hard sell)
  - Low review count (<15) at any rating -> weak digital footprint -> general
    prospect for the full bundle, not just one product
  - Everything else scores as a general-bundle prospect (Products 1/2/3/5/8
    can't be individually inferred from Places data alone — they're pitched
    as "you probably have this problem too" add-ons, not the opener)
"""

import argparse
import csv
import sys


def score_lead(row: dict) -> dict:
    name = (row.get("Name") or "").strip()
    website = (row.get("Website") or "").strip()
    phone = (row.get("Phone") or "").strip()
    address = (row.get("Address") or "").strip()
    rating_raw = (row.get("Rating") or "").strip()
    reviews_raw = (row.get("Review Count") or "").strip()

    has_website = bool(website) and website.lower() != "no website"
    has_phone = bool(phone) and phone.lower() != "unavailable"

    try:
        rating = float(rating_raw) if rating_raw else None
    except ValueError:
        rating = None
    try:
        review_count = int(reviews_raw) if reviews_raw else None
    except ValueError:
        review_count = None

    priority = 0
    primary_product = "Full Bundle"
    pitch_angle = "General intro — lead with the ROI proof points, no specific product hook available."
    flags = []

    # --- Reachability gate: no phone = can't act on this lead at all ---
    if not has_phone:
        priority -= 40
        flags.append("no phone listed")

    # --- Product 7: Website + Booking ---
    if not has_website:
        priority += 50
        primary_product = "Product 7 — Website + Booking"
        pitch_angle = (
            f"\"{name}\" has no website Google can find. Open with: "
            "\"I noticed you don't have a website patients can book through — "
            "we can have one live with online booking in about a week.\""
        )
        flags.append("no website")

    # --- Product 6: Reputation ---
    if rating is not None and review_count is not None:
        if 3.0 <= rating <= 4.2 and review_count >= 10:
            # Only override the website pitch if reputation is the stronger signal
            # (a practice with no site AND a reputation problem — lead with reputation,
            # since a bad rating actively costs them new patients searching right now).
            priority += 45
            primary_product = "Product 6 — Reputation"
            pitch_angle = (
                f"\"{name}\" sits at {rating}★ across {review_count} reviews. Open with: "
                "\"I noticed your Google rating has room to grow — we have a system "
                "that turns your happy patients into 5-star reviews automatically, "
                "while catching unhappy ones before they post publicly.\""
            )
            flags.append(f"rating {rating} ({review_count} reviews) — reputation opportunity")
        elif rating >= 4.6 and review_count >= 100:
            priority -= 20
            flags.append(f"rating {rating} ({review_count} reviews) — already excelling, harder sell")
        elif review_count < 15:
            priority += 10
            flags.append(f"only {review_count} reviews — thin digital footprint")

    if rating is None or review_count is None:
        flags.append("no rating data (re-run Place Scout search after the rating/review-count fix)")

    if not address:
        flags.append("no address")

    priority = max(0, min(100, priority + 20))  # baseline 20, clamp 0-100

    return {
        "Name": name,
        "Priority": priority,
        "Primary Product": primary_product,
        "Pitch Angle": pitch_angle,
        "Flags": "; ".join(flags),
        "Website": website or "None",
        "Phone": phone or "None",
        "Rating": rating if rating is not None else "",
        "Review Count": review_count if review_count is not None else "",
        "Address": address,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("input_csv", help="CSV exported from Place Scout")
    parser.add_argument("-o", "--output", help="Output CSV path (default: <input>_scored.csv)")
    parser.add_argument("--top", type=int, help="Only keep the top N leads by priority")
    parser.add_argument("--min-priority", type=int, default=0, help="Drop leads below this priority score")
    args = parser.parse_args()

    output_path = args.output or args.input_csv.rsplit(".", 1)[0] + "_scored.csv"

    with open(args.input_csv, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        missing = {"Name", "Website", "Phone", "Address"} - set(reader.fieldnames or [])
        if missing:
            print(f"ERROR: input CSV is missing expected columns: {missing}", file=sys.stderr)
            print(f"Found columns: {reader.fieldnames}", file=sys.stderr)
            sys.exit(1)
        rows = list(reader)

    scored = [score_lead(r) for r in rows]
    scored = [r for r in scored if r["Priority"] >= args.min_priority]
    scored.sort(key=lambda r: r["Priority"], reverse=True)

    if args.top:
        scored = scored[: args.top]

    fieldnames = ["Priority", "Name", "Primary Product", "Pitch Angle", "Flags",
                  "Website", "Phone", "Rating", "Review Count", "Address"]
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(scored)

    by_product = {}
    for r in scored:
        by_product[r["Primary Product"]] = by_product.get(r["Primary Product"], 0) + 1

    print(f"Scored {len(rows)} leads -> kept {len(scored)} -> {output_path}\n")
    print("Breakdown by primary product:")
    for product, count in sorted(by_product.items(), key=lambda x: -x[1]):
        print(f"  {count:4d}  {product}")
    print(f"\nTop 5 leads:")
    for r in scored[:5]:
        print(f"  [{r['Priority']:3d}] {r['Name']} — {r['Primary Product']}")


if __name__ == "__main__":
    main()


# ============================================================================
# SCORING NOTES
# ============================================================================
# This is deliberately simple and explainable — every point on the priority
# score traces back to a real Google Places field, not a black-box model.
# That matters because you (Jason) need to be able to look at any lead and
# understand WHY it's ranked where it is, since you're the one making the
# actual sales call.
#
# What this script CANNOT tell you (needs Apollo or manual research):
#   - Owner/decision-maker name and direct contact
#   - Practice size (number of dentists/chairs)
#   - Whether they already use a competitor tool (Weave, RevenueWell, etc.)
#   - Email address
#
# That's the handoff point to Apollo: run this script first, take only the
# top N (by --top) into Apollo's organization/people search, and you'll spend
# credits only on leads already pre-qualified by a real signal instead of
# spending 1 credit per practice blind.
# ============================================================================
