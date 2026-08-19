export interface PlaceResult {
  id: string;
  displayName?: string | null;
  formattedAddress?: string | null;
  nationalPhoneNumber?: string | null;
  websiteURI?: string | null;
  category?: string | null;
  rating?: number | null;
  userRatingCount?: number | null;
  location?: {
    lat: () => number;
    lng: () => number;
  } | null;
}

export interface SavedLead {
  id: string;
  place_id: string;
  display_name: string;
  formatted_address: string | null;
  phone_number: string | null;
  website_uri: string | null;
  category: string; // e.g. "Dentists", "Restaurants", "Plumbers"
  rating: number | null;
  user_rating_count: number | null;
  search_query: string;
  created_at?: string;
}

export interface SearchError {
  code?: string;
  message: string;
  type: 'auth' | 'api' | 'network' | 'general';
}

declare global {
  interface Window {
    gm_authFailure?: () => void;
    google?: any;
  }
}