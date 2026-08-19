import { PlaceResult, SearchError } from '../types';

declare const google: any;

let isScriptLoaded = false;

/**
 * Dynamically loads the Google Maps JavaScript API script.
 */
export const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      isScriptLoaded = true;
      resolve();
      return;
    }

    if (document.getElementById('google-maps-script')) {
      // Script already added but maybe not loaded
      resolve(); 
      return;
    }

    // Set up global auth failure handler
    window.gm_authFailure = () => {
      const error = new Error("Google Maps Authentication Failed. Please check your API key.");
      (error as any).type = 'auth';
      reject(error);
    };

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      isScriptLoaded = true;
      resolve();
    };

    script.onerror = () => {
      reject(new Error("Failed to load Google Maps script (Network Error)."));
    };

    document.head.appendChild(script);
  });
};

/**
 * Performs a text search using the New Places API (Text Search v2).
 */
export const searchPlaces = async (query: string): Promise<PlaceResult[]> => {
  if (!isScriptLoaded || !window.google) {
    throw { message: "Google Maps API not loaded.", type: 'general' };
  }

  try {
    // Import the Places library dynamically
    const { Place } = await google.maps.importLibrary("places");

    // Use the new searchByText method
    const request = {
      textQuery: query,
      fields: [
        'displayName',
        'formattedAddress',
        'nationalPhoneNumber',
        'websiteURI',
        'rating',
        'userRatingCount',
        'location'
      ],
    };

    // @ts-ignore - TS might complain if definitions aren't perfect, but this is valid JS API v3
    const { places } = await Place.searchByText(request);

    if (!places || places.length === 0) {
      return [];
    }

    // Map the results to our interface
    return places.map((place: any) => ({
      id: place.id,
      displayName: place.displayName,
      formattedAddress: place.formattedAddress,
      nationalPhoneNumber: place.nationalPhoneNumber,
      websiteURI: place.websiteURI,
      rating: place.rating ?? null,
      userRatingCount: place.userRatingCount ?? null,
      location: place.location,
    }));

  } catch (error: any) {
    console.error("Places Search Error:", error);
    
    let errorType: SearchError['type'] = 'general';
    let errorMessage = error.message || "An error occurred during search.";

    // Heuristic to detect API not enabled errors which usually come as strings or specific codes
    const errorString = typeof error === 'string' ? error : (error.message || error.toString());
    
    if (
      errorString.includes("ApiNotActivatedMapError") || 
      errorString.includes("LegacyApiNotActivated") ||
      (errorString.includes("PERMISSION_DENIED") && errorString.includes("Places API (New)"))
    ) {
      errorType = 'api';
      errorMessage = "The 'Places API (New)' is not enabled. You must enable specifically the 'Places API (New)' (not just 'Places API') in your Google Cloud Console.";
    } else if (errorString.includes("BillingNotEnabledMapError")) {
      errorType = 'api';
      errorMessage = "Billing is not enabled on your Google Cloud Project. Google Maps APIs require an active billing account.";
    }

    throw { message: errorMessage, type: errorType };
  }
};