import React, { useState } from 'react';
import { Key, CheckCircle2, AlertCircle, Loader2, Lock } from 'lucide-react';
import { loadGoogleMapsScript } from '../services/mapsService';

interface ApiKeyConfigProps {
  onApiConnected: (key: string) => void;
}

const ApiKeyConfig: React.FC<ApiKeyConfigProps> = ({ onApiConnected }) => {
  const [keyInput, setKeyInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleConnect = async () => {
    if (!keyInput.trim()) return;

    setStatus('loading');
    setErrorMessage('');

    try {
      await loadGoogleMapsScript(keyInput);
      setStatus('success');
      setTimeout(() => {
        onApiConnected(keyInput);
      }, 800);
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || "Failed to connect.");
    }
  };

  if (status === 'success') {
    return (
      <div className="max-w-md mx-auto bg-green-500 text-white rounded-2xl p-6 shadow-lg shadow-green-500/30 flex flex-col items-center justify-center text-center animate-fade-in-up">
        <div className="bg-white/20 p-3 rounded-full mb-3">
          <CheckCircle2 className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-xl font-bold">Connected Successfully</h3>
        <p className="text-green-100 mt-1">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-glass border border-slate-100 p-1 relative overflow-hidden group hover:shadow-xl transition-shadow duration-500">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-accent to-secondary"></div>
      
      <div className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-primary/10 p-2.5 rounded-xl text-primary">
            <Key className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">API Access</h2>
            <p className="text-sm text-slate-500">Securely connect Google Maps</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Paste your API Key here"
              className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-mono text-sm shadow-inner"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
             <div className="text-xs text-slate-400 font-medium">
               Requires <span className="text-primary">Places API (New)</span>
             </div>
             <button
              onClick={handleConnect}
              disabled={status === 'loading' || !keyInput}
              className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white px-6 py-3 rounded-xl font-semibold transition-all flex items-center shadow-lg hover:shadow-xl active:scale-95"
            >
              {status === 'loading' ? (
                <><Loader2 className="animate-spin h-5 w-5 mr-2" /> Verifying</>
              ) : (
                "Connect Key"
              )}
            </button>
          </div>
        </div>

        {status === 'error' && (
          <div className="mt-6 flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-xl text-sm border border-red-100 animate-fade-in-up">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiKeyConfig;