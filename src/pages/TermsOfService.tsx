import SEO from '../components/SEO';
import React from 'react';
import { Link } from 'react-router-dom';

export default function TermsOfService() {
  return (
    <>
      <SEO title="Terms of Service — AJ & Co." description="Terms of service and service agreements for AJ & Co." canonicalUrl="/terms-of-service" />
      
      <div className="bg-[#0A0A09] text-[#F8F7F3] selection:bg-[#C7A24C] selection:text-[#F8F7F3] font-sans min-h-screen pt-[140px] pb-24">
        <div className="max-w-[1000px] mx-auto px-6 sm:px-10">
          
          <div className="mb-14 pb-8 border-b border-[#242320]">
            <div className="font-mono text-[0.72rem] text-[#C7A24C] tracking-[0.12em] uppercase mb-4">
              LEGAL DOCUMENTATION
            </div>
            <h1 className="font-serif text-[clamp(2.4rem,4.5vw,4.2rem)] font-normal leading-[1.08] tracking-tight">
              Terms of Service
            </h1>
            <p className="mt-4 font-mono text-xs text-[#8a877e]">
              EFFECTIVE DATE: JANUARY 1, 2026
            </p>
          </div>

          <div className="space-y-10 text-[0.95rem] text-[#cfccc2] font-light leading-relaxed">
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-normal text-[#F8F7F3]">1. Agreement to Terms</h2>
              <p>
                By accessing our website or engaging AJ & Co. for AI agent development, workflow automation, or strategy consulting, you agree to be bound by these Terms of Service.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-normal text-[#F8F7F3]">2. Services & Scope</h2>
              <p>
                All development deliverables, production schedules, and project milestones are governed by individual Statement of Work (SOW) agreements executed between AJ & Co. and the client.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-normal text-[#F8F7F3]">3. Intellectual Property</h2>
              <p>
                Upon full payment of project fees, clients receive ownership of custom agent implementations and software code built explicitly for their organization under the relevant SOW.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-normal text-[#F8F7F3]">4. Contact</h2>
              <p>
                For questions regarding terms and service contracts, reach out to <a href="mailto:info@ajandco.site" className="text-[#F8F7F3] border-b border-[#C7A24C]">info@ajandco.site</a>.
              </p>
            </section>
          </div>

          <div className="mt-16 pt-8 border-t border-[#242320]">
            <Link to="/" className="font-mono text-[0.75rem] tracking-[0.08em] uppercase text-[#F8F7F3] border-b border-[#C7A24C] pb-0.5 hover:text-[#C7A24C] transition-colors">
              ← Return to Home
            </Link>
          </div>

        </div>
      </div>
    </>
  );
}
