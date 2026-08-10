import SEO from '../components/SEO';
import React from 'react';
import { Link } from 'react-router-dom';

export default function Services() {
  const servicesList = [
    {
      num: "01",
      title: "AI Opportunity Assessment",
      body: "Before we build anything, we find what's actually worth building. We audit your workflows, map your data, and model the ROI — so every decision is grounded in evidence, not hype."
    },
    {
      num: "02",
      title: "Custom Agent Development",
      body: "We build production-ready AI agents tailored to your stack. Customer support agents, sales assistants, internal ops bots — built to work inside your tools from day one."
    },
    {
      num: "03",
      title: "Workflow Automation",
      body: "We connect AI to the tools your team already uses — CRMs, project managers, communication platforms. Repetitive work disappears. Your team focuses on what actually matters."
    },
    {
      num: "04",
      title: "Enterprise AI Training",
      body: "Shipping a system is only half the job. We train your people until AI is embedded in how they think and work — not just something IT manages."
    }
  ];

  return (
    <>
      <SEO 
        title="Services — AJ & Co." 
        description="Four disciplines, one team. We scope narrow and ship the thing that removes the task from your calendar."
        canonicalUrl="/services" 
      />

      <div className="bg-[#0A0A09] text-[#F8F7F3] selection:bg-[#C7A24C] selection:text-[#F8F7F3] font-sans min-h-screen pt-[140px] pb-24">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10">
          
          {/* Header */}
          <div className="mb-16 pb-8 border-b border-[#242320]">
            <div className="font-mono text-[0.72rem] text-[#C7A24C] tracking-[0.12em] uppercase mb-4">
              § 01 — CAPABILITIES &amp; DISCIPLINES
            </div>
            <h1 className="font-serif text-[clamp(2.5rem,5.5vw,5rem)] font-normal leading-[1.05] tracking-tight max-w-[20ch]">
              AI Services Built For <span className="italic text-[#C7A24C]">Real Business Outcomes</span>
            </h1>
            <p className="mt-6 text-[1.05rem] text-[#cfccc2] max-w-[46ch] font-light leading-relaxed">
              We don't offer generic AI tools. Every service we provide is designed around your workflows, your team, and your goals.
            </p>
          </div>

          {/* Services List */}
          <div className="border-t border-[#242320]">
            {servicesList.map((service, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-[80px_1fr_1.2fr] gap-6 items-start py-10 border-b border-[#242320] hover:bg-white/[0.02] transition-colors">
                <div className="font-mono text-[#8a877e] text-sm pt-1">{service.num}</div>
                <div className="font-serif text-2xl sm:text-4xl font-normal">{service.title}</div>
                <div className="space-y-6">
                  <p className="text-[#cfccc2] text-[0.95rem] leading-relaxed font-light">{service.body}</p>
                  <Link 
                    to="/contact" 
                    className="inline-block font-mono text-[0.75rem] tracking-[0.08em] uppercase text-[#F8F7F3] border-b border-[#C7A24C] pb-0.5 hover:text-[#C7A24C] transition-colors"
                  >
                    Discuss this capability →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Box */}
          <div className="mt-24 border border-[#3a382f] p-8 sm:p-14 relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="absolute -top-[11px] left-10 bg-[#0A0A09] px-2.5 font-mono text-[0.68rem] tracking-[0.12em] text-[#8a877e]">
              STRATEGY INITIATION
            </div>
            <div>
              <div className="font-serif text-2xl sm:text-3xl font-normal">Not sure which service fits?</div>
              <p className="text-sm text-[#8a877e] font-light mt-2">Start with a free strategy call to identify your high-impact opportunities.</p>
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
