import SEO from '../components/SEO';
import { useParams, Link } from 'react-router-dom';
import React from 'react';

const caseStudyData: Record<string, any> = {
  "ecommerce-support-automation": {
    industry: "E-Commerce · Customer Experience",
    title: "How We Cut Support Response Times By 75% With A Multi-Agent AI System",
    stat: "75%",
    statLabel: "Faster Response Times",
    client: "Scaling North American e-commerce brand processing 1,000+ support tickets per day across Shopify and Zendesk.",
    challenge: "Support volume grew linearly with orders. Over 70% of tickets were repetitive queries (order status, returns, shipping delays) consuming 12 human agents.",
    architecture: [
      { name: "Layer 1: Classifier Agent", desc: "Reads incoming tickets and classifies category, urgency, and sentiment within 2 seconds." },
      { name: "Layer 2: Resolution Agents", desc: "Five specialized agents pulling live Shopify order data to draft and resolve routine inquiries autonomously." },
      { name: "Layer 3: Escalation Agent", desc: "Flags high-value client tickets and edge cases, routing them directly to human reps with full context." }
    ],
    results: [
      { label: "Average Response Time", old: "6.2 hours", new: "1.4 hours" },
      { label: "Human Intervention Required", old: "100%", new: "38%" },
      { label: "Customer CSAT Score", old: "61%", new: "84%" }
    ]
  },
  "sales-lead-qualification": {
    industry: "B2B SaaS · Outbound Sales",
    title: "How We Helped A SaaS SDR Team Generate 3x More Qualified Pipeline",
    stat: "3x",
    statLabel: "More Qualified Pipeline",
    client: "B2B SaaS company selling workflow software with 300+ inbound leads per month.",
    challenge: "SDRs were spending 60% of their working hours on unqualified leads, missing high-intent buying signals.",
    architecture: [
      { name: "Component 1: Web Crawler & Enrichment", desc: "Enriches company size, tech stack, and news within 90 seconds of lead submission." },
      { name: "Component 2: Custom Fit Scoring", desc: "Machine learning scoring model trained on historical closed-won sales data." },
      { name: "Component 3: Intent Signal Triggers", desc: "Triggers priority alerts in HubSpot CRM when high-fit prospects exhibit buying behavior." }
    ],
    results: [
      { label: "Qualified Leads Per Month", old: "45", new: "138" },
      { label: "Discovery-to-Demo Conversion", old: "22%", new: "41%" },
      { label: "SDR Time Spent Unqualified", old: "60%", new: "15%" }
    ]
  },
  "internal-operations-assistant": {
    industry: "Professional Services · Operations",
    title: "Giving An Operations Team 40% Of Their Week Back With Slack AI Assistants",
    stat: "40%",
    statLabel: "Less Manual Work",
    client: "60-person professional services firm managing 20+ active client engagements.",
    challenge: "Operations team spent 12 hours every week manually building status updates and answering repetitive Slack questions.",
    architecture: [
      { name: "Integration Layer", desc: "API connections spanning Notion, Monday.com, Slack, Harvest, and Google Workspace." },
      { name: "Slack Natural Language Query Agent", desc: "Allows team members to query live project timelines, resources, and budgets directly in Slack." },
      { name: "Automated Dispatcher", desc: "Compiles and sends weekly status summaries automatically every Monday at 8 AM." }
    ],
    results: [
      { label: "Weekly Hours Saved Per Person", old: "0", new: "12 Hours" },
      { label: "Monday Report Generation Time", old: "4 Hours", new: "Automated" },
      { label: "Repetitive Internal Slack Inquiries", old: "100%", new: "-70%" }
    ]
  }
};

