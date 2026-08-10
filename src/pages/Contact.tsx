import SEO from '../components/SEO';
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, CheckCircle2, Loader2, ArrowUpRight } from 'lucide-react';

export default function Contact() {
  const [formData, setFormData] = useState({
    fullName: '',
    workEmail: '',
    companyName: '',
    companySize: '1–10',
    situation: "I'm exploring AI for the first time",
    challenge: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.fullName || !formData.workEmail || !formData.companyName) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.workEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const providedUrl = "https://script.google.com/macros/s/AKfycbyk3VT_AqU0ZL0YZGDBEnamiZtndlUlmalVpav5UV8o4pjHSic8VjhvrC_D14sHpQ/exec";
      const WEBHOOK_URL = (import.meta as any).env.VITE_GOOGLE_WEBHOOK_URL || providedUrl;

      await fetch(WEBHOOK_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(formData),
      });

      setIsSuccess(true);
    } catch (error) {
      console.error(error);
      setErrorMsg(error instanceof Error ? error.message : "Something went wrong while submitting your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEO title="Book Strategy Call — AJ & Co." description="Schedule a free 30-minute AI strategy consultation with our engineering team." canonicalUrl="/contact" />
      
      <div className="bg-[#f5f5f5] text-black selection:bg-black selection:text-white font-sans min-h-screen pt-[120px] pb-24">
        <div className="max-w-[1280px] mx-auto px-6 sm:px-10">
          
          {/* Header */}
          <div className="mb-16 pb-10 border-b border-black/10">
            <span className="font-mono text-xs text-[#787878] tracking-[0.2em] uppercase">INITIATE CONSULTATION</span>
            <h1 className="text-[clamp(2.5rem,5vw,4.8rem)] font-bold tracking-tight mt-3 text-black leading-[1.02]">
              Let's Figure Out What AI <br />
              Can Do For <span className="italic font-serif font-normal text-[#545454]">Your Business.</span>
            </h1>
            <p className="mt-6 text-lg text-[#545454] max-w-[48ch] font-normal leading-relaxed">
              Start with a free 30-minute strategy call. No commitment. No hard sell. Just clarity on high-impact automation targets.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Left Info Column */}
            <div className="lg:col-span-5 space-y-8">
              <div className="bg-white p-8 rounded-3xl border border-black/10 shadow-sm">
                <span className="font-mono text-xs uppercase tracking-widest text-[#787878] block mb-4">WHAT HAPPENS ON THE CALL</span>
                <ul className="space-y-4 text-sm text-[#545454] font-normal">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-black shrink-0 mt-0.5" />
                    Identify the repetitive workflows currently consuming your team's hours.
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-black shrink-0 mt-0.5" />
                    Calculate projected financial ROI &amp; time savings for top opportunities.
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-black shrink-0 mt-0.5" />
                    Receive an architectural blueprint for custom AI agents &amp; integrations.
                  </li>
                </ul>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-black/10">
                <span className="font-mono text-xs uppercase tracking-widest text-[#787878] block mb-2">DIRECT CORRESPONDENCE</span>
                <p className="text-xl font-bold text-black mb-1">info@ajandco.site</p>
                <p className="text-xs text-[#787878] font-mono">Chennai, IN — Austin, TX</p>
              </div>
            </div>

            {/* Right Booking Form Column */}
            <div className="lg:col-span-7 bg-white p-8 sm:p-12 rounded-3xl border border-black/10 shadow-sm">
              {isSuccess ? (
                <div className="py-12 text-center space-y-6">
                  <CheckCircle2 className="w-16 h-16 text-black mx-auto" />
                  <h3 className="text-3xl font-bold text-black">Strategy Call Requested</h3>
                  <p className="text-[#545454] text-base max-w-md mx-auto leading-relaxed">
                    Thank you, {formData.fullName}. Our team has received your request and will reach out to <strong className="text-black">{formData.workEmail}</strong> within 2 hours to confirm your calendar slot.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {errorMsg && (
                    <div className="p-4 border border-red-500/40 bg-red-500/10 text-red-600 text-xs font-mono rounded-xl">
                      {errorMsg}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block font-mono text-xs uppercase tracking-wider text-[#787878] mb-2">
                        Full Name *
                      </label>
                      <input 
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        placeholder="Alex Morgan"
                        className="w-full bg-[#f5f5f5] border border-black/10 rounded-xl px-4 py-3.5 text-sm text-black focus:border-black outline-none transition-colors"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-xs uppercase tracking-wider text-[#787878] mb-2">
                        Work Email *
                      </label>
                      <input 
                        type="email"
                        name="workEmail"
                        value={formData.workEmail}
                        onChange={handleInputChange}
                        placeholder="alex@company.com"
                        className="w-full bg-[#f5f5f5] border border-black/10 rounded-xl px-4 py-3.5 text-sm text-black focus:border-black outline-none transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block font-mono text-xs uppercase tracking-wider text-[#787878] mb-2">
                        Company Name *
                      </label>
                      <input 
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleInputChange}
                        placeholder="Acme Corp"
                        className="w-full bg-[#f5f5f5] border border-black/10 rounded-xl px-4 py-3.5 text-sm text-black focus:border-black outline-none transition-colors"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-xs uppercase tracking-wider text-[#787878] mb-2">
                        Company Size
                      </label>
                      <select
                        name="companySize"
                        value={formData.companySize}
                        onChange={handleInputChange}
                        className="w-full bg-[#f5f5f5] border border-black/10 rounded-xl px-4 py-3.5 text-sm text-black focus:border-black outline-none transition-colors"
                      >
                        <option value="1–10">1–10 employees</option>
                        <option value="11–50">11–50 employees</option>
                        <option value="51–200">51–200 employees</option>
                        <option value="200+">200+ employees</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-[#787878] mb-2">
                      Describe your biggest manual bottleneck
                    </label>
                    <textarea 
                      name="challenge"
                      value={formData.challenge}
                      onChange={handleInputChange}
                      rows={4}
                      placeholder="e.g. Our team spends 15 hours a week manually copy-pasting lead data into Notion and drafting outreach emails..."
                      className="w-full bg-[#f5f5f5] border border-black/10 rounded-xl px-4 py-3.5 text-sm text-black focus:border-black outline-none transition-colors resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full font-semibold text-sm tracking-wide bg-black text-white py-4 rounded-xl hover:bg-black/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Submitting Request...
                      </>
                    ) : (
                      'Book 30-Min Strategy Call →'
                    )}
                  </button>
                </form>
              )}
            </div>

          </div>

        </div>
      </div>
    </>
  );
}
