import SEO from '../components/SEO';
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
  return (
    <>
      <SEO title="Terms of Service — AJ & Co." description="Terms of service and service agreements for AJ & Co." canonicalUrl="/terms-of-service" />
      
      <div className="bg-[#f5f5f5] text-black selection:bg-black selection:text-white font-sans min-h-screen pt-[120px] pb-24">
        <div className="max-w-[1000px] mx-auto px-6 sm:px-10">
          
          <div className="mb-14 pb-10 border-b border-black/10">
            <span className="font-mono text-xs text-[#787878] tracking-[0.2em] uppercase">LEGAL DOCUMENTATION</span>
            <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] font-bold tracking-tight text-black mt-3">
              Terms of Service
            </h1>
            <p className="mt-4 font-mono text-xs text-[#787878] uppercase">
              EFFECTIVE DATE: JANUARY 1, 2026
            </p>
          </div>

          <div className="bg-white p-8 sm:p-12 rounded-3xl border border-black/10 shadow-sm space-y-10 text-base text-[#545454] leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-black">1. Agreement to Terms</h2>
              <p>
                By accessing our website or engaging AJ &amp; Co. for AI agent development, workflow automation, or strategy consulting, you agree to be bound by these Terms of Service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-black">2. Services &amp; Scope</h2>
              <p>
                All development deliverables, production schedules, and project milestones are governed by individual Statement of Work (SOW) agreements executed between AJ &amp; Co. and the client.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-black">3. Intellectual Property</h2>
              <p>
                Upon full payment of project fees, clients receive ownership of custom agent implementations and software code built explicitly for their organization under the relevant SOW.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-black">4. Contact</h2>
              <p>
                For questions regarding terms and service contracts, reach out to <a href="mailto:info@ajandco.site" className="text-black font-semibold underline underline-offset-4">info@ajandco.site</a>.
              </p>
            </section>

            <div className="pt-8 border-t border-black/10">
              <Link to="/" className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase text-black hover:opacity-70 transition-opacity">
                <ArrowLeft className="w-4 h-4" /> Return to Home
              </Link>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
