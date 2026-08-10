import SEO from '../components/SEO';
import React from 'react';
import { Link } from 'react-router-dom';

export default function About() {
  return (
    <>
      <SEO 
        title="About Us — AJ & Co." 
        description="Two operators, one low-overhead studio — built to earn in dollars while running on Indian cost structures."
        canonicalUrl="/about" 
      />

      <div className="bg-[#0A0A09] text-[#F8F7F3] selection:bg-[#C7A24C] selection:text-[#F8F7F3] font-sans min-h-screen pt-[140px] pb-24">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10">
          
          {/* Header */}
          <div className="mb-16 pb-8 border-b border-[#242320]">
            <div className="font-mono text-[0.72rem] text-[#C7A24C] tracking-[0.12em] uppercase mb-4">
              § 04 — MASTHEAD &amp; OPERATORS
            </div>
            <h1 className="font-serif text-[clamp(2.2rem,4.5vw,4.2rem)] font-normal leading-[1.1] tracking-tight max-w-[28ch]">
              We started AJ &amp; Co. because we were tired of watching AI projects fail for the <span className="italic text-[#C7A24C]">wrong reasons.</span>
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-20">
            <div>
              <p className="font-serif text-[clamp(1.4rem,2.4vw,1.9rem)] leading-[1.35] font-normal">
                Two operators, one <span className="text-[#C7A24C] italic">low-overhead studio</span> — built to earn in dollars while running on Indian cost structures.
              </p>
              
              <div className="space-y-6 text-[0.95rem] leading-relaxed text-[#cfccc2] font-light mt-8">
                <p>
                  The promise of AI is obvious. The gap between that promise and what most businesses actually experience is enormous. We've seen it from every angle — the vendor selling platforms without understanding the problem, the consultant producing strategy documents with no one to build anything, the developer shipping a system nobody trained their team to use.
                </p>
                <p>
                  AJ &amp; Co. started because client acquisition was the hard part, not the building. Jason leads product and delivery from Chennai; Amaan runs execution and outreach; a Texas-based partner handles the US-facing conversations that a cold email alone can't close. Every engagement is scoped by someone who's felt the operational pain being automated.
                </p>
              </div>
            </div>

            <div>
              <div className="border-t border-[#242320]">
                {[
                  { name: "Jason", role: "Product & Delivery — Chennai" },
                  { name: "Amaan", role: "Execution & Outreach" },
                  { name: "US Desk", role: "Client Acquisition — Austin, TX" },
                  { name: "Ideal client", role: "Seed–early growth, <30 people" },
                  { name: "Focus Area", role: "Custom Agents & Workflow Pipelines" }
                ].map((r, idx) => (
                  <div key={idx} className="flex justify-between items-center py-4 border-b border-[#242320] font-mono text-[0.78rem] tracking-[0.03em]">
                    <span className="text-[#F8F7F3]">{r.name}</span>
                    <span className="text-[#8a877e] uppercase tracking-[0.06em]">{r.role}</span>
                  </div>
                ))}
              </div>

              <div className="mt-12 p-8 border border-[#242320]">
                <div className="font-mono text-[0.72rem] text-[#C7A24C] tracking-[0.1em] uppercase mb-2">OPERATIONAL PRINCIPLE</div>
                <div className="font-serif text-xl font-normal mb-3">Adoption Is The Deliverable</div>
                <p className="text-xs text-[#8a877e] font-light leading-relaxed">
                  A system that isn't used isn't a success. We measure ourselves by whether your team is actually using what we built — not by whether we shipped on time.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
