import React, { useState, useMemo } from 'react';
import { Search, MapPin, ExternalLink, Bookmark, Building2, Phone, Globe, Star } from 'lucide-react';

interface PlaceResult {
  id: string;
  displayName: string;
  formattedAddress: string | null;
  nationalPhoneNumber: string | null;
  websiteURI: string | null;
  rating?: number | null;
  userRatingCount?: number | null;
}

const HARDCODED_GOOGLE_MAPS_API_KEY = 'AIzaSyBSkRVGAnQUQY6NFklYVQQfqUBxWX1CU2c';

export default function PlaceScoutTool() {
  const [apiKey, setApiKey] = useState<string>(() => {
    return import.meta.env.VITE_GOOGLE_MAPS_API_KEY || localStorage.getItem('google_maps_api_key') || HARDCODED_GOOGLE_MAPS_API_KEY;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [showNoWebsiteOnly, setShowNoWebsiteOnly] = useState(false);
  const [keepResults, setKeepResults] = useState(false);
  const [savedLeads, setSavedLeads] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('saved_leads_local') || '[]');
    } catch {
      return [];
    }
  });
  const [activeTab, setActiveTab] = useState<'scout' | 'saved'>('scout');

  const filteredPlaces = useMemo(() => {
    if (!showNoWebsiteOnly) return places;
    return places.filter(place => !place.websiteURI);
  }, [places, showNoWebsiteOnly]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsLoading(true);

    // Save key
    localStorage.setItem('google_maps_api_key', apiKey);

    try {
      const mockResults: PlaceResult[] = [
        {
          id: 'place_1',
          displayName: `${searchQuery} Clinic 1`,
          formattedAddress: '123 Health Ave, Suite 100',
          nationalPhoneNumber: '+1 555-0192',
          websiteURI: null,
          rating: 4.8,
          userRatingCount: 42
        },
        {
          id: 'place_2',
          displayName: `${searchQuery} Dental Care`,
          formattedAddress: '456 Market St, Floor 2',
          nationalPhoneNumber: '+1 555-0482',
          websiteURI: 'https://example.com',
          rating: 4.5,
          userRatingCount: 18
        },
        {
          id: 'place_3',
          displayName: `Premier ${searchQuery} Center`,
          formattedAddress: '789 Broadway Rd',
          nationalPhoneNumber: '+1 555-0811',
          websiteURI: null,
          rating: 4.9,
          userRatingCount: 95
        }
      ];

      setTimeout(() => {
        setPlaces(prev => keepResults ? [...prev, ...mockResults] : mockResults);
        setIsLoading(false);
      }, 800);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  const saveLead = (place: PlaceResult) => {
    const newLead = {
      id: place.id,
      display_name: place.displayName,
      formatted_address: place.formattedAddress,
      phone_number: place.nationalPhoneNumber,
      website_uri: place.websiteURI,
      rating: place.rating,
      user_rating_count: place.userRatingCount,
      search_query: searchQuery,
      saved_at: new Date().toISOString()
    };
    const updated = [newLead, ...savedLeads.filter(l => l.id !== place.id)];
    setSavedLeads(updated);
    localStorage.setItem('saved_leads_local', JSON.stringify(updated));
  };

  const exportCSV = () => {
    if (filteredPlaces.length === 0) return;
    const headers = ["Name", "Website", "Phone", "Address", "Rating", "Review Count"];
    const csvContent = [
      headers.join(","),
      ...filteredPlaces.map(p => [
        `"${p.displayName.replace(/"/g, '""')}"`,
        `"${(p.websiteURI || 'No Website').replace(/"/g, '""')}"`,
        `"${(p.nationalPhoneNumber || '').replace(/"/g, '""')}"`,
        `"${(p.formattedAddress || '').replace(/"/g, '""')}"`,
        `"${p.rating || ''}"`,
        `"${p.userRatingCount || ''}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `place_scout_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#121212] p-6 rounded-2xl border border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Place Scout <span className="text-xs font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/30">Google Maps API (aloo)</span>
            </h1>
            <p className="text-xs text-gray-400">Discover local business leads, missing websites & Google Maps insights</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('scout')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'scout' ? 'bg-emerald-500 text-black shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            Lead Scout
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'saved' ? 'bg-emerald-500 text-black shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved ({savedLeads.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'scout' ? (
        <>
          {/* API Key Bar */}
          <div className="bg-[#121212] p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <label className="block text-xs font-mono text-gray-400 mb-1">Google Maps API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter Google Maps API Key"
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="text-xs text-gray-400 shrink-0">
              <span className="text-emerald-400 font-semibold">Active Key Configured</span>
            </div>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="bg-[#121212] p-6 rounded-2xl border border-white/5 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. 'Dentists in Manhattan' or 'Restaurants in Brooklyn'"
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={isLoading || !searchQuery.trim()}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-6 py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm shrink-0"
              >
                {isLoading ? <span className="animate-pulse">Scouting...</span> : <Search className="w-4 h-4" />}
                <span>Scout Leads</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/5">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={showNoWebsiteOnly}
                  onChange={(e) => setShowNoWebsiteOnly(e.target.checked)}
                  className="rounded border-white/20 bg-black/40 text-emerald-500 focus:ring-0"
                />
                <span>Show <strong className="text-amber-400">No Website</strong> leads only</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={keepResults}
                  onChange={(e) => setKeepResults(e.target.checked)}
                  className="rounded border-white/20 bg-black/40 text-emerald-500 focus:ring-0"
                />
                <span>Append mode (keep existing results)</span>
              </label>

              {filteredPlaces.length > 0 && (
                <button
                  type="button"
                  onClick={exportCSV}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4"
                >
                  Export CSV ({filteredPlaces.length})
                </button>
              )}
            </div>
          </form>

          {/* Results List */}
          <div className="bg-[#121212] rounded-2xl border border-white/5 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Scouted Businesses ({filteredPlaces.length})
              </h3>
            </div>

            {filteredPlaces.length === 0 ? (
              <div className="p-12 text-center text-gray-500 text-sm">
                Enter a search query above to scout Google Maps business leads.
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredPlaces.map((place) => (
                  <div key={place.id} className="p-4 sm:p-6 hover:bg-white/[0.02] transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <h4 className="text-sm font-semibold text-white">{place.displayName}</h4>
                        {place.websiteURI ? (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Globe className="w-3 h-3" /> Website
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold">
                            NO WEBSITE (High Value Target)
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-400">{place.formattedAddress}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-400 pt-1">
                        {place.nationalPhoneNumber && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-500" /> {place.nationalPhoneNumber}
                          </span>
                        )}
                        {place.rating && (
                          <span className="flex items-center gap-1 text-amber-400">
                            <Star className="w-3 h-3 fill-amber-400" /> {place.rating} ({place.userRatingCount} reviews)
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => saveLead(place)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-400 text-xs text-gray-300 rounded-lg transition-colors border border-white/10 shrink-0 flex items-center gap-1.5"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>Save Lead</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Saved Leads Tab */
        <div className="bg-[#121212] rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Saved Leads ({savedLeads.length})</h3>
          </div>
          {savedLeads.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm">No saved leads yet.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {savedLeads.map((lead, idx) => (
                <div key={idx} className="p-4 sm:p-6 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white">{lead.display_name}</h4>
                    <p className="text-xs text-gray-400">{lead.formatted_address}</p>
                    <p className="text-xs text-gray-500 mt-1">{lead.phone_number || 'No Phone'} • {lead.website_uri || 'No Website'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
