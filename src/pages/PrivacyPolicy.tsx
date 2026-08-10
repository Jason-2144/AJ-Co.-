import SEO from '../components/SEO';
import React from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <>
      <SEO title="Privacy Policy — AJ & Co." description="Privacy policy and data protection principles for AJ & Co." canonicalUrl="/privacy-policy" />
      
      <div className="bg-[#0A0A09] text-[#F8F7F3] selection:bg-[#C7A24C] selection:text-[#F8F7F3] font-sans min-h-screen pt-[140px] pb-24">
        <div className="max-w-[1000px] mx-auto px-6 sm:px-10">
          
          <div className="mb-14 pb-8 border-b border-[#242320]">
            <div className="font-mono text-[0.72rem] text-[#C7A24C] tracking-[0.12em] uppercase mb-4">
              LEGAL DOCUMENTATION
            </div>
            <h1 className="font-serif text-[clamp(2.4rem,4.5vw,4.2rem)] font-normal leading-[1.08] tracking-tight">
              Privacy Policy
            </h1>
            <p className="mt-4 font-mono text-xs text-[#8a877e]">
              EFFECTIVE DATE: JANUARY 1, 2026
            </p>
          </div>

          <div className="space-y-10 text-[0.95rem] text-[#cfccc2] font-light leading-relaxed">
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-normal text-[#F8F7F3]">1. Information We Collect</h2>
              <p>
                We collect personal information that you provide to us directly when filling out contact forms, booking strategy consultations, or communicating with us. This includes your name, work email address, company name, team size, and operational requirements.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-normal text-[#F8F7F3]">2. How We Use Information</h2>
              <p>
                We use collected information solely to scope custom AI agent projects, provide workflow automation services, communicate regarding scheduled consultations, and process client billing. We do not sell or rent user data to third parties.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-normal text-[#F8F7F3]">3. Data Security & Storage</h2>
              <p>
                We maintain appropriate security safeguards to protect your personal data against unauthorized access, loss, or alteration. Token storage and authorization mechanisms follow enterprise OAuth 2.0 standards.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-normal text-[#F8F7F3]">4. Contact Us</h2>
              <p>
                If you have questions regarding this Privacy Policy, please reach out to our team at <a href="mailto:info@ajandco.site" className="text-[#F8F7F3] border-b border-[#C7A24C]">info@ajandco.site</a>.
              </p>
            </section>
          </div>

          <div className="mt-16 pt-8 border-t border-[#242320]">
            <Link to="/" className="font-mono text-[0.75rem] tracking-[0.08em] uppercase text-[#F8F7F3] border-b border-[#C7A24C] pb-0.5 hover:text-[#C7A24C] transition-colors">
              ← Return to Home
            </Link>
          </div>

        </div>
      </div>
    </>
  );
}
