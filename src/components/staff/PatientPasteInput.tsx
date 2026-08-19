import React, { useState } from 'react';
import { parsePasteText } from '../../services/parsing/pasteParser';
import { parsePatientRows } from '../../services/patients/PatientParser';
import { PatientParseResult } from '../../services/patients/PatientTypes';
import { Sparkles, Clipboard } from 'lucide-react';

interface PatientPasteInputProps {
  onParsed: (result: PatientParseResult) => void;
  onError: (errorMessage: string) => void;
}

export default function PatientPasteInput({ onParsed, onError }: PatientPasteInputProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleParse = () => {
    if (!text.trim()) {
      onError('Please paste some text before attempting to parse.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      try {
        const rawGrid = parsePasteText(text);
        if (rawGrid.length === 0) {
          throw new Error('No valid content found to parse.');
        }

        const parseResult = parsePatientRows(rawGrid);
        onParsed(parseResult);
        setLoading(false);
      } catch (err: any) {
        setLoading(false);
        onError(err?.message || 'Failed to parse paste content.');
      }
    }, 400);
  };

  const insertSampleData = () => {
    const sample = `Sarah Jenkins\t+15551234567\t2025-02-10\tBright Smile Dental\nMichael Chang\t+15559876543\t2025-01-05\tBright Smile Dental\nDavid Miller\t+15551112222\t2024-11-20\tBright Smile Dental`;
    setText(sample);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="text-sm font-mono tracking-wider text-gray-400 uppercase">
          Paste Raw Tab-Separated Patient Rows
        </label>
        <button
          onClick={insertSampleData}
          className="text-xs text-emerald-400 hover:text-emerald-300 font-mono transition-colors border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 rounded-lg"
        >
          Load Paste Example
        </button>
      </div>

      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-48 bg-[#121212] border border-white/10 focus:border-emerald-500/30 text-white rounded-2xl p-4 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/30 placeholder-gray-600 resize-none leading-relaxed"
          placeholder={`Example raw paste formatting (Tab separated fields):\n\nSarah Jenkins\t+15551234567\t2025-02-10\tBright Smile Dental`}
          disabled={loading}
        />
        {text.length === 0 && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-500 flex flex-col items-center pointer-events-none gap-2">
            <Clipboard className="w-8 h-8 text-gray-700" />
            <span className="text-xs">Paste your patient list cells here</span>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleParse}
          disabled={loading || !text.trim()}
          className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/30 text-black font-semibold px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 text-sm shadow-lg shadow-emerald-500/10 cursor-pointer"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Parsing Content...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> Parse Pasted Text
            </>
          )}
        </button>
      </div>
    </div>
  );
}
