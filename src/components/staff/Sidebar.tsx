import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  FolderGit2, 
  CheckSquare, 
  DollarSign, 
  Globe, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Mail,
  MapPin
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
  activeTab: string;
  setActiveTab: (val: string) => void;
}

export default function Sidebar({ collapsed, setCollapsed, activeTab, setActiveTab }: SidebarProps) {
  const { profile, signOut, hasPermission } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'aloo', label: 'Place Scout (Maps)', icon: MapPin },
    { id: 'outreach', label: 'AI Outreach', icon: Sparkles },
    { id: 'mailboxes', label: 'Mailbox Manager', icon: Mail },
    { id: 'crm', label: 'CRM', icon: Users },
    { id: 'projects', label: 'Projects', icon: FolderGit2 },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'billing', label: 'Billing', icon: DollarSign },
    { id: 'websites', label: 'Websites', icon: Globe },
    { id: 'team', label: 'Team', icon: ShieldAlert },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const filteredItems = menuItems;

  const getInitials = () => {
    if (!profile) return 'ST';
    return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
  };

  const getRoleLabel = () => {
    if (!profile) return 'Staff';
    const roleName = profile.roles?.name || 'staff';
    return roleName.charAt(0).toUpperCase() + roleName.slice(1);
  };

  return (
    <aside 
      className={`bg-[#121212] border-r border-white/5 flex flex-col transition-all duration-300 h-screen sticky top-0 z-20 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-20 border-b border-[#242320] flex items-center justify-between px-6">
        {!collapsed && (
          <div className="font-serif text-lg font-semibold flex items-center text-[#F8F7F3] tracking-tight">
            AJ <span className="text-[#C7A24C] mx-1">&amp;</span> CO.
          </div>
        )}
        {collapsed && (
          <div className="font-serif text-[#C7A24C] font-semibold text-lg w-full text-center">
            AJ
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-[#8a877e] hover:text-[#F8F7F3] transition-colors focus:outline-none hidden md:block"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Nav Menu */}
      <nav className="flex-grow py-6 px-4 space-y-1 overflow-y-auto">
        {filteredItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 py-3 rounded-xl transition-all font-medium text-sm group ${
                collapsed ? 'justify-center px-0' : 'px-4'
              } ${
                isActive 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' 
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.02] border border-transparent'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User Info & Footer */}
      <div className="p-4 border-t border-white/5 bg-black/10">
        <div className={`flex items-center gap-3 mb-4 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-sm shrink-0">
            {getInitials()}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-grow">
              <p className="text-white text-sm font-semibold truncate leading-none mb-1">
                {profile ? `${profile.first_name} ${profile.last_name}` : 'Staff Member'}
              </p>
              <span className="text-gray-500 text-xs font-mono">
                {getRoleLabel()}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={signOut}
          className={`w-full flex items-center gap-4 py-3 px-4 rounded-xl text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/10 transition-all font-medium text-sm ${
            collapsed ? 'justify-center px-0' : 'px-4'
          }`}
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
