/**
 * Thin wrapper around the Google Places API (New) for the one thing the
 * Reputation product needs: the practice's live rating, review count, and a
 * working "write a review" deep link.
 *
 * Uses the same Google Maps Platform key as Place Scout (aloo) — Places API
 * must be enabled for that key's project.
 */

import { env, config } from './env.js';

const PLACES_BASE = 'https://places.googleapis.com/v1';

/**
 * Resolves a place_id from a free-text query ("Dr Cynthia's DENTIPEDIA
 * Pediatric & Family Dental Clinic, Chennai") using Text Search. Only needs
 * to run once per client — the caller should cache the result in config or
 * Appwrite instead of re-searching on every sync.
 */
export async function findPlaceId(textQuery) {
  if (!env.GOOGLE_MAPS_API_KEY) throw new Error('GOOGLE_MAPS_API_KEY is not set');
  if (!textQuery) throw new Error('findPlaceId requires a search query');

  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': env.GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
    },
    body: JSON.stringify({ textQuery, maxResultCount: 1 }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Places searchText ${res.status}: ${json.error?.message || 'lookup failed'}`);

  const place = json.places?.[0];
  if (!place) throw new Error(`No Google Maps place found for "${textQuery}"`);
  return place;
}

/** Fetches rating + review count for a known place_id via Place Details. */
export async function getPlaceRating(placeId) {
  if (!env.GOOGLE_MAPS_API_KEY) throw new Error('GOOGLE_MAPS_API_KEY is not set');
  if (!placeId) throw new Error('getPlaceRating requires a place_id');

  const res = await fetch(`${PLACES_BASE}/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': env.GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': 'id,displayName,rating,userRatingCount',
    },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Places details ${res.status}: ${json.error?.message || 'lookup failed'}`);

  return {
    placeId: json.id,
    displayName: json.displayName?.text || null,
    rating: json.rating ?? null,
    userRatingCount: json.userRatingCount ?? null,
  };
}

/** Builds a direct "write a review" link from a resolved place_id. */
export function buildReviewLink(placeId) {
  return `https://search.google.com/local/writereview?placeid=${placeId}`;
}

/**
 * Resolves this client's place_id, preferring a cached value in config
 * (googlePlaceId) over re-searching by text every time.
 */
export async function resolveClientPlaceId() {
  const cached = config?.googlePlaceId;
  if (cached) return cached;

  const query = config?.googlePlaceQuery || config?.practiceName;
  const place = await findPlaceId(query);
  console.log(`[googlePlaces] Resolved "${query}" -> place_id ${place.id} (${place.displayName?.text}). Consider caching this as "googlePlaceId" in the client config to skip future lookups.`);
  return place.id;
}
