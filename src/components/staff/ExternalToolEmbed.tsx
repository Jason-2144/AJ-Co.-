import React from 'react';
import { ExternalLink, AlertTriangle } from 'lucide-react';

interface ExternalToolEmbedProps {
  title: string;
  url: string | undefined;
  envVarName: string;
  description: string;
}

/**
 * Embeds a real, separately-deployed tool via iframe rather than
 * reimplementing it as a mock inside this repo.
 *
 * This replaced an earlier version of this page that showed hardcoded
 * fake numbers (128 sent today, 94% confirmed, etc.) with no real backend
 * behind them. If you're seeing the "not configured" state below, that
 * means the tool genuinely hasn't been deployed yet — set the env var to
 * point at it once it is, don't fake the numbers again.
 */
export default function ExternalToolEmbed({ title, url, envVarName, description }: ExternalToolEmbedProps) {
  if (!url) {
    return (
      <div className="bg-amber-950/30 border border-amber-500/30 rounded-3xl p-10 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">{title} isn't connected yet</h3>
        <p className="text-white/60 max-w-md mx-auto leading-relaxed">
          {description} Set <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-300">{envVarName}</code> in
          this project's environment variables once it's deployed, then redeploy.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl overflow-hidden border border-white/10 bg-black/40">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <span className="text-sm font-semibold text-white/80">{title}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          Open full screen <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
      <iframe
        src={url}
        title={title}
        className="w-full border-0"
        style={{ height: '80vh' }}
        loading="lazy"
      />
    </div>
  );
}
