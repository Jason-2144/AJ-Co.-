import SEO from '../components/SEO';
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <>
      <SEO title="Privacy Policy — AJ & Co." description="Privacy policy and data protection principles for AJ & Co." canonicalUrl="/privacy-policy" />
      
      <div className="bg-[#f5f5f5] text-black selection:bg-black selection:text-white font-sans min-h-screen pt-[120px] pb-24">
        <div className="max-w-[1000px] mx-auto px-6 sm:px-10">
          
          <div className="mb-14 pb-10 border-b border-black/10">
            <span className="font-mono text-xs text-[#787878] tracking-[0.2em] uppercase">LEGAL DOCUMENTATION</span>
            <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] font-bold tracking-tight text-black mt-3">
              Privacy Policy
            </h1>
            <p className="mt-4 font-mono text-xs text-[#787878] uppercase">
              EFFECTIVE DATE: JANUARY 1, 2026
            </p>
          </div>

          <div className="bg-white p-8 sm:p-12 rounded-3xl border border-black/10 shadow-sm space-y-10 text-base text-[#545454] leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-black">1. Information We Collect</h2>
              <p>
                We collect personal information that you provide to us directly when filling out contact forms, booking strategy consultations, or communicating with us. This includes your name, work email address, company name, team size, and operational requirements.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-black">2. How We Use Information</h2>
              <p>
                We use collected information solely to scope custom AI agent projects, provide workflow automation services, communicate regarding scheduled consultations, and process client billing. We do not sell or rent user data to third parties.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-black">3. Data Security &amp; Storage</h2>
              <p>
                We maintain appropriate security safeguards to protect your personal data against unauthorized access, loss, or alteration. Token storage and authorization mechanisms follow enterprise OAuth 2.0 standards.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-black">4. Contact Us</h2>
              <p>
                If you have questions regarding this Privacy Policy, please reach out to our team at <a href="mailto:info@ajandco.site" className="text-black font-semibold underline underline-offset-4">info@ajandco.site</a>.
              </p>
            </section>

            <div className="pt-8 border-t border-black/10">
              <Link to="/" className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase text-black hover:opacity-70 transition-opacity">
                <ArrowLeft className="w-4 h-4" /> Return to Home
              </Link>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
