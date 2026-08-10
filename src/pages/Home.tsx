import SEO from '../components/SEO';
import React, { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';

const Spline = lazy(() => import('@splinetool/react-spline'));

export default function Home() {
  return (
    <>
      <SEO 
        title="AJ & Co. — Engineering the Unmanned Workflow"
        description="AJ & Co. designs AI agents, chatbots, and automation pipelines for founders who are tired of doing the same task twice."
      />

      <div className="bg-[#0A0A09] text-[#F8F7F3] selection:bg-[#C7A24C] selection:text-[#F8F7F3] font-sans min-h-screen">
        
        {/* ================= HERO ================= */}
        <header className="relative min-h-screen pt-[140px] pb-12 px-6 sm:px-10 max-w-[1440px] mx-auto flex flex-col justify-between overflow-hidden" id="top">
          
          {/* Fullscreen 3D Spline Robot Canvas Background */}
          <div className="absolute inset-0 z-0 w-full h-full pointer-events-auto">
            <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-xs font-mono text-gray-500">Loading 3D Experience...</div>}>
              <Spline 
                scene="https://prod.spline.design/nGTNHOEWh-Q122fP/scene.splinecode" 
                className="w-full h-full"
              />
            </Suspense>
          </div>

          {/* Clean 3D Robot Background — Zero Dark Overlay */}

          {/* Foreground Editorial Content */}
          <div className="relative z-10 pointer-events-none">


            <h1 className="font-serif font-normal text-[clamp(2.6rem,7vw,6.4rem)] leading-[0.98] tracking-tight max-w-[15ch] text-[#0A0A09]">
              We build the staff<br />
              that never <span className="italic text-[#C7A24C]">clocks out.</span>
            </h1>

            <p className="mt-7 max-w-[44ch] text-[1.05rem] leading-[1.55] text-[#0A0A09] font-medium">
              AJ &amp; Co. designs AI agents, chatbots, and automation pipelines for founders who are tired of doing the same task twice — plus the websites that make the case for you while you sleep.
            </p>
          </div>

          <div className="relative z-10 flex justify-between items-end gap-6 flex-wrap mt-20 pb-4 pointer-events-auto">
            <div className="font-mono text-[0.7rem] tracking-[0.1em] uppercase text-[#8a877e] flex items-center gap-3">
              <div className="w-[1px] h-[34px] bg-[#3a382f] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[40%] bg-[#C7A24C] animate-pulse" />
              </div> 
              Scroll to explore
            </div>
          </div>

          <Link 
            to="/contact" 
            className="absolute bottom-16 right-12 z-50 font-mono text-[0.8rem] tracking-[0.1em] uppercase border border-[#F8F7F3] px-9 py-4 bg-[#0A0A09] text-[#F8F7F3] hover:bg-[#F8F7F3] hover:text-[#0A0A09] transition-all duration-250 shadow-2xl"
          >
            Start a project →
          </Link>

          {/* Smooth White-to-Black Fade Transition Under Robot Hero */}
          <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-b from-transparent via-[#0A0A09]/60 to-[#0A0A09] pointer-events-none z-10" />
        </header>

        {/* ================= SERVICES ================= */}
        <section id="services" className="max-w-[1440px] mx-auto py-24 sm:py-32 px-6 sm:px-10">
          <div className="flex justify-between items-end gap-5 flex-wrap mb-14 pb-5 border-b border-[#242320]">
            <div>
              <div className="font-mono text-[0.72rem] text-[#C7A24C] tracking-[0.1em]">§ 01 — INDEX</div>
              <div className="font-serif text-[clamp(1.9rem,4vw,3rem)] font-normal mt-1.5">What we build</div>
            </div>
            <p className="text-[0.95rem] text-[#8a877e] max-w-[34ch] font-light">
              Four disciplines, one team. We scope narrow and ship the thing that removes the task from your calendar.
            </p>
          </div>

          <div className="border-t border-[#242320]">
            {[
              { num: "01", title: "AI Agents", body: "Custom agents that read, decide, and act inside your existing tools — qualifying leads, drafting responses, or handling the research your team keeps postponing." },
              { num: "02", title: "Chatbots", body: "Conversational front doors trained on your business, not a generic script — for support, onboarding, or sales, wired into the systems you already run." },
              { num: "03", title: "Automation Pipelines", body: "The connective tissue between your apps — CRM, email, spreadsheets, forms — so information moves on its own and nothing falls through a manual step." },
              { num: "04", title: "Web Development", body: "Fast, crawlable, conversion-minded sites built to hold up under real traffic — the storefront your automation work eventually needs to point to." }
            ].map((item, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-[70px_1fr_1fr] gap-4 md:gap-6 items-start py-8 border-b border-[#242320] hover:bg-white/[0.02] transition-colors">
                <div className="font-mono text-[#8a877e] text-[0.85rem] pt-1">{item.num}</div>
                <div className="font-serif text-2xl sm:text-3xl font-normal">{item.title}</div>
                <div className="text-[#cfccc2] text-[0.92rem] leading-relaxed font-light">{item.body}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= CASE STUDIES ================= */}
        <section id="work" className="max-w-[1440px] mx-auto py-24 sm:py-32 px-6 sm:px-10">
          <div className="flex justify-between items-end gap-5 flex-wrap mb-14 pb-5 border-b border-[#242320]">
            <div>
              <div className="font-mono text-[0.72rem] text-[#C7A24C] tracking-[0.1em]">§ 02 — FIELD REPORTS</div>
              <div className="font-serif text-[clamp(1.9rem,4vw,3rem)] font-normal mt-1.5">Recent dispatches</div>
            </div>
            <p className="text-[0.95rem] text-[#8a877e] max-w-[34ch] font-light">
              A sample of what shipped, and what changed once it did.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[1px] bg-[#242320] border border-[#242320]">
            {[
              { tag: "Mobility · Geospatial Forecasting", stat: "90", unit: "%", desc: "of pickups met a five-minute SLA after we modeled demand across the service area.", name: "NURA Electric Mobility" },
              { tag: "Sports Ops · Tournament Platform", stat: "1,000", unit: "+", desc: "players run through 15+ tournaments on a platform we built to automate brackets, scoring, and check-in.", name: "Hyderabad Pickleball Association" },
              { tag: "Retail · Web & Booking", stat: "1", unit: ":1", desc: "appointment-to-fitting conversion after we rebuilt the booking flow around how clients actually browse.", name: "Balani Custom Suits" },
              { tag: "SaaS · Outbound Automation", stat: "24", unit: "/7", desc: "lead research and outreach running unattended, freeing the founder from the pipeline's manual first mile.", name: "Stan Ventures" }
            ].map((cs, idx) => (
              <div key={idx} className="bg-[#0A0A09] p-8 sm:p-11 flex flex-col gap-4 min-h-[340px]">
                <div className="font-mono text-[0.68rem] tracking-[0.08em] text-[#8a877e] uppercase">{cs.tag}</div>
                <div className="font-serif text-5xl sm:text-6xl text-[#F8F7F3] leading-none font-normal">
                  {cs.stat}<span className="text-[#C7A24C] italic">{cs.unit}</span>
                </div>
                <div className="text-[0.88rem] text-[#cfccc2] leading-relaxed font-light">{cs.desc}</div>
                <div className="font-serif text-xl sm:text-2xl mt-auto pt-4">{cs.name}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= ABOUT ================= */}
        <section id="about" className="max-w-[1440px] mx-auto py-24 sm:py-32 px-6 sm:px-10">
          <div className="mb-14 pb-5 border-b border-[#242320]">
            <div className="font-mono text-[0.72rem] text-[#C7A24C] tracking-[0.1em]">§ 03 — MASTHEAD</div>
            <div className="font-serif text-[clamp(1.9rem,4vw,3rem)] font-normal mt-1.5">Who's behind the byline</div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-20">
            <div>
              <p className="font-serif text-[clamp(1.5rem,2.6vw,2.1rem)] leading-[1.35] font-normal">
                Two operators, one <span className="text-[#C7A24C] italic">low-overhead studio</span> — built to earn in dollars while running on Indian cost structures.
              </p>
              <p className="text-[0.95rem] leading-relaxed text-[#cfccc2] font-light mt-6">
                AJ &amp; Co. started because client acquisition was the hard part, not the building. Jason leads product and delivery from Chennai; Amaan runs execution and outreach; a Texas-based partner handles the US-facing conversations that a cold email alone can't close. Every engagement is scoped by someone who's felt the operational pain being automated — that's the filter for who we take on.
              </p>
            </div>

            <div>
              <div className="border-t border-[#242320]">
                {[
                  { name: "Jason", role: "Product & Delivery — Chennai" },
                  { name: "Amaan", role: "Execution & Outreach" },
                  { name: "US Desk", role: "Client Acquisition — Austin, TX" },
                  { name: "Ideal client", role: "Seed–early growth, <30 people" }
                ].map((r, idx) => (
                  <div key={idx} className="flex justify-between items-center py-4 border-b border-[#242320] font-mono text-[0.78rem] tracking-[0.03em]">
                    <span className="text-[#F8F7F3]">{r.name}</span>
                    <span className="text-[#8a877e] uppercase tracking-[0.06em]">{r.role}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================= CONTACT ================= */}
        <section id="contact" className="max-w-[1440px] mx-auto py-24 sm:py-32 px-6 sm:px-10">
          <div className="border border-[#3a382f] p-8 sm:p-16 relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-10 items-end">
            <div className="absolute -top-[11px] left-10 bg-[#0A0A09] px-2.5 font-mono text-[0.68rem] tracking-[0.12em] text-[#8a877e]">
              CORRESPONDENCE
            </div>

            <div>
              <div className="font-serif text-[clamp(1.8rem,3.4vw,2.6rem)] leading-[1.15] max-w-[16ch]">
                Have a workflow worth <span className="text-[#C7A24C] italic">killing?</span>
              </div>
              <div className="font-mono text-[0.82rem] text-[#8a877e] mt-5 leading-loose">
                info@ajandco.site<br />
                <a href="https://ajandco.site" target="_blank" rel="noopener noreferrer" className="text-[#F8F7F3] border-b border-[#C7A24C]">
                  ajandco.site
                </a><br />
                Chennai, IN — Austin, TX
              </div>
            </div>

            <a 
              href="mailto:info@ajandco.site" 
              className="font-mono text-[0.85rem] tracking-[0.08em] uppercase border border-[#F8F7F3] px-8 py-4 hover:bg-[#F8F7F3] hover:text-[#0A0A09] transition-all text-center inline-block"
            >
              Send an inquiry →
            </a>
          </div>
        </section>

      </div>
    </>
  );
}
