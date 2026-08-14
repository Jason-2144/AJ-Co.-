import SEO from '../components/SEO';
import { useParams, Link } from 'react-router-dom';
import React from 'react';
import { ArrowLeft, ArrowUpRight, CheckCircle2 } from 'lucide-react';

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
      <div className="bg-[#f5f5f5] text-black min-h-screen pt-40 px-6 max-w-7xl mx-auto text-center font-mono">
        <h1 className="text-2xl mb-4">DISPATCH NOT FOUND</h1>
        <Link to="/case-studies" className="text-black border-b border-black">Return to Field Reports →</Link>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title={`${cs.title} — AJ & Co. Field Report`} 
        description={cs.challenge} 
      />

      <div className="bg-[#f5f5f5] text-black selection:bg-black selection:text-white font-sans min-h-screen pt-[120px] pb-24">
        <div className="max-w-[1280px] mx-auto px-6 sm:px-10">
          
          {/* Back link */}
          <div className="mb-8">
            <Link to="/case-studies" className="inline-flex items-center gap-2 font-mono text-xs text-[#787878] uppercase hover:text-black transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Field Reports
            </Link>
          </div>

          {/* Header */}
          <div className="mb-16 pb-10 border-b border-black/10">
            <span className="font-mono text-xs text-[#787878] uppercase tracking-[0.2em] block mb-3">
              {cs.industry}
            </span>
            <h1 className="text-[clamp(2.2rem,4.8vw,4.2rem)] font-bold tracking-tight text-black leading-[1.08] max-w-[24ch]">
              {cs.title}
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-7 space-y-8">
              <div className="bg-white p-8 sm:p-10 rounded-3xl border border-black/10 shadow-sm space-y-6">
                <span className="font-mono text-xs text-[#787878] uppercase tracking-widest block">CLIENT CONTEXT &amp; CHALLENGE</span>
                <p className="text-black font-semibold text-lg">{cs.client}</p>
                <p className="text-[#545454] text-base leading-relaxed">{cs.challenge}</p>
              </div>

              <div className="bg-white p-8 sm:p-10 rounded-3xl border border-black/10 shadow-sm space-y-6">
                <span className="font-mono text-xs text-[#787878] uppercase tracking-widest block">ENGINEERING ARCHITECTURE</span>
                <div className="space-y-4">
                  {cs.architecture.map((arch: any, idx: number) => (
                    <div key={idx} className="p-4 bg-[#f5f5f5] rounded-2xl border border-black/5">
                      <h4 className="font-bold text-black text-base mb-1">{arch.name}</h4>
                      <p className="text-[#545454] text-sm leading-relaxed">{arch.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-8">
              <div className="bg-black text-white p-8 sm:p-10 rounded-3xl shadow-xl">
                <span className="font-mono text-xs text-white/60 uppercase tracking-widest block mb-4">PRIMARY IMPACT METRIC</span>
                <div className="text-6xl font-bold tracking-tight text-white mb-2">{cs.stat}</div>
                <div className="font-mono text-xs uppercase text-white/80 tracking-wider mb-6">{cs.statLabel}</div>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-black/10 shadow-sm space-y-6">
                <span className="font-mono text-xs text-[#787878] uppercase tracking-widest block">MEASURED DELTA</span>
                <div className="space-y-4">
                  {cs.results.map((res: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center py-3 border-b border-black/5 last:border-0">
                      <span className="text-sm font-semibold text-black">{res.label}</span>
                      <div className="text-right font-mono text-xs">
                        <span className="line-through text-[#787878] mr-2">{res.old}</span>
                        <span className="text-black font-bold">{res.new}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-20 bg-black text-white p-10 sm:p-14 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white">Need similar outcomes for your team?</h3>
              <p className="text-white/70 text-sm mt-2">Book an engineering consultation to review your workflow.</p>
            </div>
            <Link 
              to="/contact" 
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black text-xs font-bold uppercase tracking-wider rounded-full hover:bg-white/90 transition-all whitespace-nowrap"
            >
              Book Consultation →
            </Link>
          </div>

        </div>
      </div>
    </>
  );
}
