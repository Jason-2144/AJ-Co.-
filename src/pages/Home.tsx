import SEO from '../components/SEO';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Plus, Minus, Layers, Zap, Cpu, Sparkles, Check, ChevronRight } from 'lucide-react';
import Spline from '@splinetool/react-spline';

export default function Home() {
  const [activeAccordion, setActiveAccordion] = useState<number | null>(0);
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const cursorDotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Mutate the dot's position directly instead of via setState
    let raf = 0;
    const handleMouseMove = (e: MouseEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        if (cursorDotRef.current) {
          cursorDotRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
        }
        raf = 0;
      });
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const bentoItems = [
    {
      id: "01",
      category: "AI AGENTS",
      title: "Autonomous Workforce",
      desc: "Custom AI agents engineered to perform complex, multi-step tasks inside your software ecosystem 24/7.",
      span: "col-span-12 md:col-span-8",
      highlight: "99.4% Accuracy Rate"
    },
    {
      id: "02",
      category: "CHATBOTS",
      title: "Contextual Front Doors",
      desc: "Conversational interfaces trained on your exact business knowledge base and CRM data.",
      span: "col-span-12 md:col-span-4",
      highlight: "Instant Setup"
    },
    {
      id: "03",
      category: "AUTOMATION",
      title: "Zero-Latency Pipelines",
      desc: "Eliminate manual data entry between your apps with resilient API integrations and fallback safeguards.",
      span: "col-span-12 md:col-span-5",
      highlight: "10x Throughput"
    },
    {
      id: "04",
      category: "WEB DEV",
      title: "Bespoke Digital Platforms",
      desc: "Blazing fast, conversion-optimized web applications designed to convert automated leads into enterprise clients.",
      span: "col-span-12 md:col-span-7",
      highlight: "Sub-100ms Load Time"
    }
  ];

  const caseStudies = [
    {
      client: "NURA Electric Mobility",
      category: "Geospatial Forecasting",
      metric: "90%",
      label: "5-Minute SLA Pickup Rate",
      desc: "Machine learning demand model predicting vehicle placement across metropolitan pickup zones."
    },
    {
      client: "Hyderabad Pickleball Assoc.",
      category: "Tournament Automation",
      metric: "1,000+",
      label: "Active Bracket Players",
      desc: "Autonomous player check-in, real-time match scoring, and automatic court scheduling."
    },
    {
      client: "Balani Custom Suits",
      category: "Booking Flow Engineering",
      metric: "1:1",
      label: "Appointment Conversion",
      desc: "Re-engineered client browsing flow increasing high-intent private fitting bookings."
    },
    {
      client: "Stan Ventures",
      category: "Outbound Pipeline Agent",
      metric: "24/7",
      label: "Unattended Prospecting",
      desc: "Lead enrichment and AI email draft generation executing continuous pipeline research."
    }
  ];

  const faqs = [
    {
      q: "How fast can an automated AI agent be deployed into production?",
      a: "We ship initial working Proof of Concepts (PoC) within 2 weeks, followed by full security auditing and production deployment in 4 to 6 weeks."
    },
    {
      q: "Do we need to upgrade our existing software stack first?",
      a: "No. Our automation pipelines and agents connect directly to your existing tools (HubSpot, Salesforce, Slack, Notion, custom APIs) without requiring software overhauls."
    },
    {
      q: "What security measures protect our company data?",
      a: "Every deployment adheres to strict enterprise governance. Your data is never used to train public LLM models, and all API interactions use OAuth 2.0 and encrypted storage."
    },
    {
      q: "How do you ensure ongoing adoption by our internal team?",
      a: "We stay with you post-launch for 30–90 days, conducting role-specific workshops, building custom playbooks, and tracking daily system utilization."
    }
  ];

  return (
    <>
      <SEO 
        title="AJ & Co. — AI Engineering Studio"
        description="AJ & Co. builds autonomous AI agents, intelligent workflow automation pipelines, and high-performance web systems for modern businesses."
      />

      <div className="bg-[#f5f5f5] text-[#000000] selection:bg-[#000000] selection:text-[#ffffff] font-sans min-h-screen overflow-x-hidden relative">
        
        {/* Ambient Subtle Background Grid */}
        <div 
          className="fixed inset-0 pointer-events-none opacity-[0.03] z-0" 
          style={{ backgroundImage: `radial-[#000] 1px, transparent 1px)`, backgroundSize: '32px 32px' }}
        />

        {/* Floating Custom Cursor Dot */}
        <div
          ref={cursorDotRef}
          className="fixed left-0 top-0 w-4 h-4 bg-black rounded-full pointer-events-none z-50 hidden md:block mix-blend-difference will-change-transform"
        />

        {/* ================= HERO SECTION ================= */}
        <section className="relative pt-36 pb-24 px-6 sm:px-10 max-w-[1280px] mx-auto min-h-[85vh] flex flex-col justify-between z-10 overflow-hidden">
          
          {/* 3D Spline Stage */}
          <div className="absolute inset-0 z-0 w-full h-full pointer-events-auto flex items-center justify-center">
            <Spline 
              scene="https://prod.spline.design/psWR0IHSdjlcfsjA/scene.splinecode" 
              className="w-full h-full"
            />
          </div>
          
          <div className="relative z-10">
            <motion.div 
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-black/5 border border-black/10 text-xs font-mono tracking-wider uppercase text-black/70 mb-8 backdrop-blur-sm"
            >
              <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
              AJ &amp; CO. STUDIO · AI &amp; AUTOMATION
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}
              className="text-[clamp(2.8rem,7vw,6.5rem)] font-bold tracking-[-0.04em] leading-[0.98] text-[#000000] max-w-[16ch]"
            >
              We build the staff <br />
              that never <span className="italic font-serif font-normal text-[#545454]">clocks out.</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
              className="mt-8 max-w-[48ch] text-[1.15rem] leading-[1.6] text-[#545454] font-normal backdrop-blur-[2px] bg-white/40 p-2 rounded-xl border border-black/5"
            >
              AJ &amp; Co. designs AI agents, chatbots, and automation pipelines for founders who are tired of doing the same task twice — plus the websites that make the case for you while you sleep.
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-wrap items-center justify-between gap-6 pt-16 border-b border-black/10 pb-10"
          >
            <div className="flex items-center gap-4">
              <Link 
                to="/contact" 
                className="group relative inline-flex items-center gap-3 px-8 py-4 bg-black text-white text-sm font-semibold tracking-wide rounded-full overflow-hidden transition-all duration-300 hover:bg-black/90 hover:scale-[1.02] shadow-lg"
              >
                <span>Start a Project</span>
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>

              <Link 
                to="/services" 
                className="inline-flex items-center gap-2 px-7 py-4 border border-black/15 text-black text-sm font-semibold tracking-wide rounded-full hover:bg-black/5 transition-all duration-300"
              >
                Explore Capabilities
              </Link>
            </div>

            <div className="flex items-center gap-8 font-mono text-xs text-[#787878] uppercase tracking-widest">
              <div>CHENNAI — AUSTIN</div>
              <div>·</div>
              <div>ISSUE NO. 004</div>
            </div>
          </motion.div>
        </section>

        {/* ================= BENTO GRID SERVICES SECTION ================= */}
        <section id="services" className="py-24 px-6 sm:px-10 max-w-[1280px] mx-auto z-10 relative">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16">
            <div>
              <span className="font-mono text-xs tracking-[0.2em] text-[#787878] uppercase">§ 01 — CAPABILITIES</span>
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-black mt-2">What we build.</h2>
            </div>
            <p className="text-[#545454] max-w-[36ch] text-base leading-relaxed">
              Modular AI disciplines engineered to remove operational drag from your organization.
            </p>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {bentoItems.map((item, idx) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className={`${item.span} bg-white p-8 sm:p-10 rounded-3xl border border-black/10 hover:border-black/30 transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col justify-between group min-h-[300px]`}
              >
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <span className="font-mono text-xs text-[#787878] tracking-widest">{item.id} / {item.category}</span>
                    <span className="text-[11px] font-mono uppercase bg-black/5 px-3 py-1 rounded-full text-black/70 font-semibold">{item.highlight}</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-black group-hover:text-black/80 transition-colors mb-4">{item.title}</h3>
                  <p className="text-[#545454] text-base leading-relaxed font-normal">{item.desc}</p>
                </div>

                <div className="pt-8 mt-auto flex items-center justify-between border-t border-black/5">
                  <Link 
                    to="/services" 
                    className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase text-black group-hover:translate-x-1 transition-transform"
                  >
                    View Specifications <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ================= FIELD REPORTS / CASE STUDIES SECTION ================= */}
        <section id="work" className="py-24 px-6 sm:px-10 max-w-[1280px] mx-auto z-10 relative">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16">
            <div>
              <span className="font-mono text-xs tracking-[0.2em] text-[#787878] uppercase">§ 02 — FIELD REPORTS</span>
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-black mt-2">Proven Dispatches.</h2>
            </div>
            <Link 
              to="/case-studies"
              className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-black border-b border-black pb-0.5 hover:opacity-70 transition-opacity"
            >
              View All Case Studies →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {caseStudies.map((cs, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="bg-white p-8 sm:p-10 rounded-3xl border border-black/10 hover:border-black/30 transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <span className="font-mono text-xs text-[#787878] uppercase tracking-wider block mb-4">{cs.category}</span>
                  <div className="text-5xl sm:text-6xl font-bold tracking-tight text-black mb-2">
                    {cs.metric}
                  </div>
                  <div className="font-mono text-xs uppercase text-black font-semibold tracking-wider mb-6">{cs.label}</div>
                  <p className="text-[#545454] text-base leading-relaxed mb-8">{cs.desc}</p>
                </div>

                <div className="pt-6 border-t border-black/5 flex justify-between items-center">
                  <span className="font-bold text-xl text-black">{cs.client}</span>
                  <Link to="/case-studies" className="w-10 h-10 rounded-full border border-black/10 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                    <ArrowUpRight className="w-5 h-5" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ================= ACCORDION / FAQ SECTION ================= */}
        <section id="process" className="py-24 px-6 sm:px-10 max-w-[1280px] mx-auto z-10 relative">
          <div className="max-w-3xl mb-16">
            <span className="font-mono text-xs tracking-[0.2em] text-[#787878] uppercase">§ 03 — FREQUENT QUESTIONS</span>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-black mt-2">Clear Answers.</h2>
          </div>

          <div className="max-w-4xl space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx}
                className="bg-white rounded-2xl border border-black/10 overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => setActiveAccordion(activeAccordion === idx ? null : idx)}
                  className="w-full p-6 sm:p-8 text-left flex justify-between items-center gap-4 cursor-pointer focus:outline-none"
                >
                  <span className="text-lg sm:text-xl font-bold text-black">{faq.q}</span>
                  <div className="w-8 h-8 rounded-full border border-black/10 flex items-center justify-center shrink-0">
                    {activeAccordion === idx ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                </button>

                <AnimatePresence>
                  {activeAccordion === idx && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="px-6 sm:px-8 pb-8 text-[#545454] text-base leading-relaxed"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>

        {/* ================= STACKGRID CTA SECTION ================= */}
        <section id="contact" className="py-24 px-6 sm:px-10 max-w-[1280px] mx-auto z-10 relative">
          <div className="bg-black text-white p-10 sm:p-20 rounded-[40px] relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-10 shadow-2xl">
            <div className="relative z-10 max-w-xl">
              <span className="font-mono text-xs uppercase tracking-widest text-white/60">INITIATE CONSULTATION</span>
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mt-4 leading-tight">
                Have a workflow worth killing?
              </h2>
              <p className="mt-6 text-white/70 text-base leading-relaxed">
                Schedule a free 30-minute strategy call with our automation architects. We scope narrow and quantify ROI before taking on any project.
              </p>
            </div>

            <div className="relative z-10 shrink-0">
              <Link 
                to="/contact" 
                className="inline-flex items-center gap-3 px-9 py-5 bg-white text-black text-sm font-bold tracking-wide rounded-full hover:bg-white/90 hover:scale-[1.03] transition-all shadow-xl"
              >
                Book Strategy Call →
              </Link>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
