import { Linkedin, Twitter, Youtube, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-[#000000] text-white pt-20 pb-12 border-t border-white/10">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          
          <div className="md:col-span-2 space-y-6">
            <Link to="/" className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
              <span className="w-3 h-3 bg-white rounded-sm inline-block" />
              AJ &amp; CO.
            </Link>
            <p className="text-white/60 text-sm max-w-sm leading-relaxed font-normal">
              Autonomous AI agents, workflow automation, and custom web engineering for forward-thinking enterprises.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                <Linkedin className="w-4 h-4"/>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                <Twitter className="w-4 h-4"/>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                <Youtube className="w-4 h-4"/>
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-mono text-xs uppercase tracking-widest mb-6">Capabilities</h4>
            <ul className="space-y-3 text-sm text-white/60 font-medium">
              <li><Link to="/services" className="hover:text-white transition-colors">AI Opportunity Assessment</Link></li>
              <li><Link to="/services" className="hover:text-white transition-colors">Custom Agent Development</Link></li>
              <li><Link to="/services" className="hover:text-white transition-colors">Workflow Automation</Link></li>
              <li><Link to="/services" className="hover:text-white transition-colors">Enterprise AI Training</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-mono text-xs uppercase tracking-widest mb-6">Studio</h4>
            <ul className="space-y-3 text-sm text-white/60 font-medium">
              <li><Link to="/about" className="hover:text-white transition-colors">About Studio</Link></li>
              <li><Link to="/case-studies" className="hover:text-white transition-colors">Field Reports</Link></li>
              <li><Link to="/process" className="hover:text-white transition-colors">Process &amp; Delivery</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-white/40">
          <div className="relative">
            <p>© 2026 AJ and Co. All rights reserved.</p>
            {/* Secret Staff Button preserved */}
            <a 
              href="/staff" 
              className="absolute bottom-0 left-0 w-3 h-3 opacity-0 cursor-pointer select-none pointer-events-auto"
              aria-hidden="true"
              tabIndex={-1}
            />
          </div>
          <div className="flex gap-6">
            <Link to="/privacy-policy" className="hover:text-white/80 transition-colors">Privacy Policy</Link>
            <Link to="/terms-of-service" className="hover:text-white/80 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
