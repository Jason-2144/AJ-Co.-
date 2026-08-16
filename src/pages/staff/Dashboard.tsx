import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../../components/staff/Sidebar';

// Submodules
import DashboardOverview from './DashboardOverview';
import CRM from './CRM';
import Projects from './Projects';
import Tasks from './Tasks';
import Invoices from './Invoices';
import Websites from './Websites';
import Team from './Team';
import Settings from './Settings';
import AIOutreach from './AIOutreach';
import Campaigns from './Campaigns';
import MailboxManager from './MailboxManager';
import PlaceScoutTool from './PlaceScoutTool';
import DentistDashboard from './DentistDashboard';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'dashboard';
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/staff/login');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex font-sans">
      {/* Sidebar navigation */}
      <Sidebar 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />

      {/* Primary content pane */}
      <main className="flex-grow p-6 md:p-10 overflow-y-auto h-screen max-w-7xl mx-auto space-y-8">
        {activeTab === 'dashboard' && <DashboardOverview setActiveTab={setActiveTab} />}
        {activeTab === 'dentist' && <DentistDashboard />}
        {activeTab === 'aloo' && <PlaceScoutTool />}
        {activeTab === 'outreach' && <AIOutreach />}
        {activeTab === 'mailboxes' && <MailboxManager />}
        {activeTab === 'crm' && <CRM />}
        {activeTab === 'projects' && <Projects />}
        {activeTab === 'tasks' && <Tasks />}
        {activeTab === 'billing' && <Invoices />}
        {activeTab === 'websites' && <Websites />}
        {activeTab === 'team' && <Team />}
        {activeTab === 'settings' && <Settings />}
      </main>
    </div>
  );
}