export default function CaseStudyDetail() {
  const { id } = useParams<{ id: string }>();
  const cs = id ? caseStudyData[id] : null;

  if (!cs) {
    return (
      <div className="bg-[#0A0A09] text-[#F8F7F3] min-h-screen pt-40 px-6 max-w-7xl mx-auto text-center font-mono">
        <h1 className="text-2xl mb-4">DISPATCH NOT FOUND</h1>
        <Link to="/case-studies" className="text-[#C7A24C] border-b border-[#C7A24C]">Return to Field Reports →</Link>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title={`${cs.title} — AJ & Co. Field Report`} 
        description={cs.challenge} 
      />

      <div className="bg-[#0A0A09] text-[#F8F7F3] selection:bg-[#C7A24C] selection:text-[#F8F7F3] font-sans min-h-screen pt-[140px] pb-24">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10">
          
          {/* Back link */}
          <div className="mb-8">
            <Link to="/case-studies" className="font-mono text-[0.72rem] tracking-[0.1em] text-[#8a877e] uppercase hover:text-[#C7A24C] transition-colors">
              ← Back to Field Reports
            </Link>
          </div>

          {/* Header */}
          <div className="mb-16 pb-8 border-b border-[#242320]">
            <div className="font-mono text-[0.72rem] text-[#C7A24C] tracking-[0.1em] uppercase mb-4">
              {cs.industry}
            </div>
            <h1 className="font-serif text-[clamp(2.2rem,4.8vw,4.2rem)] font-normal leading-[1.08] tracking-tight max-w-[24ch]">
              {cs.title}
            </h1>
          </div>

          {/* Stat Banner */}
          <div className="mb-16 p-8 border border-[#242320] bg-[#0A0A09] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="font-serif text-6xl text-[#F8F7F3]">
                {cs.stat}<span className="text-[#C7A24C] italic text-4xl"> Impact</span>
              </div>
              <div className="font-mono text-xs text-[#8a877e] uppercase tracking-[0.08em] mt-1">
                {cs.statLabel}
              </div>
            </div>
            <div className="max-w-xl text-sm text-[#cfccc2] font-light leading-relaxed">
              <strong>Client Profile:</strong> {cs.client}
            </div>
          </div>

          {/* Challenge & Architecture */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-20">
            <div className="lg:col-span-5 space-y-8">
              <div className="border border-[#242320] p-8">
                <div className="font-mono text-[0.72rem] text-[#C7A24C] tracking-[0.1em] uppercase mb-4">
                  THE OPERATIONAL BOTTLENECK
                </div>
                <p className="text-sm text-[#cfccc2] font-light leading-relaxed">
                  {cs.challenge}
                </p>
              </div>

              {/* Measured Outcomes */}
              <div className="border border-[#242320] p-8">
                <div className="font-mono text-[0.72rem] text-[#8a877e] tracking-[0.1em] uppercase mb-4">
                  MEASURED OUTCOMES
                </div>
                <div className="space-y-4">
                  {cs.results.map((r: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-xs font-mono border-b border-[#242320] pb-2">
                      <span className="text-[#cfccc2]">{r.label}</span>
                      <div className="space-x-3">
                        <span className="text-[#8a877e] line-through">{r.old}</span>
                        <span className="text-[#C7A24C] font-bold">{r.new}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <div className="font-mono text-[0.72rem] text-[#8a877e] tracking-[0.1em] uppercase mb-2">
                DEPLOYED ARCHITECTURE
              </div>
              <div className="border-t border-[#242320]">
                {cs.architecture.map((arch: any, i: number) => (
                  <div key={i} className="py-6 border-b border-[#242320]">
                    <h4 className="font-serif text-2xl font-normal mb-2">{arch.name}</h4>
                    <p className="text-sm text-[#cfccc2] font-light leading-relaxed">{arch.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA Box */}
          <div className="border border-[#3a382f] p-8 sm:p-14 relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="absolute -top-[11px] left-10 bg-[#0A0A09] px-2.5 font-mono text-[0.68rem] tracking-[0.12em] text-[#8a877e]">
              REPLICATE THESE RESULTS
            </div>
            <div>
              <div className="font-serif text-2xl sm:text-3xl font-normal">Want results like this for your team?</div>
              <p className="text-sm text-[#8a877e] font-light mt-2">Book a free strategy call to analyze your automation potential.</p>
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
