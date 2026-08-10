import SEO from '../components/SEO';
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CheckCircle2, Bot, Scan, GitBranch, GraduationCap } from 'lucide-react';

export default function Services() {
  const servicesList = [
    {
      id: "ai-opportunity-assessment",
      title: "AI Opportunity Assessment",
      category: "AUDIT & ROI MODELING",
      icon: Scan,
      body: "Before spending on code, we find what is actually worth building. We audit your workflows, map your data structures, and model financial ROI.",
      deliverables: ["Stakeholder Alignment Workshops", "Workflow & Process Audit", "ROI Financial Modeling", "Executive Readiness Roadmap"]
    },
    {
      id: "custom-agent-development",
      title: "Custom Agent Development",
      category: "MULTI-AGENT SYSTEMS",
      icon: Bot,
      body: "Production-ready AI agents tailored to your software stack. Customer support agents, sales assistants, internal ops bots — built to handle real edge cases.",
      deliverables: ["Customer Support Triage", "Sales & Lead SDR Agents", "Internal Ops Assistants", "Custom Research Engines"]
    },
    {
      id: "workflow-automation",
      title: "Workflow Automation",
      category: "ZERO-LATENCY PIPELINES",
      icon: GitBranch,
      body: "Connect your disjointed software tools so information moves on its own without manual data entry.",
      deliverables: ["Lead & CRM Automation", "Scheduled Reporting & KPI Dashboards", "Document Metadata Extraction", "Tool Synchronization"]
    },
    {
      id: "enterprise-ai-training",
      title: "Enterprise AI Training",
      category: "ENABLEMENT & ADOPTION",
      icon: GraduationCap,
      body: "We train your workforce until AI tools are embedded into daily team procedure.",
      deliverables: ["Role-Specific Workshops", "Custom Standard Playbooks", "30-Day Adoption Reviews", "Security Governance Frameworks"]
    }
  ];

  return (
    <>
      <SEO 
        title="Services & Capabilities — AJ & Co." 
        description="Autonomous AI agents, workflow automation pipelines, and custom web applications designed for business outcomes."
        canonicalUrl="/services" 
      />

      <div className="bg-[#f5f5f5] text-black selection:bg-black selection:text-white font-sans min-h-screen pt-[120px] pb-24">
        <div className="max-w-[1280px] mx-auto px-6 sm:px-10">
          
          {/* Header */}
          <div className="mb-16 pb-10 border-b border-black/10">
            <span className="font-mono text-xs text-[#787878] tracking-[0.2em] uppercase">§ 01 — CAPABILITIES INDEX</span>
            <h1 className="text-[clamp(2.5rem,5vw,4.8rem)] font-bold tracking-tight mt-3 text-black leading-[1.02]">
              AI Capabilities Built For <br />
              <span className="italic font-serif font-normal text-[#545454]">Real Business Outcomes.</span>
            </h1>
            <p className="mt-6 text-lg text-[#545454] max-w-[48ch] font-normal leading-relaxed">
              We do not sell software subscriptions. We build bespoke systems engineered to remove operational drag from your team permanently.
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {servicesList.map((service, idx) => (
              <div 
                key={idx} 
                className="bg-white p-8 sm:p-10 rounded-3xl border border-black/10 hover:border-black/30 transition-all shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <span className="font-mono text-xs text-[#787878] tracking-widest">{service.category}</span>
                    <service.icon className="w-6 h-6 text-black/70" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-black mb-4">{service.title}</h2>
                  <p className="text-[#545454] text-base leading-relaxed mb-8">{service.body}</p>
                </div>

                <div>
                  <h4 className="font-mono text-xs uppercase text-black font-semibold tracking-wider mb-4">Core Deliverables</h4>
                  <ul className="space-y-2 mb-8 font-mono text-xs text-[#545454]">
                    {service.deliverables.map((d, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-black shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>

                  <Link 
                    to={`/services/${service.id}`} 
                    className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase text-black border-b border-black pb-0.5 hover:opacity-70 transition-opacity"
                  >
                    Read Technical Specs <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Callout */}
          <div className="mt-20 bg-black text-white p-10 sm:p-14 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white">Not sure which service fits?</h3>
              <p className="text-white/70 text-sm mt-2">Start with a free strategy call to identify your high-impact opportunities.</p>
            </div>
            <Link 
              to="/contact" 
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black text-xs font-bold uppercase tracking-wider rounded-full hover:bg-white/90 transition-all whitespace-nowrap"
            >
              Book Strategy Session →
            </Link>
          </div>

        </div>
      </div>
    </>
  );
}
