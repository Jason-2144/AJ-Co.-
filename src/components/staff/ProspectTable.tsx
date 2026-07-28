import React, { useState } from 'react';
import { Prospect, ParsingError } from '../../types/prospect';
import { ExternalLink, Search, ChevronLeft, ChevronRight, AlertTriangle, XCircle, Info } from 'lucide-react';

interface ProspectTableProps {
  prospects: Prospect[];
  errors: ParsingError[];
  onClear: () => void;
}

export default function ProspectTable({ prospects, errors, onClear }: ProspectTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showSkippedOnly, setShowSkippedOnly] = useState(false);
  const itemsPerPage = 10;

  // Filter prospects
  const filteredProspects = prospects.filter((p) => {
    const searchString = `${p.company} ${p.city || ''} ${p.state || ''} ${p.contacts.join(' ')} ${p.emails.join(' ')}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredProspects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProspects = filteredProspects.slice(startIndex, startIndex + itemsPerPage);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  // Separate critical skipped rows (e.g. missing company name) vs minor warnings (e.g. format issues)
  const skippedErrors = errors.filter(e => e.errors.some(msg => msg.includes('Missing company')));
  const validationWarnings = errors.filter(e => !e.errors.some(msg => msg.includes('Missing company')));

  return (
    <div className="space-y-6">
      {/* Header and Statistics summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search prospects by company, location, contact..."
            className="w-full bg-[#121212] border border-white/10 focus:border-emerald-500/30 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none placeholder-gray-500"
          />
        </div>

        <button
          onClick={onClear}
          className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-mono font-bold tracking-wide transition-colors shrink-0"
        >
          Clear Data
        </button>
      </div>

      {/* Validation Issues & Skip Log (Rendered when warnings or skipped rows occur) */}
      {(errors.length > 0) && (
        <div className="border border-amber-500/10 bg-amber-500/[0.02] p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <h4 className="text-white font-medium text-sm">Validation & Skipped Rows Audit Log</h4>
              <p className="text-gray-500 text-xs mt-0.5">Summary of skipped rows and validation warnings detected during parsing.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-48 overflow-y-auto pr-2 text-xs font-mono">
            {/* Skipped Rows Log */}
            {skippedErrors.length > 0 && (
              <div className="space-y-2">
                <span className="text-red-400 font-semibold uppercase tracking-wider block">Skipped Rows ({skippedErrors.length})</span>
                <div className="space-y-1.5">
                  {skippedErrors.map((err, idx) => (
                    <div key={idx} className="bg-red-500/5 border border-red-500/10 p-2.5 rounded-lg flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-gray-300 font-semibold">Row {err.row}: Skipped</p>
                        <p className="text-gray-500 italic mt-0.5 break-all">"{err.rawContent.slice(0, 80)}"</p>
                        <ul className="list-disc pl-4 text-red-400 mt-1 space-y-0.5">
                          {err.errors.map((msg, mIdx) => (
                            <li key={mIdx}>{msg}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings Log */}
            {validationWarnings.length > 0 && (
              <div className="space-y-2">
                <span className="text-amber-400 font-semibold uppercase tracking-wider block">Validation Warnings ({validationWarnings.length})</span>
                <div className="space-y-1.5">
                  {validationWarnings.map((err, idx) => (
                    <div key={idx} className="bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-lg flex items-start gap-2">
                      <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-gray-300 font-semibold">Row {err.row}: Cleaned & Kept</p>
                        <ul className="list-disc pl-4 text-amber-400 mt-1 space-y-0.5">
                          {err.errors.map((msg, mIdx) => (
                            <li key={mIdx}>{msg}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Prospect Grid Table */}
      <div className="bg-[#121212] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-white/5 bg-[#181818] text-gray-400 font-mono uppercase text-xs">
                <th className="px-6 py-4 font-semibold">Company</th>
                <th className="px-6 py-4 font-semibold">Website</th>
                <th className="px-6 py-4 font-semibold">City</th>
                <th className="px-6 py-4 font-semibold">State</th>
                <th className="px-6 py-4 font-semibold">Contacts</th>
                <th className="px-6 py-4 font-semibold text-center">Emails</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {paginatedProspects.map((p) => {
                // Check if this prospect has associated validation warnings
                const hasWarnings = validationWarnings.some((w) => {
                  const cmpMatch = w.rawContent.toLowerCase().includes(p.company.toLowerCase());
                  return cmpMatch;
                });

                return (
                  <tr key={p.id} className={`hover:bg-white/[0.01] transition-colors ${hasWarnings ? 'bg-amber-500/[0.01]' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{p.company}</span>
                        {hasWarnings && (
                          <span title="Contains validation warnings">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {p.website ? (
                        <a
                          href={p.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:underline text-xs"
                        >
                          {p.website.replace(/^https?:\/\/(www\.)?/, '')}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono">{p.city || <span className="text-gray-600">—</span>}</td>
                    <td className="px-6 py-4 text-xs font-mono">{p.state || <span className="text-gray-600">—</span>}</td>
                    <td className="px-6 py-4">
                      {p.contacts.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {p.contacts.map((c, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-white/[0.03] border border-white/5 rounded-md text-[10px] text-gray-400 font-mono">
                              {c}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {p.emails.length > 0 ? (
                        <div className="flex flex-wrap justify-center gap-1 max-w-xs mx-auto">
                          {p.emails.map((e, idx) => {
                            // Check if this specific email is invalid
                            const isEmailInvalid = errors.some((err) => 
                              err.errors.some((msg) => msg.includes(e) && msg.includes('Invalid email'))
                            );
                            return (
                              <span
                                key={idx}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-mono border ${
                                  isEmailInvalid
                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                    : 'bg-white/[0.03] text-gray-400 border-white/5'
                                }`}
                              >
                                {e}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center"><span className="text-gray-600">—</span></div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredProspects.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500 text-sm font-mono">
                    No prospects matched your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/5 bg-[#181818] px-6 py-4">
            <span className="text-xs text-gray-500 font-mono">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredProspects.length)} of {filteredProspects.length} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="p-1.5 bg-[#121212] border border-white/10 hover:border-emerald-500/30 text-white rounded-lg disabled:opacity-30 disabled:hover:border-white/10 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-white font-mono font-medium px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="p-1.5 bg-[#121212] border border-white/10 hover:border-emerald-500/30 text-white rounded-lg disabled:opacity-30 disabled:hover:border-white/10 transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
