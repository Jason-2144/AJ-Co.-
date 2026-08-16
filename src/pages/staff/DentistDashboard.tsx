import React, { useState } from 'react';
import { 
  Activity, 
  PhoneCall, 
  UserCheck, 
  CalendarCheck, 
  Star, 
  Globe, 
  ShieldAlert, 
  TrendingUp, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Play,
  RefreshCw,
  Sparkles
} from 'lucide-react';

export default function DentistDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'agents' | 'appointments' | 'leads'>('overview');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const agents = [
    { id: 'receptionist', name: 'AI Receptionist', status: 'active', callsToday: 42, icon: PhoneCall, desc: '24/7 Phone answering & emergency triage' },
    { id: 'reengagement', name: 'Patient Re-Engagement', status: 'active', sentToday: 128, icon: Users, desc: 'Lapsed patient automated outreach' },
    { id: 'noshow', name: 'No-Show Recovery', status: 'active', confirmed: '94%', icon: CalendarCheck, desc: 'Smart reminders & waitlist auto-fill' },
    { id: 'followup', name: 'Treatment Follow-Up', status: 'active', pending: '$18,400', icon: TrendingUp, desc: 'Quoted treatment recovery' },
    { id: 'reputation', name: 'Reputation Agent', status: 'active', rating: '4.9 ★', icon: Star, desc: 'Post-visit rating collection & Google Reviews' },
    { id: 'booking', name: 'Website & Booking', status: 'active', bookings: 19, icon: Globe, desc: 'Direct online appointment sync' },
    { id: 'billing', name: 'Insurance & Claims Agent', status: 'active', recovered: '$12,300', icon: ShieldAlert, desc: 'Unpaid claim monitoring & chase' },
    { id: 'practice', name: 'Practice OS Core', status: 'active', uptime: '99.9%', icon: Activity, desc: 'Appwrite & n8n workflow orchestrator' },
  ];

  const recentAppointments = [
    { id: 1, patient: 'Sarah Jenkins', type: 'Hygiene & Checkup', time: '10:30 AM', status: 'Confirmed', channel: 'AI Receptionist' },
    { id: 2, patient: 'Michael Chang', type: 'Crown Consultation', time: '11:15 AM', status: 'Confirmed', channel: 'Website Booking' },
    { id: 3, patient: 'Elena Rostova', type: 'Emergency Pain', time: '01:00 PM', status: 'Triaged (Urgent)', channel: 'Voice AI' },
    { id: 4, patient: 'David Miller', type: 'Teeth Whitening', time: '02:30 PM', status: 'Reminder Sent', channel: 'WhatsApp' },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-cyan-950/40 via-emerald-950/30 to-black p-6 sm:p-8 rounded-3xl border border-cyan-500/20 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-mono font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Practice OS Active
              </span>
              <span className="text-gray-400 text-xs font-mono">ajandco.site/dentist</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Dental Practice Command Center
            </h1>
            <p className="text-sm text-gray-300 max-w-2xl">
              Live automated practice management operating 8 autonomous AI agents for reception, booking, treatment recovery, and reputation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Workflows</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-[#121212] grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#121212] p-5 rounded-2xl border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
            <span>TODAY'S APPOINTMENTS</span>
            <CalendarCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">28 Slots</p>
          <p className="text-xs text-emerald-400 font-medium">94% Confirmation Rate</p>
        </div>

        <div className="bg-[#121212] p-5 rounded-2xl border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
            <span>RECOVERED REVENUE</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white">$18,400</p>
          <p className="text-xs text-cyan-400 font-medium">+14% vs last month</p>
        </div>

        <div className="bg-[#121212] p-5 rounded-2xl border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
            <span>VOICE CALLS TRIAGED</span>
            <PhoneCall className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">42 Calls</p>
          <p className="text-xs text-purple-400 font-medium">0 Missed calls 24/7</p>
        </div>

        <div className="bg-[#121212] p-5 rounded-2xl border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
            <span>PATIENT RATING SCORE</span>
            <Star className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">4.9 / 5.0</p>
          <p className="text-xs text-amber-400 font-medium">142 Google Reviews</p>
        </div>
      </div>

      {/* 8 AI Agents Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" /> Autonomous AI Agents (8 Active)
          </h2>
          <span className="text-xs text-gray-400 font-mono">Backend Appwrite Connected</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {agents.map((agent) => (
            <div 
              key={agent.id}
              onClick={() => setSelectedAgent(agent.name)}
              className="bg-[#121212] hover:bg-white/[0.03] p-5 rounded-2xl border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400 group-hover:scale-105 transition-transform">
                  <agent.icon className="w-5 h-5" />
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">{agent.name}</h3>
                <p className="text-xs text-gray-400 line-clamp-2 mt-1">{agent.desc}</p>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-gray-400 font-mono">
                <span>STATUS</span>
                <span className="text-emerald-400 font-semibold uppercase">{agent.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Schedule & Triaged Queue */}
      <div className="bg-[#121212] rounded-2xl border border-white/5 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" /> Live Triaged Schedule
          </h3>
          <span className="text-xs text-emerald-400 font-mono">Synced from Voice & Web</span>
        </div>

        <div className="divide-y divide-white/5">
          {recentAppointments.map((appt) => (
            <div key={appt.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.01]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">
                  {appt.time.split(' ')[0]}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">{appt.patient}</h4>
                  <p className="text-xs text-gray-400">{appt.type}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <span className="text-gray-400 font-mono">{appt.channel}</span>
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-medium">
                  {appt.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
