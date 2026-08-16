import React from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';

// Context
import { AuthProvider } from './contexts/AuthContext';

// Pages
import Home from './pages/Home';
import Services from './pages/Services';
import ServiceDetail from './pages/ServiceDetail';
import Process from './pages/Process';
import CaseStudies from './pages/CaseStudies';
import CaseStudyDetail from './pages/CaseStudyDetail';
import About from './pages/About';
import Contact from './pages/Contact';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';

// Staff Portal Pages
import Login from './pages/staff/Login';
import Dashboard from './pages/staff/Dashboard';
import GmailCallback from './pages/staff/GmailCallback';
import DentistDashboard from './pages/staff/DentistDashboard';

function AppContent() {
  const location = useLocation();
  const isStaffRoute = location.pathname.startsWith('/staff') || location.pathname === '/dentist' || location.pathname.includes('/gmail/callback');

  return (
    <div className={`font-sans min-h-screen ${isStaffRoute ? 'bg-[#0A0A0A] text-white' : 'bg-[#f5f5f5] text-black'} flex flex-col`}>
      {!isStaffRoute && <Navbar />}
      <main className={`flex-grow ${isStaffRoute ? '' : 'pt-24'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/:id" element={<ServiceDetail />} />
          <Route path="/process" element={<Process />} />
          <Route path="/case-studies" element={<CaseStudies />} />
          <Route path="/case-studies/:id" element={<CaseStudyDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          
          {/* Direct Dentist Dashboard Route */}
          <Route path="/dentist" element={<div className="p-6 md:p-10 max-w-7xl mx-auto"><DentistDashboard /></div>} />

          {/* Protected Staff Portal Routes & OAuth Callbacks */}
          <Route path="/api/gmail/callback" element={<GmailCallback />} />
          <Route path="/gmail/callback" element={<GmailCallback />} />
          <Route path="/staff/login" element={<Login />} />
          <Route path="/staff" element={<Dashboard />} />
          <Route path="/staff/*" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isStaffRoute && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </HelmetProvider>
  );
}
