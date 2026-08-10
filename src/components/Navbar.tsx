import { useState } from 'react';
import { motion } from 'motion/react';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
  };

  const navLinks = [
    { name: 'Services', path: '/services' },
    { name: 'Field Reports', path: '/case-studies' },
    { name: 'Process', path: '/process' },
    { name: 'About', path: '/about' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 py-4 px-6 sm:px-10 bg-[#f5f5f5]/80 backdrop-blur-md border-b border-black/5 transition-all">
      <div className="max-w-[1280px] mx-auto flex items-center justify-between">
        
        {/* Brand Logotype */}
        <Link to="/" className="font-bold text-lg tracking-tight text-black flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-black rounded-sm inline-block" />
          AJ &amp; CO.
        </Link>

        {/* Desktop Links Pill */}
        <div className="hidden md:flex items-center gap-1 bg-black/5 p-1.5 rounded-full border border-black/5">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              to={link.path} 
              className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all ${
                isActive(link.path) 
                  ? 'bg-black text-white shadow-sm' 
                  : 'text-black/70 hover:text-black hover:bg-black/5'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Action Button */}
        <div className="hidden md:flex items-center gap-4">
          <Link 
            to="/contact" 
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-black text-white text-xs font-semibold tracking-wide rounded-full hover:bg-black/80 transition-all shadow-sm"
          >
            Start Project <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden text-black focus:outline-none" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {mobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 right-0 bg-[#f5f5f5] border-b border-black/10 p-6 flex flex-col gap-4 md:hidden shadow-xl"
        >
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`text-sm font-semibold py-2 border-b border-black/5 ${isActive(link.path) ? 'text-black font-bold' : 'text-black/70'}`}
            >
              {link.name}
            </Link>
          ))}
          <Link 
            to="/contact"
            onClick={() => setMobileMenuOpen(false)}
            className="mt-2 text-center py-3 bg-black text-white text-sm font-semibold rounded-full"
          >
            Start Project →
          </Link>
        </motion.div>
      )}
    </nav>
  );
}
