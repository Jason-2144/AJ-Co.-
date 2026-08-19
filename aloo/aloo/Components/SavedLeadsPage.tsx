import React, { useState, useEffect } from 'react';
import { Folder, Phone, Globe, MapPin, Search, Trash2, Tag, Download, Star } from 'lucide-react';
import { databases, DATABASE_ID, COLLECTION_ID } from '../services/appwrite';
import { SavedLead } from '../types';

const SavedLeadsPage: React.FC = () => {
  const [leads, setLeads] = useState<SavedLead[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchFilter, setSearchFilter] = useState<string>('');

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    // 1. Read local storage leads immediately so user sees them without delay
    let localStored: SavedLead[] = [];
    try {
      localStored = JSON.parse(localStorage.getItem('saved_leads_local') || '[]');
      setLeads(localStored);
    } catch (e) {
      console.error(e);
    }

    const createSignature = (name: string, address: string | null | undefined) => {
      const cleanName = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanAddr = (address || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return `${cleanName}_${cleanAddr}`;
    };

    // 2. Sync cloud leads from Appwrite & deduplicate by name + address signature
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID
      );
      if (response && response.documents && response.documents.length > 0) {
        const cloudLeads: SavedLead[] = response.documents.map((doc: any) => ({
          id: doc.$id || doc.place_id,
          place_id: doc.place_id || doc.$id,
          display_name: doc.display_name,
          formatted_address: doc.formatted_address || null,
          phone_number: doc.phone_number || null,
          website_uri: doc.website_uri || null,
          category: doc.category || 'General',
          rating: doc.rating ?? null,
          user_rating_count: doc.user_rating_count ?? null,
          search_query: doc.search_query || ''
        }));

        const cloudSigs = new Set(cloudLeads.map(d => createSignature(d.display_name, d.formatted_address)));
        const uniqueLocal = localStored.filter(l => !cloudSigs.has(createSignature(l.display_name, l.formatted_address)));
        setLeads([...cloudLeads, ...uniqueLocal]);
      }
    } catch (err: any) {
      console.warn('Appwrite fetch skipped/using local leads:', err);
    }
  };

  const categories = ['All', ...Array.from(new Set(leads.map(l => l.category || 'Uncategorized')))];

  const filteredLeads = leads.filter(lead => {
    const matchesCategory = selectedCategory === 'All' || (lead.category || 'Uncategorized') === selectedCategory;
    const matchesSearch = !searchFilter.trim() || 
      lead.display_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (lead.formatted_address || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      (lead.category || '').toLowerCase().includes(searchFilter.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleDeleteLead = async (id: string) => {
    // Delete locally
    const updated = leads.filter(l => l.id !== id && l.place_id !== id);
    setLeads(updated);
    localStorage.setItem('saved_leads_local', JSON.stringify(updated));

    // Try deleting from Appwrite
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, id);
    } catch (e) {
      console.warn('Appwrite delete skipped:', e);
    }
  };

  const exportCSV = () => {
    const headers = ["Name", "Category", "Phone", "Website", "Address", "Rating", "Review Count", "Search Query"];
    const csvContent = [
      headers.join(","),
      ...filteredLeads.map(p => {
        const escape = (val: string | null | undefined) => `"${(val || '').replace(/"/g, '""')}"`;
        return [
          escape(p.display_name),
          escape(p.category),
          escape(p.phone_number),
          escape(p.website_uri || 'No Website'),
          escape(p.formatted_address),
          escape(p.rating != null ? String(p.rating) : ''),
          escape(p.user_rating_count != null ? String(p.user_rating_count) : ''),
          escape(p.search_query)
        ].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `saved_leads_${selectedCategory}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState<string>('');

  const handleRenameCategory = (oldCategory: string, newName: string) => {
    if (!newName.trim() || oldCategory === 'All' || oldCategory === newName) {
      setEditingCategory(null);
      return;
    }

    const cleanNewName = newName.trim();

    // 1. Update React state
    const updatedLeads = leads.map(lead => {
      if ((lead.category || 'Uncategorized') === oldCategory) {
        return { ...lead, category: cleanNewName };
      }
      return lead;
    });

    setLeads(updatedLeads);
    localStorage.setItem('saved_leads_local', JSON.stringify(updatedLeads));

    if (selectedCategory === oldCategory) {
      setSelectedCategory(cleanNewName);
    }

    setEditingCategory(null);

    // 2. Sync category rename to Appwrite documents
    try {
      updatedLeads.forEach(async lead => {
        if (lead.category === cleanNewName) {
          try {
            await databases.updateDocument(
              DATABASE_ID,
              COLLECTION_ID,
              lead.id,
              { category: cleanNewName }
            );
          } catch (e) {
            // Ignore non-existent document errors
          }
        }
      });
    } catch (err) {
      console.warn('Appwrite rename sync error:', err);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Categories & Filter Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Saved Lead Categories</h3>
            <p className="text-slate-500 text-sm">Browse & organize saved business genres. <span className="font-semibold text-slate-700">Right-click or double-click</span> a category to rename it.</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search saved leads..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            {filteredLeads.length > 0 && (
              <button
                onClick={exportCSV}
                className="px-4 py-2 bg-primary hover:bg-primaryDark text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" /> Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Category Pills / Badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => {
            const count = cat === 'All' 
              ? leads.length 
              : leads.filter(l => (l.category || 'Uncategorized') === cat).length;

            const isEditing = editingCategory === cat;

            if (isEditing) {
              return (
                <div key={cat} className="flex items-center gap-1 bg-white p-1 rounded-xl border border-primary shadow-md">
                  <input
                    type="text"
                    autoFocus
                    value={renameInput}
                    onChange={(e) => setRenameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameCategory(cat, renameInput);
                      if (e.key === 'Escape') setEditingCategory(null);
                    }}
                    onBlur={() => handleRenameCategory(cat, renameInput)}
                    className="px-2 py-1 text-xs font-semibold text-slate-800 outline-none w-28 font-sans"
                  />
                </div>
              );
            }

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (cat !== 'All') {
                    setEditingCategory(cat);
                    setRenameInput(cat);
                  }
                }}
                onDoubleClick={() => {
                  if (cat !== 'All') {
                    setEditingCategory(cat);
                    setRenameInput(cat);
                  }
                }}
                title={cat !== 'All' ? "Right-click or double-click to rename" : ""}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 group relative ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Folder className="w-3.5 h-3.5" />
                <span>{cat}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                  selectedCategory === cat ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Saved Leads Grid */}
      {filteredLeads.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 max-w-lg mx-auto my-8">
          <div className="bg-slate-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center text-slate-400">
            <Tag className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-slate-800 mb-1">No saved leads found</h4>
          <p className="text-sm text-slate-500 mb-4">
            Search for leads in the Lead Scout tab and they will automatically be saved and grouped by genre!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLeads.map((lead) => (
            <div 
              key={lead.id} 
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    <Tag className="w-3 h-3" />
                    {lead.category || 'Uncategorized'}
                  </span>
                  <button
                    onClick={() => handleDeleteLead(lead.id)}
                    className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                    title="Delete lead"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h4 className="text-lg font-bold text-slate-900 mb-2 line-clamp-1">{lead.display_name}</h4>

                <div className="space-y-2 text-xs text-slate-600 mb-4">
                  {lead.formatted_address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{lead.formatted_address}</span>
                    </div>
                  )}
                  {lead.phone_number && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{lead.phone_number}</span>
                    </div>
                  )}
                  {lead.rating != null && (
                    <div className="flex items-center gap-2">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                      <span>{lead.rating.toFixed(1)}{lead.user_rating_count != null ? ` (${lead.user_rating_count} reviews)` : ''}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {lead.website_uri ? (
                      <a 
                        href={lead.website_uri} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-blue-600 hover:underline line-clamp-1"
                      >
                        {lead.website_uri}
                      </a>
                    ) : (
                      <span className="text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded text-[11px]">
                        No Website (High Intent Lead)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>From query: "{lead.search_query}"</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedLeadsPage;
