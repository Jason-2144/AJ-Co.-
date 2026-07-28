import React, { useState } from 'react';
import { parsePasteText } from '../../services/parsing/pasteParser';
import { parseProspectRows } from '../../services/parsing/prospectParser';
import { ParseResult } from '../../types/prospect';
import { Sparkles, Clipboard } from 'lucide-react';

interface PasteInputProps {
  onParsed: (result: ParseResult) => void;
  onError: (errorMessage: string) => void;
}

export default function PasteInput({ onParsed, onError }: PasteInputProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleParse = () => {
    if (!text.trim()) {
      onError('Please paste some text before attempting to parse.');
      return;
    }

    setLoading(true);

    // Short simulated delay to feel cohesive with the file progress state
    setTimeout(() => {
      try {
        const rawGrid = parsePasteText(text);
        if (rawGrid.length === 0) {
          throw new Error('No valid content found to parse.');
        }

        const parseResult = parseProspectRows(rawGrid);
        onParsed(parseResult);
        setLoading(false);
      } catch (err: any) {
        setLoading(false);
        onError(err?.message || 'Failed to parse paste content.');
      }
    }, 400);
  };

  const insertSampleData = () => {
    const sample = `Flip Health\thttps://flip.health/\t\tHyderabad\tTelangana\tRAVI TEJA AVASARALA, SAIDEEP REDDY\tclinton@flip.health\nAcme Corp\thttps://acme.org\t\tSan Francisco\tCalifornia\tJohn Doe, Sarah Connor\tcontact@acme.org, sales@acme.org\nInvalid Row Example Without Company Name\t\t\t\t\t\tno-company@error.com`;
    setText(sample);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="text-sm font-mono tracking-wider text-gray-400 uppercase">
          Paste Raw Tab-Separated Data Rows
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
          placeholder={`Example raw paste formatting (Tab separated fields):\n\nFlip Health\thttps://flip.health/\t\tHyderabad\tTelangana\tRAVI TEJA AVASARALA, SAIDEEP REDDY\tclinton@flip.health`}
          disabled={loading}
        />
        {text.length === 0 && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-500 flex flex-col items-center pointer-events-none gap-2">
            <Clipboard className="w-8 h-8 text-gray-700" />
            <span className="text-xs">Paste your spreadsheets cells here</span>
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
