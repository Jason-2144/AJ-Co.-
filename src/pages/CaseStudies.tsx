import SEO from '../components/SEO';
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

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

      <div className="bg-[#f5f5f5] text-black selection:bg-black selection:text-white font-sans min-h-screen pt-[120px] pb-24">
        <div className="max-w-[1280px] mx-auto px-6 sm:px-10">
          
          {/* Header */}
          <div className="mb-16 pb-10 border-b border-black/10">
            <span className="font-mono text-xs text-[#787878] tracking-[0.2em] uppercase">§ 03 — FIELD REPORTS &amp; DISPATCHES</span>
            <h1 className="text-[clamp(2.5rem,5vw,4.8rem)] font-bold tracking-tight mt-3 text-black leading-[1.02]">
              Real Problems. <br />
              <span className="italic font-serif font-normal text-[#545454]">Real Results.</span>
            </h1>
            <p className="mt-6 text-lg text-[#545454] max-w-[48ch] font-normal leading-relaxed">
              A sample of what shipped, how it was engineered, and what changed once it did.
            </p>
          </div>

          {/* Case Studies Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {caseStudiesList.map((cs, idx) => (
              <div 
                key={idx} 
                className="bg-white p-8 sm:p-10 rounded-3xl border border-black/10 hover:border-black/30 transition-all shadow-sm flex flex-col justify-between group"
              >
                <div>
                  <span className="font-mono text-xs text-[#787878] uppercase tracking-wider block mb-4">
                    {cs.tag}
                  </span>
                  
                  <div className="text-5xl font-bold tracking-tight text-black mb-2">
                    {cs.stat}<span className="text-[#545454] font-normal text-3xl">{cs.unit}</span>
                  </div>

                  <h3 className="text-2xl font-bold text-black mb-4">
                    {cs.title}
                  </h3>

                  <p className="text-[#545454] text-sm leading-relaxed font-normal mb-8">
                    {cs.desc}
                  </p>
                </div>

                <div className="pt-6 border-t border-black/5 flex justify-between items-center">
                  <Link 
                    to={`/case-studies/${cs.id}`} 
                    className="font-mono text-xs font-bold uppercase text-black group-hover:translate-x-1 transition-transform flex items-center gap-1.5"
                  >
                    Read Technical Dispatch <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}
