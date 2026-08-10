import { useParams, Link } from 'react-router-dom';
import SEO from '../components/SEO';
import React from 'react';

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
      <div className="bg-[#0A0A09] text-[#F8F7F3] min-h-screen pt-40 px-6 max-w-7xl mx-auto text-center font-mono">
        <h1 className="text-2xl mb-4">DISPATCH NOT FOUND</h1>
        <Link to="/services" className="text-[#C7A24C] border-b border-[#C7A24C]">Return to Services Index →</Link>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title={`${service.title} — AJ & Co.`} 
        description={service.sub} 
      />

      <div className="bg-[#0A0A09] text-[#F8F7F3] selection:bg-[#C7A24C] selection:text-[#F8F7F3] font-sans min-h-screen pt-[140px] pb-24">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10">
          
          {/* Back link */}
          <div className="mb-8">
            <Link to="/services" className="font-mono text-[0.72rem] tracking-[0.1em] text-[#8a877e] uppercase hover:text-[#C7A24C] transition-colors">
              ← Back to Capabilities Index
            </Link>
          </div>

          {/* Header */}
          <div className="mb-16 pb-8 border-b border-[#242320]">
            <h1 className="font-serif text-[clamp(2.5rem,5.5vw,4.8rem)] font-normal leading-[1.05] tracking-tight max-w-[22ch]">
              {service.title}
            </h1>
            <p className="mt-6 text-[1.1rem] text-[#cfccc2] max-w-[48ch] font-light leading-relaxed">
              {service.sub}
            </p>
          </div>

          {/* Context Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-20">
            <div className="lg:col-span-5 border border-[#242320] p-8 bg-[#0A0A09]">
              <div className="font-mono text-[0.72rem] text-[#C7A24C] tracking-[0.1em] uppercase mb-4">
                THE OPERATIONAL PROBLEM
              </div>
              <div className="space-y-4 text-sm text-[#cfccc2] font-light leading-relaxed">
                {service.problem.map((p: string, i: number) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <div className="font-mono text-[0.72rem] text-[#8a877e] tracking-[0.1em] uppercase mb-2">
                CORE DELIVERABLES
              </div>
              <div className="border-t border-[#242320]">
                {service.deliverables.map((item: any, i: number) => (
                  <div key={i} className="py-5 border-b border-[#242320] grid grid-cols-[50px_1fr] gap-4">
                    <span className="font-mono text-xs text-[#8a877e] pt-1">{item.num}</span>
                    <div>
                      <h4 className="font-serif text-xl font-normal mb-1">{item.name}</h4>
                      <p className="text-xs text-[#cfccc2] font-light leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA Box */}
          <div className="border border-[#3a382f] p-8 sm:p-14 relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="absolute -top-[11px] left-10 bg-[#0A0A09] px-2.5 font-mono text-[0.68rem] tracking-[0.12em] text-[#8a877e]">
              ENGAGEMENT INITIATION
            </div>
            <div>
              <div className="font-serif text-2xl sm:text-3xl font-normal">Ready to scope this capability?</div>
              <p className="text-sm text-[#8a877e] font-light mt-2">Book a free 30-minute consultation with our engineering leads.</p>
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
