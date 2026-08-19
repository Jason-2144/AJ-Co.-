import React, { useState, useMemo } from 'react';
import { Search, MapPin, AlertTriangle, ExternalLink, Check, Sparkles, Layers, Database, Search as SearchIcon, Bookmark } from 'lucide-react';
import ApiKeyConfig from './Components/ApiKeyconfig';
import ResultsTable from './Components/ResultsTable';
import FilterBar from './Components/Filterbar';
import SavedLeadsPage from './Components/SavedLeadsPage';
import { loadGoogleMapsScript, searchPlaces } from './services/mapsService';
import { client as appwriteClient, databases, DATABASE_ID, COLLECTION_ID, ID } from './services/appwrite';
import { PlaceResult, SearchError, SavedLead } from './types';

const HARDCODED_GOOGLE_MAPS_API_KEY = 'AIzaSyBSkRVGAnQUQY6NFklYVQQfqUBxWX1CU2c';

const App: React.FC = () => {
  React.useEffect(() => {
    // Ping Appwrite server to verify backend connection setup
    appwriteClient.ping().then(response => {
      console.log('Appwrite backend connected & pinged successfully:', response);
    }).catch(err => {
      console.warn('Appwrite ping failed:', err);
    });
  }, []);

  const [apiKey, setApiKey] = useState<string>(() => {
    return import.meta.env.VITE_GOOGLE_MAPS_API_KEY || localStorage.getItem('google_maps_api_key') || HARDCODED_GOOGLE_MAPS_API_KEY;
  });

  const handleApiConnected = (key: string) => {
    localStorage.setItem('google_maps_api_key', key);
    setApiKey(key);
  };

  const [activeTab, setActiveTab] = useState<'scout' | 'database'>('scout');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [error, setError] = useState<SearchError | null>(null);
  
  // Features
  const [showNoWebsiteOnly, setShowNoWebsiteOnly] = useState<boolean>(false);
  const [keepResults, setKeepResults] = useState<boolean>(false);

  // Derived state for filtered results
  const filteredPlaces = useMemo(() => {
    if (!showNoWebsiteOnly) return places;
    return places.filter(place => !place.websiteURI);
  }, [places, showNoWebsiteOnly]);

  const deriveCategory = (query: string) => {
    if (!query) return 'General';
    const cleaned = query.split(' in ')[0].split(' near ')[0].trim();
    return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : 'General';
  };

  const autoSaveLeadsToDatabase = async (fetchedResults: PlaceResult[], query: string) => {
    if (!fetchedResults || fetchedResults.length === 0) return;

    const category = deriveCategory(query);

    // Create a normalized key signature (e.g. name + address) to strictly avoid saving duplicate businesses
    const createSignature = (name: string, address: string | null | undefined) => {
      const cleanName = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanAddr = (address || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return `${cleanName}_${cleanAddr}`;
    };

    // 1. Update local storage with strict deduplication
    try {
      const existing: SavedLead[] = JSON.parse(localStorage.getItem('saved_leads_local') || '[]');
      
      const existingSignatures = new Set(
        existing.map(l => createSignature(l.display_name, l.formatted_address))
      );

      const newLeadsToSave: SavedLead[] = [];

      fetchedResults.forEach((place, index) => {
        const displayName = typeof place.displayName === 'string' 
          ? place.displayName 
          : (place.displayName as any)?.text || 'Unknown Business';
        
        const signature = createSignature(displayName, place.formattedAddress);

        if (!existingSignatures.has(signature)) {
          existingSignatures.add(signature);
          const uniqueId = place.id || `lead_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`;
          newLeadsToSave.push({
            id: uniqueId,
            place_id: uniqueId,
            display_name: displayName,
            formatted_address: place.formattedAddress || null,
            phone_number: place.nationalPhoneNumber || null,
            website_uri: place.websiteURI || null,
            category,
            rating: place.rating ?? null,
            user_rating_count: place.userRatingCount ?? null,
            search_query: query
          });
        }
      });

      if (newLeadsToSave.length > 0) {
        const combined = [...newLeadsToSave, ...existing];
        localStorage.setItem('saved_leads_local', JSON.stringify(combined));

        // 2. Sync only brand new non-duplicate leads to Appwrite database
        try {
          for (const lead of newLeadsToSave) {
            await databases.createDocument(
              DATABASE_ID,
              COLLECTION_ID,
              ID.unique(),
              lead
            );
          }
        } catch (err) {
          console.warn('Appwrite sync skipped (database/collection pending setup):', err);
        }
      }
    } catch (err) {
      console.error('Error saving leads:', err);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !apiKey) return;

    setIsLoading(true);
    setError(null);

    if (!keepResults) {
      setPlaces([]);
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();

    // --- SEARCH CACHE CHECK (Prevents duplicate Google API billing) ---
    try {
      const existing: SavedLead[] = JSON.parse(localStorage.getItem('saved_leads_local') || '[]');
      const cachedLeads = existing.filter(l => (l.search_query || '').trim().toLowerCase() === normalizedQuery);

      if (cachedLeads.length > 0) {
        // Map cached SavedLead objects back to PlaceResult for display
        const mappedResults: PlaceResult[] = cachedLeads.map(l => ({
          id: l.place_id || l.id,
          displayName: l.display_name,
          formattedAddress: l.formatted_address,
          nationalPhoneNumber: l.phone_number,
          websiteURI: l.website_uri,
          rating: l.rating ?? null,
          userRatingCount: l.user_rating_count ?? null,
          location: null
        }));

        setPlaces(prev => {
          if (keepResults) {
            const existingIds = new Set(prev.map(p => p.id));
            const newPlaces = mappedResults.filter(p => !existingIds.has(p.id));
            return [...prev, ...newPlaces];
          }
          return mappedResults;
        });

        setIsLoading(false);
        return; // Zero API cost hit!
      }
    } catch (err) {
      console.warn('Cache lookup skipped:', err);
    }

    // --- GOOGLE MAPS API CALL ---
    try {
      await loadGoogleMapsScript(apiKey);
      const results = await searchPlaces(searchQuery);
      
      setPlaces(prev => {
        if (keepResults) {
          const existingIds = new Set(prev.map(p => p.id));
          const newPlaces = results.filter(p => !existingIds.has(p.id));
          return [...prev, ...newPlaces];
        }
        return results;
      });

      // Automatically save new leads to database & local cache
      autoSaveLeadsToDatabase(results, searchQuery);

    } catch (err: any) {
      console.error(err);
      setError({
        message: err.message || 'An error occurred while searching.',
        type: err.type || 'general',
        code: err.code
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setPlaces([]);
    setError(null);
  };

  const handleExport = () => {
    if (filteredPlaces.length === 0) return;

    const headers = ["Name", "Website", "Phone", "Address", "Rating", "Review Count"];
    const csvContent = [
      headers.join(","),
      ...filteredPlaces.map(p => {
        const escape = (val: string | null | undefined) => `"${(val || '').replace(/"/g, '""')}"`;
        return [
          escape(p.displayName),
          escape(p.websiteURI || 'No Website'),
          escape(p.nationalPhoneNumber),
          escape(p.formattedAddress),
          escape(p.rating != null ? String(p.rating) : ''),
          escape(p.userRatingCount != null ? String(p.userRatingCount) : '')
        ].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `place_scout_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 relative overflow-x-hidden">
      {/* Ambient Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-accent/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-secondary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-default">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-xl blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
              <div className="relative bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-primaryDark tracking-tight">Place Scout</h1>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => setActiveTab('scout')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'scout'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <SearchIcon className="w-4 h-4 text-primary" />
              <span>Lead Scout</span>
            </button>
            <button
              onClick={() => setActiveTab('database')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'database'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bookmark className="w-4 h-4 text-emerald-600" />
              <span>Saved Categories</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        
        {activeTab === 'database' ? (
          <SavedLeadsPage />
        ) : (
          <>
            {/* 1. API Configuration (Hero when disconnected) */}
            {!apiKey ? (
              <div className="max-w-2xl mx-auto mt-12 animate-fade-in-up">
                <div className="text-center mb-10">
                  <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight leading-tight">
                    Uncover <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Hidden Leads</span>
                  </h2>
                  <p className="text-lg text-slate-600 max-w-lg mx-auto leading-relaxed">
                    Connect your Google Maps API to instantly scout businesses without websites in any area.
                  </p>
                </div>
                <ApiKeyConfig onApiConnected={handleApiConnected} />
              </div>
            ) : (
              <div className="animate-fade-in-up">
                {/* 2. Search Section */}
                <div className="mb-12 text-center max-w-3xl mx-auto">
                   <div className="relative group z-20">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                    <form onSubmit={handleSearch} className="relative flex items-center">
                      <div className="absolute left-6 flex items-center pointer-events-none">
                        <Search className="h-6 w-6 text-slate-400 group-focus-within:text-primary transition-colors" />
                      </div>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="e.g., 'Dentists in Manhattan' or 'Restaurants in Brooklyn'"
                        className="block w-full pl-16 pr-36 py-6 bg-white border-0 rounded-full shadow-2xl text-xl text-slate-800 placeholder-slate-400 focus:ring-4 focus:ring-primary/20 outline-none transition-all"
                      />
                      <button
                        type="submit"
                        disabled={isLoading || !searchQuery.trim()}
                        className="absolute right-2 top-2 bottom-2 bg-gradient-to-r from-primary to-secondary hover:from-primaryDark hover:to-primary text-white font-bold px-8 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-primary/40 active:scale-95 flex items-center gap-2"
                      >
                        {isLoading ? <span className="animate-pulse">Scouting...</span> : <span>Search</span>}
                      </button>
                    </form>
                   </div>
                   
                   {/* Controls */}
                   <div className="mt-6 flex flex-wrap items-center justify-center gap-6 animate-fade-in-up" style={{animationDelay: '0.1s'}}>
                      <label className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-white/40 transition-colors">
                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-300 shadow-sm ${keepResults ? 'bg-primary border-primary scale-110' : 'bg-white border-slate-300 group-hover:border-primary'}`}>
                          {keepResults && <Check className="h-4 w-4 text-white" />}
                        </div>
                        <input 
                          type="checkbox" 
                          checked={keepResults} 
                          onChange={(e) => setKeepResults(e.target.checked)} 
                          className="hidden" 
                        />
                        <div className="text-left">
                          <span className="block font-semibold text-slate-700 group-hover:text-primary transition-colors">Append Mode</span>
                        </div>
                      </label>
                      
                      <div className="flex items-center gap-2 text-sm text-slate-500 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200/60 shadow-sm">
                         <Layers className="h-4 w-4 text-secondary" />
                         <span>Build large lists by searching adjacent areas</span>
                      </div>
                   </div>
                </div>
                  
                {/* Error Display */}
                {error && (
                  <div className="max-w-3xl mx-auto mb-8 bg-red-50/80 backdrop-blur-sm border border-red-200 text-red-800 p-6 rounded-2xl flex flex-col sm:flex-row items-start gap-4 shadow-lg shadow-red-100 animate-fade-in-up">
                    <div className="bg-red-100 p-2 rounded-full shrink-0">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-red-900 text-lg mb-1">Search Interrupted</h3>
                      <p className="text-red-700 leading-relaxed">{error.message}</p>
                      
                      {error.type === 'api' && (
                        <div className="mt-4 bg-white/60 p-4 rounded-xl border border-red-100">
                          <p className="text-sm font-semibold text-red-900 mb-2">Action Required:</p>
                          <a 
                            href="https://console.cloud.google.com/google/maps-apis/api-list" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg hover:shadow-red-200 text-sm"
                          >
                            Enable "Places API (New)"
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Results & Controls */}
                {(places.length > 0 || isLoading) && (
                  <div className="space-y-6 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                    <FilterBar 
                      showNoWebsiteOnly={showNoWebsiteOnly}
                      onToggleFilter={setShowNoWebsiteOnly}
                      onExport={handleExport}
                      onClear={handleClear}
                      totalResults={places.length}
                      filteredResults={filteredPlaces.length}
                    />
                    <ResultsTable 
                      results={filteredPlaces} 
                      loading={isLoading} 
                      searchQuery={searchQuery}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="relative z-10 py-8 mt-auto border-t border-slate-200/60 bg-white/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm font-medium text-slate-400">
            Designed for High-Performance Lead Gen
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;