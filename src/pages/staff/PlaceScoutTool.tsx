import React from 'react';
import ExternalToolEmbed from '../../components/staff/ExternalToolEmbed';

/**
 * This page used to contain a from-scratch reimplementation of Place Scout
 * with a hardcoded Google Maps API key and mock search results (setTimeout
 * returning three fake clinics). That's been replaced with a real embed of
 * the actual Place Scout app so there's exactly one copy of the tool.
 *
 * Until Place Scout is deployed and VITE_PLACE_SCOUT_URL is set, this will
 * show an honest "not connected yet" state instead of fake search results.
 */
export default function PlaceScoutTool() {
  return (
    <ExternalToolEmbed
      title="Place Scout — Google Maps Lead Finder"
      url={import.meta.env.VITE_PLACE_SCOUT_URL}
      envVarName="VITE_PLACE_SCOUT_URL"
      description="This embeds the real Place Scout tool (Google Maps API search, rating/review scoring, Apollo enrichment)."
    />
  );
}
