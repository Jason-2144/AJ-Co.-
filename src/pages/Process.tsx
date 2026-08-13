import SEO from '../components/SEO';
import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function Process() {
  const processPhases = [
    {
      num: "01",
      label: "IDENTIFY (4–6 DAYS)",
      title: "Find What's Worth Building",
      desc: "We start every engagement the same way: by understanding your business before we touch any technology. We map your workflows, find where time bleeds, and model ROI before a single line of code is written.",
      deliverables: ["Stakeholder Interviews", "Process Mapping Sessions", "Data Infrastructure Audit", "Opportunity Prioritisation Matrix", "ROI Modeling for Top 3 Opportunities", "Executive AI Readiness Report"]
    },
    {
      num: "02",
      label: "DEVELOP (3–12 WEEKS)",
      title: "Build It Right, The First Time",
      desc: "Once we know what to build, we move fast. Our build process catches problems early at the PoC stage when they are cheap to fix, not after full deployment.",
      deliverables: ["System Architecture Document", "Data & API Integration Map", "Working Proof of Concept (Week 2)", "Stakeholder Review & Sign-Off", "Full Production Build", "Security & Governance Documentation"]
    },
    {
      num: "03",
      label: "ADOPT (30–90 DAYS)",
      title: "Shipping Is The Beginning, Not The End",
      desc: "We stay through adoption. We run role-specific training sessions, track utilization metrics, and iterate until the new AI tools are standard daily procedure.",
      deliverables: ["Rollout & Change Management Plan", "Team Enablement Workshops", "User Playbooks", "30-Day Adoption Review", "Performance Dashboard Setup"]
    }
  ];

  return (
    <>
      <SEO 
        title="Our Process — AJ & Co." 
        description="Three phases. Zero shortcuts. How we scope, build, and deploy production-grade AI systems."
        canonicalUrl="/process" 
      />

      <div className="bg-[#f5f5f5] text-black selection:bg-black selection:text-white font-sans min-h-screen pt-[120px] pb-24">
        <div className="max-w-[1280px] mx-auto px-6 sm:px-10">
          
          {/* Header */}
          <div className="mb-16 pb-10 border-b border-black/10">
            <span className="font-mono text-xs text-[#787878] tracking-[0.2em] uppercase">§ 02 — METHODOLOGY &amp; DELIVERY</span>
            <h1 className="text-[clamp(2.5rem,5vw,4.8rem)] font-bold tracking-tight mt-3 text-black leading-[1.02]">
              Three steps. <br />
              <span className="italic font-serif font-normal text-[#545454]">Zero shortcuts.</span>
            </h1>
            <p className="mt-6 text-lg text-[#545454] max-w-[48ch] font-normal leading-relaxed">
              We do not sell software platform subscriptions. We build bespoke systems designed to remove tasks from your calendar permanently.
            </p>
          </div>

          {/* Phases */}
          <div className="space-y-8">
            {processPhases.map((phase, idx) => (
              <div key={idx} className="bg-white p-8 sm:p-12 rounded-3xl border border-black/10 shadow-sm grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-10 items-start">
                <div>
                  <span className="font-mono text-xs text-[#787878] tracking-widest uppercase block mb-3">
                    PHASE {phase.num} — {phase.label}
                  </span>
                  <h2 className="text-3xl font-bold text-black mb-4">
                    {phase.title}
                  </h2>
                  <p className="text-[#545454] text-base leading-relaxed font-normal">
                    {phase.desc}
                  </p>
                </div>

                <div className="border-t lg:border-t-0 lg:border-l border-black/10 pt-6 lg:pt-0 lg:pl-10">
                  <span className="font-mono text-xs text-[#787878] uppercase tracking-wider block mb-4">
                    KEY DELIVERABLES
                  </span>
                  <ul className="space-y-3 font-mono text-xs text-[#545454]">
                    {phase.deliverables.map((d, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Box */}
          <div className="mt-20 bg-black text-white p-10 sm:p-14 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white">Have a workflow worth killing?</h3>
              <p className="text-white/70 text-sm mt-2">Book a strategy session with our senior automation architects.</p>
            </div>
            <Link 
              to="/contact" 
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black text-xs font-bold uppercase tracking-wider rounded-full hover:bg-white/90 transition-all whitespace-nowrap"
            >
              Start a project →
            </Link>
          </div>

        </div>
      </div>
    </>
  );
}
