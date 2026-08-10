import SEO from '../components/SEO';
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Linkedin, Twitter, CheckCircle2, Loader2, Calendar } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

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
      <SEO title="Book Strategy Call — AJ & Co." description="Schedule a free 30-minute AI strategy consultation with our senior engineering team." canonicalUrl="/contact" />
      
      <div className="bg-[#0A0A09] text-[#F8F7F3] selection:bg-[#C7A24C] selection:text-[#F8F7F3] font-sans min-h-screen pt-[140px] pb-24">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10">
          
          {/* Header */}
          <div className="mb-16 pb-8 border-b border-[#242320]">
            <div className="font-mono text-[0.72rem] text-[#C7A24C] tracking-[0.12em] uppercase mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#C7A24C]" /> STRATEGY CONSULTATION
            </div>
            <h1 className="font-serif text-[clamp(2.5rem,5.5vw,5rem)] font-normal leading-[1.05] tracking-tight max-w-[22ch]">
              Let's Figure Out What AI Can Do For <span className="italic text-[#C7A24C]">Your Business.</span>
            </h1>
            <p className="mt-6 text-[1.05rem] text-[#cfccc2] max-w-[46ch] font-light leading-relaxed">
              Start with a free 30-minute strategy call. No commitment. No hard sell. Just clarity on high-impact automation targets.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Left Info Column */}
            <div className="lg:col-span-5 space-y-10">
              <div className="border border-[#242320] p-8 bg-[#0A0A09]">
                <div className="font-mono text-[0.7rem] text-[#C7A24C] uppercase tracking-[0.08em] mb-4">
                  WHAT HAPPENS ON THE CALL
                </div>
                <ul className="space-y-4 text-sm font-light text-[#cfccc2]">
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 bg-[#C7A24C] rounded-full mt-2 shrink-0" />
                    Identify the repetitive workflows currently consuming your team's hours.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 bg-[#C7A24C] rounded-full mt-2 shrink-0" />
                    Calculate projected financial ROI &amp; time savings for top 3 opportunities.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 bg-[#C7A24C] rounded-full mt-2 shrink-0" />
                    Receive an architectural blueprint for custom AI agents &amp; integrations.
                  </li>
                </ul>
              </div>

              <div className="border-l-2 border-[#C7A24C] pl-6 py-2">
                <p className="font-serif text-lg italic text-[#F8F7F3] mb-2">
                  "Every engagement is scoped by someone who has felt the operational pain being automated."
                </p>
                <span className="font-mono text-xs text-[#8a877e] uppercase">
                  AJ &amp; Co. Engineering Desk
                </span>
              </div>
            </div>

            {/* Right Booking Form Column */}
            <div className="lg:col-span-7 border border-[#242320] p-8 sm:p-12 bg-[#0A0A09] relative">
              <div className="absolute -top-[11px] left-10 bg-[#0A0A09] px-2.5 font-mono text-[0.68rem] tracking-[0.12em] text-[#8a877e]">
                SCHEDULE SESSION
              </div>

              {isSuccess ? (
                <div className="py-12 text-center space-y-6">
                  <CheckCircle2 className="w-14 h-14 text-[#C7A24C] mx-auto animate-bounce" />
                  <h3 className="font-serif text-3xl">Strategy Call Requested</h3>
                  <p className="text-[#cfccc2] text-sm max-w-md mx-auto leading-relaxed">
                    Thank you, {formData.fullName}. Our team has received your request and will reach out to <strong className="text-white">{formData.workEmail}</strong> within 2 hours to confirm your calendar slot.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6 font-sans">
                  {errorMsg && (
                    <div className="p-4 border border-red-500/40 bg-red-500/10 text-red-400 text-xs font-mono">
                      {errorMsg}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[#8a877e] mb-2">
                        Full Name *
                      </label>
                      <input 
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        placeholder="Alex Morgan"
                        className="w-full bg-[#0A0A09] border border-[#242320] px-4 py-3 text-sm text-[#F8F7F3] focus:border-[#C7A24C] outline-none transition-colors"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[#8a877e] mb-2">
                        Work Email *
                      </label>
                      <input 
                        type="email"
                        name="workEmail"
                        value={formData.workEmail}
                        onChange={handleInputChange}
                        placeholder="alex@company.com"
                        className="w-full bg-[#0A0A09] border border-[#242320] px-4 py-3 text-sm text-[#F8F7F3] focus:border-[#C7A24C] outline-none transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[#8a877e] mb-2">
                        Company Name *
                      </label>
                      <input 
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleInputChange}
                        placeholder="Acme Corp"
                        className="w-full bg-[#0A0A09] border border-[#242320] px-4 py-3 text-sm text-[#F8F7F3] focus:border-[#C7A24C] outline-none transition-colors"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[#8a877e] mb-2">
                        Company Size
                      </label>
                      <select
                        name="companySize"
                        value={formData.companySize}
                        onChange={handleInputChange}
                        className="w-full bg-[#0A0A09] border border-[#242320] px-4 py-3 text-sm text-[#F8F7F3] focus:border-[#C7A24C] outline-none transition-colors"
                      >
                        <option value="1–10">1–10 employees</option>
                        <option value="11–50">11–50 employees</option>
                        <option value="51–200">51–200 employees</option>
                        <option value="200+">200+ employees</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[#8a877e] mb-2">
                      Describe your biggest manual bottleneck
                    </label>
                    <textarea 
                      name="challenge"
                      value={formData.challenge}
                      onChange={handleInputChange}
                      rows={4}
                      placeholder="e.g. Our team spends 15 hours a week manually copy-pasting lead data into Notion and drafting outreach emails..."
                      className="w-full bg-[#0A0A09] border border-[#242320] px-4 py-3 text-sm text-[#F8F7F3] focus:border-[#C7A24C] outline-none transition-colors resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full font-mono text-[0.8rem] tracking-[0.08em] uppercase border border-[#F8F7F3] px-8 py-4 bg-[#F8F7F3] text-[#0A0A09] font-bold hover:bg-[#C7A24C] hover:border-[#C7A24C] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
