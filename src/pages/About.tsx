import SEO from '../components/SEO';
import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function About() {
  return (
    <>
      <SEO 
        title="About Us — AJ & Co." 
        description="Two operators, one low-overhead studio — built to earn in dollars while running on Indian cost structures."
        canonicalUrl="/about" 
      />

      <div className="bg-[#f5f5f5] text-black selection:bg-black selection:text-white font-sans min-h-screen pt-[120px] pb-24">
        <div className="max-w-[1280px] mx-auto px-6 sm:px-10">
          
          {/* Header */}
          <div className="mb-16 pb-10 border-b border-black/10">
            <span className="font-mono text-xs text-[#787878] tracking-[0.2em] uppercase">§ 04 — MASTHEAD &amp; OPERATORS</span>
            <h1 className="text-[clamp(2.4rem,4.8vw,4.5rem)] font-bold tracking-tight mt-3 text-black leading-[1.05]">
              We started AJ &amp; Co. because we were tired of watching AI projects fail for the <span className="italic font-serif font-normal text-[#545454]">wrong reasons.</span>
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-7 space-y-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-black leading-snug">
                Two operators, one <span className="italic font-serif font-normal text-[#545454]">low-overhead studio</span> — built to earn in dollars while running on Indian cost structures.
              </h2>
              
              <div className="space-y-6 text-[#545454] text-base leading-relaxed font-normal pt-2">
                <p>
                  The promise of AI is obvious. The gap between that promise and what most businesses actually experience is enormous. We've seen it from every angle — the vendor selling platforms without understanding the problem, the consultant producing strategy documents with no one to build anything, the developer shipping a system nobody trained their team to use.
                </p>
                <p>
                  AJ &amp; Co. started because client acquisition was the hard part, not the building. Jason leads product and delivery from Chennai; Amaan runs execution and outreach; a Texas-based partner handles the US-facing conversations that a cold email alone can't close. Every engagement is scoped by someone who's felt the operational pain being automated.
                </p>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-8">
              <div className="bg-white p-8 rounded-3xl border border-black/10 shadow-sm">
                <span className="font-mono text-xs uppercase tracking-widest text-[#787878] block mb-4">TEAM &amp; LOCATIONS</span>
                <div className="space-y-4">
                  {[
                    { name: "Jason", role: "Product & Delivery — Chennai" },
                    { name: "Amaan", role: "Execution & Outreach" },
                    { name: "US Desk", role: "Client Acquisition — Austin, TX" },
                    { name: "Ideal client", role: "Seed–early growth, <30 people" },
                    { name: "Focus Area", role: "Custom Agents & Workflow Pipelines" }
                  ].map((r, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2.5 border-b border-black/5 last:border-0 font-mono text-xs">
                      <span className="text-black font-bold">{r.name}</span>
                      <span className="text-[#787878] uppercase">{r.role}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-black/10 shadow-sm">
                <span className="font-mono text-xs text-[#787878] tracking-widest uppercase block mb-2">OPERATIONAL PRINCIPLE</span>
                <h3 className="text-xl font-bold text-black mb-3">Adoption Is The Deliverable</h3>
                <p className="text-sm text-[#545454] leading-relaxed">
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
