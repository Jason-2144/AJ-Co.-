import { Linkedin, Twitter, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-[#0A0A0A] border-t border-white/10 pt-16 sm:pt-20 lg:pt-28 pb-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 mb-16 sm:mb-20">
          <div className="md:col-span-2">
            <Link to="/" className="font-serif font-semibold text-xl tracking-tight text-[#F8F7F3] mb-6 flex items-center">
              AJ <span className="text-[#C7A24C] mx-1">&amp;</span> CO.
            </Link>
            <p className="text-gray-400 text-sm sm:text-base max-w-sm mb-10">
              We don't just build AI. We identify, develop, and embed it into your operations.
            </p>
            <div className="flex gap-4">
              <Link to="#" className="w-12 h-12 sm:w-10 sm:h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-emerald-400 hover:bg-white/10 transition-colors group">
                <Linkedin className="w-5 h-5 group-hover:scale-110 transition-transform"/>
              </Link>
              <Link to="#" className="w-12 h-12 sm:w-10 sm:h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-emerald-400 hover:bg-white/10 transition-colors group">
                <Twitter className="w-5 h-5 group-hover:scale-110 transition-transform"/>
              </Link>
              <Link to="#" className="w-12 h-12 sm:w-10 sm:h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-emerald-400 hover:bg-white/10 transition-colors group">
                <Youtube className="w-5 h-5 group-hover:scale-110 transition-transform"/>
              </Link>
            </div>
          </div>

          <div className="flex flex-col">
            <h4 className="text-white font-syne font-bold text-base sm:text-lg mb-6 sm:mb-8 uppercase tracking-wider">Services</h4>
            <ul className="space-y-4 text-gray-400 text-sm sm:text-base font-medium flex flex-col">
              <li><Link to="/services/ai-opportunity-assessment" className="hover:text-emerald-400 transition-colors block py-2 sm:py-0">AI Opportunity Assessment</Link></li>
              <li><Link to="/services/custom-agent-development" className="hover:text-emerald-400 transition-colors block py-2 sm:py-0">Custom Agent Development</Link></li>
              <li><Link to="/services/workflow-automation" className="hover:text-emerald-400 transition-colors block py-2 sm:py-0">Workflow Automation</Link></li>
              <li><Link to="/services/enterprise-ai-training" className="hover:text-emerald-400 transition-colors block py-2 sm:py-0">Enterprise AI Training</Link></li>
            </ul>
          </div>

          <div className="flex flex-col">
            <h4 className="text-white font-syne font-bold text-base sm:text-lg mb-6 sm:mb-8 uppercase tracking-wider">Company</h4>
            <ul className="space-y-4 text-gray-400 text-sm sm:text-base font-medium flex flex-col">
              <li><Link to="/about" className="hover:text-emerald-400 transition-colors block py-2 sm:py-0">About Us</Link></li>
              <li><Link to="/case-studies" className="hover:text-emerald-400 transition-colors block py-2 sm:py-0">Case Studies</Link></li>
              <li><Link to="/process" className="hover:text-emerald-400 transition-colors block py-2 sm:py-0">Our Process</Link></li>
              <li><Link to="/contact" className="hover:text-emerald-400 transition-colors block py-2 sm:py-0">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-gray-500 font-mono">
          <div className="relative">
            <p>© 2026 AJ and Co. All rights reserved.</p>
            {/* Secret Staff Login Button */}
            <a 
              href="https://ajandco.site/staff" 
              className="absolute bottom-0 left-0 w-3 h-3 opacity-0 cursor-pointer select-none pointer-events-auto bg-transparent"
              aria-hidden="true"
              tabIndex={-1}
              title="Staff Portal"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 min-h-[44px] sm:min-h-0 items-center justify-center">
            <Link to="/privacy-policy" className="hover:text-gray-300 transition-colors min-h-[44px] flex items-center">Privacy Policy</Link>
            <Link to="/terms-of-service" className="hover:text-gray-300 transition-colors min-h-[44px] flex items-center">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
