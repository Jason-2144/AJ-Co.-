import SEO from '../components/SEO';
import React from 'react';
import { Link } from 'react-router-dom';

export default function CaseStudies() {
  const caseStudiesList = [
    {
      id: "ecommerce-support-automation",
      tag: "E-Commerce · Customer Service Triage",
      stat: "75%",
      unit: " Faster",
      title: "AI Support Ticket Triage System",
      desc: "Deployed a secure multi-agent support triage system connecting Zendesk, Shopify, and internal logistics databases to automate ticket categorization and order lookup."
    },
    {
      id: "sales-lead-qualification",
      tag: "B2B SaaS · Outbound Automation",
      stat: "3x",
      unit: " More Leads",
      title: "Autonomous Sales Enrichment Agent",
      tagSub: "SDR Team Automation",
      desc: "Engineered an outbound pipeline executing live prospect web crawling, lead scoring, and automated Gmail draft generation for sales reps."
    },
    {
      id: "internal-operations-assistant",
      tag: "Professional Services · Internal Operations",
      stat: "40%",
      unit: " Less Manual Ops",
      title: "Internal Operations Assistant",
      desc: "Replaced 12 hours of weekly manual reporting across 20+ active client projects with an internal Slack & Notion assistant."
    }
  ];

  return (
    <>
      <SEO 
        title="Field Reports — AJ & Co." 
        description="A sample of recent automation dispatches, technical architectures, and measured business outcomes."
        canonicalUrl="/case-studies" 
      />

      <div className="bg-[#0A0A09] text-[#F8F7F3] selection:bg-[#C7A24C] selection:text-[#F8F7F3] font-sans min-h-screen pt-[140px] pb-24">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10">
          
          {/* Header */}
          <div className="mb-16 pb-8 border-b border-[#242320]">
            <div className="font-mono text-[0.72rem] text-[#C7A24C] tracking-[0.12em] uppercase mb-4">
              § 03 — FIELD REPORTS &amp; DISPATCHES
            </div>
            <h1 className="font-serif text-[clamp(2.5rem,5.5vw,5rem)] font-normal leading-[1.05] tracking-tight max-w-[20ch]">
              Real Problems. <span className="italic text-[#C7A24C]">Real Results.</span>
            </h1>
            <p className="mt-6 text-[1.05rem] text-[#cfccc2] max-w-[46ch] font-light leading-relaxed">
              A sample of what shipped, how it was engineered, and what changed once it did.
            </p>
          </div>

          {/* Case Studies Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {caseStudiesList.map((cs, idx) => (
              <div key={idx} className="border border-[#242320] p-8 bg-[#0A0A09] flex flex-col justify-between hover:border-[#C7A24C]/60 transition-colors">
                <div>
                  <div className="font-mono text-[0.68rem] tracking-[0.08em] text-[#8a877e] uppercase mb-6">
                    {cs.tag}
                  </div>
                  
                  <div className="font-serif text-5xl font-normal mb-3 text-[#F8F7F3]">
                    {cs.stat}<span className="text-[#C7A24C] italic text-3xl">{cs.unit}</span>
                  </div>

                  <h3 className="font-serif text-2xl font-normal mb-4">
                    {cs.title}
                  </h3>

                  <p className="text-[#cfccc2] text-sm leading-relaxed font-light mb-8">
                    {cs.desc}
                  </p>
                </div>

                <Link 
                  to={`/case-studies/${cs.id}`} 
                  className="font-mono text-[0.75rem] tracking-[0.08em] uppercase text-[#F8F7F3] border-b border-[#C7A24C] pb-0.5 hover:text-[#C7A24C] transition-colors w-max"
                >
                  Read Technical Dispatch →
                </Link>
              </div>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}
