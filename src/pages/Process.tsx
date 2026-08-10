import SEO from '../components/SEO';
import React from 'react';
import { Link } from 'react-router-dom';

export default function Process() {
  const processPhases = [
    {
      num: "PHASE 01",
      label: "IDENTIFY (4–6 DAYS)",
      title: "Find What's Worth Building",
      desc: "We start every engagement the same way: by understanding your business before we touch any technology. We map your workflows, find where time bleeds, and model ROI before a single line of code is written.",
      deliverables: ["Stakeholder Interviews", "Process Mapping Sessions", "Data Infrastructure Audit", "Opportunity Prioritisation Matrix", "ROI Modeling for Top 3 Opportunities", "Executive AI Readiness Report"]
    },
    {
      num: "PHASE 02",
      label: "DEVELOP (3–12 WEEKS)",
      title: "Build It Right, The First Time",
      desc: "Once we know what to build, we move fast. Our build process catches problems early at the PoC stage when they are cheap to fix, not after full deployment.",
      deliverables: ["System Architecture Document", "Data & API Integration Map", "Working Proof of Concept (Week 2)", "Stakeholder Review & Sign-Off", "Full Production Build", "Security & Governance Documentation"]
    },
    {
      num: "PHASE 03",
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

      <div className="bg-[#0A0A09] text-[#F8F7F3] selection:bg-[#C7A24C] selection:text-[#F8F7F3] font-sans min-h-screen pt-[140px] pb-24">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10">
          
          {/* Header */}
          <div className="mb-16 pb-8 border-b border-[#242320]">
            <div className="font-mono text-[0.72rem] text-[#C7A24C] tracking-[0.12em] uppercase mb-4">
              § 02 — METHODOLOGY &amp; EXECUTION
            </div>
            <h1 className="font-serif text-[clamp(2.5rem,5.5vw,5rem)] font-normal leading-[1.05] tracking-tight max-w-[20ch]">
              Three steps. <span className="italic text-[#C7A24C]">Zero shortcuts.</span>
            </h1>
            <p className="mt-6 text-[1.05rem] text-[#cfccc2] max-w-[46ch] font-light leading-relaxed">
              We do not sell software platform subscriptions. We build bespoke systems designed to remove tasks from your calendar permanently.
            </p>
          </div>

          {/* Phases */}
          <div className="space-y-16">
            {processPhases.map((phase, idx) => (
              <div key={idx} className="border border-[#242320] p-8 sm:p-12 bg-[#0A0A09] grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-10 items-start">
                <div>
                  <div className="font-mono text-[0.72rem] text-[#C7A24C] tracking-[0.1em] uppercase mb-2">
                    {phase.num} — {phase.label}
                  </div>
                  <h2 className="font-serif text-3xl sm:text-4xl font-normal leading-tight mb-4">
                    {phase.title}
                  </h2>
                  <p className="text-[#cfccc2] text-[0.95rem] leading-relaxed font-light">
                    {phase.desc}
                  </p>
                </div>

                <div className="border-t lg:border-t-0 lg:border-l border-[#242320] pt-6 lg:pt-0 lg:pl-10">
                  <div className="font-mono text-[0.7rem] text-[#8a877e] uppercase tracking-[0.08em] mb-4">
                    KEY DELIVERABLES
                  </div>
                  <ul className="space-y-3 font-mono text-[0.8rem] text-[#cfccc2]">
                    {phase.deliverables.map((d, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <span className="w-1.5 h-1.5 bg-[#C7A24C] rounded-full" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Box */}
          <div className="mt-20 border border-[#3a382f] p-8 sm:p-14 relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="absolute -top-[11px] left-10 bg-[#0A0A09] px-2.5 font-mono text-[0.68rem] tracking-[0.12em] text-[#8a877e]">
              READY TO AUDIT
            </div>
            <div>
              <div className="font-serif text-2xl sm:text-3xl font-normal">Have a workflow worth killing?</div>
              <p className="text-sm text-[#8a877e] font-light mt-2">Book a strategy session with our senior automation architects.</p>
            </div>
            <Link 
              to="/contact" 
              className="font-mono text-[0.78rem] tracking-[0.08em] uppercase border border-[#F8F7F3] px-7 py-3.5 hover:bg-[#F8F7F3] hover:text-[#0A0A09] transition-all whitespace-nowrap"
            >
              Start a project →
            </Link>
          </div>

        </div>
      </div>
    </>
  );
}
