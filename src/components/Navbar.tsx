import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Menu, X } from 'lucide-react';
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
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-10 py-5 bg-gradient-to-b from-[#0A0A09]/95 to-transparent backdrop-blur-[2px] transition-all">
      <Link to="/" className="font-serif font-semibold text-lg sm:text-xl tracking-tight text-[#F8F7F3]">
        AJ <span className="text-[#C7A24C]">&amp;</span> CO.
      </Link>

      <div className="hidden md:flex items-center gap-8 font-mono text-[0.72rem] tracking-[0.08em] uppercase text-[#F8F7F3]">
        {navLinks.map((link) => (
          <Link 
            key={link.name} 
            to={link.path} 
            className={`transition-opacity ${isActive(link.path) ? 'opacity-100 border-b border-[#C7A24C]' : 'opacity-70 hover:opacity-100'}`}
          >
            {link.name}
          </Link>
        ))}
      </div>



      <button className="md:hidden text-[#F8F7F3] hover:text-[#C7A24C] transition-colors" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {mobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 right-0 bg-[#0A0A09] border-b border-[#242320] p-6 flex flex-col gap-4 md:hidden shadow-2xl"
        >
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`font-mono text-sm uppercase tracking-widest py-2 border-b border-[#242320] ${isActive(link.path) ? 'text-[#C7A24C]' : 'text-gray-300'}`}
            >
              {link.name}
            </Link>
          ))}
          <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="w-full mt-2 py-3 text-center border border-[#F8F7F3] text-[#F8F7F3] font-mono text-xs uppercase tracking-widest">
            Start a project →
          </Link>
        </motion.div>
      )}
    </nav>
  );
}
