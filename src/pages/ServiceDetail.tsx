import { useParams, Link } from 'react-router-dom';
import SEO from '../components/SEO';
import React from 'react';
import { ArrowLeft, CheckCircle2, ArrowUpRight } from 'lucide-react';

const serviceData: Record<string, any> = {
  "ai-opportunity-assessment": {
    title: "AI Opportunity Assessment",
    sub: "Find the 5% of AI opportunities actually worth building before spending a single dollar on code.",
    problem: [
      "Most AI initiatives start with a tool, not a problem. A vendor sells leadership on a platform. A pilot gets approved. Six months later, the ROI never materialised.",
      "We fix that by auditing workflows, mapping data structures, and modeling financial returns before building."
    ],
    deliverables: [
      { num: "01", name: "Executive Alignment Workshop", desc: "Structured leadership sessions mapping strategic priorities against AI capabilities." },
      { num: "02", name: "Workflow & Process Audit", desc: "Deep-dive interviews identifying where manual effort compounds and decisions stall." },
      { num: "03", name: "ROI Financial Modeling", desc: "Quantified business cases (time saved, cost reduced) attached to every opportunity." },
      { num: "04", name: "Executive AI Readiness Roadmap", desc: "Prioritized deployment schedule with data infrastructure requirements and investment estimates." }
    ]
  },
  "custom-agent-development": {
    title: "Custom Agent Development",
    sub: "Production-ready AI agents engineered for your specific stack, handling real edge cases autonomously.",
    problem: [
      "Fragile AI demos break under real production workloads. Generic chatbots frustrate clients and fail when encountering unscripted user requests.",
      "We build multi-agent architectures that connect directly to your databases, APIs, and CRMs with strict fallback safeguards."
    ],
    deliverables: [
      { num: "01", name: "Customer Support Agents", desc: "Multi-layer triage, order lookup, and escalation systems operating 24/7." },
      { num: "02", name: "Sales & SDR Agents", desc: "Autonomous lead enrichment, fit scoring, and personalized outreach draft generation." },
      { num: "03", name: "Operations Assistants", desc: "Slack and Notion integrated agents answering team queries and tracking deliverables." },
      { num: "04", name: "Custom Workflow Engines", desc: "Tailored document parsing, medical triage, or legal contract analysis pipelines." }
    ]
  },
  "workflow-automation": {
    title: "Workflow Automation",
    sub: "Connect your disjointed software tools so information moves on its own without manual data entry.",
    problem: [
      "Every hour your team spends copy-pasting data between CRMs, spreadsheets, and email is an hour lost on revenue-generating work.",
      "We build resilient API pipelines between Make, n8n, HubSpot, and custom backends."
    ],
    deliverables: [
      { num: "01", name: "Lead & CRM Pipelines", desc: "Instantaneous lead enrichment, routing, and automated email follow-ups." },
      { num: "02", name: "Automated Reporting", desc: "Scheduled KPI dashboards compiled and dispatched automatically every week." },
      { num: "03", name: "Document Extraction", desc: "Invoices, receipts, and contract metadata parsed and filed without human review." },
      { num: "04", name: "Tool Synchronization", desc: "Two-way synchronization between Slack, Notion, Jira, Airtable, and Stripe." }
    ]
  },
  "enterprise-ai-training": {
    title: "Enterprise AI Training",
    sub: "Train your workforce until AI tools are embedded into daily team procedure.",
    problem: [
      "Shipping new AI tools is only half the job. Without tailored enablement, teams revert to old manual habits within 30 days.",
      "We run hands-on workshops and build customized playbooks to guarantee long-term adoption."
    ],
    deliverables: [
      { num: "01", name: "Role-Specific Enablement", desc: "Tailored workshops for Sales, Support, Operations, and Engineering." },
      { num: "02", name: "Custom Standard Playbooks", desc: "Step-by-step prompt libraries and operational rules built for your business." },
      { num: "03", name: "30-Day Adoption Audits", desc: "Tracking utilization metrics and optimizing prompts based on user feedback." },
      { num: "04", name: "Governance Frameworks", desc: "Establishing security, privacy, and compliance guidelines for internal AI usage." }
    ]
  }
};

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const service = id ? serviceData[id] : null;

  if (!service) {
    return (
      <div className="bg-[#f5f5f5] text-black min-h-screen pt-40 px-6 max-w-7xl mx-auto text-center font-mono">
        <h1 className="text-2xl mb-4">SPECIFICATION NOT FOUND</h1>
        <Link to="/services" className="text-black border-b border-black">Return to Capabilities Index →</Link>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title={`${service.title} — AJ & Co.`} 
        description={service.sub} 
      />

      <div className="bg-[#f5f5f5] text-black selection:bg-black selection:text-white font-sans min-h-screen pt-[120px] pb-24">
        <div className="max-w-[1280px] mx-auto px-6 sm:px-10">
          
          {/* Back link */}
          <div className="mb-8">
            <Link to="/services" className="inline-flex items-center gap-2 font-mono text-xs text-[#787878] uppercase hover:text-black transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Capabilities Index
            </Link>
          </div>

          {/* Header */}
          <div className="mb-16 pb-10 border-b border-black/10">
            <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] font-bold tracking-tight text-black leading-[1.05] max-w-[22ch]">
              {service.title}
            </h1>
            <p className="mt-6 text-lg text-[#545454] max-w-[48ch] font-normal leading-relaxed">
              {service.sub}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-6 bg-white p-8 sm:p-10 rounded-3xl border border-black/10 shadow-sm space-y-6">
              <span className="font-mono text-xs text-[#787878] uppercase tracking-widest block">PROBLEM &amp; ARCHITECTURE</span>
              {service.problem.map((p: string, i: number) => (
                <p key={i} className="text-[#545454] text-base leading-relaxed">{p}</p>
              ))}
            </div>

            <div className="lg:col-span-6 space-y-6">
              <span className="font-mono text-xs text-[#787878] uppercase tracking-widest block">CORE DELIVERABLES</span>
              <div className="grid grid-cols-1 gap-4">
                {service.deliverables.map((d: any, idx: number) => (
                  <div key={idx} className="bg-white p-6 rounded-2xl border border-black/10 shadow-sm flex items-start gap-4">
                    <span className="font-mono text-xs text-[#787878] pt-1">{d.num}</span>
                    <div>
                      <h4 className="text-lg font-bold text-black mb-1">{d.name}</h4>
                      <p className="text-[#545454] text-sm leading-relaxed">{d.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-20 bg-black text-white p-10 sm:p-14 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white">Ready to deploy this capability?</h3>
              <p className="text-white/70 text-sm mt-2">Book a 30-minute scoping call with our engineering team.</p>
            </div>
            <Link 
              to="/contact" 
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black text-xs font-bold uppercase tracking-wider rounded-full hover:bg-white/90 transition-all whitespace-nowrap"
            >
              Book Scoping Call →
            </Link>
          </div>

        </div>
      </div>
    </>
  );
}
