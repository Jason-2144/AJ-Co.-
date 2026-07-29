import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  FolderGit2, 
  CheckSquare, 
  DollarSign, 
  Activity, 
  Plus, 
  Clock, 
  Bell,
  AlertCircle
} from 'lucide-react';
import { projectsService } from '../../services/projects';
import { tasksService } from '../../services/tasks';
import { invoicesService } from '../../services/invoices';
import { usersService, AuditLog } from '../../services/users';
import { queueStore } from '../../services/queue/QueueStore';

export default function DashboardOverview({ setActiveTab }: { setActiveTab: (val: string) => void }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projectCount, setProjectCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);
  const [pendingInvoices, setPendingInvoices] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [activities, setActivities] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  
  const [campaignStats, setCampaignStats] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    completedCampaigns: 0,
    companiesInQueue: 0,
    successRate: 0,
    avgCompletionTime: 0
  });

  useEffect(() => {
    async function loadMetrics() {
      try {
        const [projsRes, tsksRes, invsRes, logsRes] = await Promise.allSettled([
          projectsService.getProjects(),
          tasksService.getTasks(),
          invoicesService.getInvoices(),
          usersService.getAuditLogs(),
          queueStore.loadFromSupabase()
        ]);

        const projs = projsRes.status === 'fulfilled' ? projsRes.value : [];
        const tsks = tsksRes.status === 'fulfilled' ? tsksRes.value : [];
        const invs = invsRes.status === 'fulfilled' ? invsRes.value : [];
        const logs = logsRes.status === 'fulfilled' ? logsRes.value : [];

        setProjectCount(projs.length);
        
        // Filter tasks due today or incomplete
        const incompleteTasks = tsks.filter(t => t.status !== 'completed');
        setTaskCount(incompleteTasks.length);

        // Filter invoices pending payment
        const unpaidInvoices = invs.filter(i => i.status !== 'paid');
        setPendingInvoices(unpaidInvoices.length);

        // Sum revenue of paid invoices
        const totalRev = invs
          .filter(i => i.status === 'paid')
          .reduce((sum, item) => sum + Number(item.total), 0);
        setRevenue(totalRev);

        // Calculate queue analytics
        const queueItems = queueStore.getItems();
        const completedItems = queueItems.filter(i => i.status === 'completed' && i.startedAt && i.finishedAt);
        const avgTime = completedItems.length > 0
          ? completedItems.reduce((acc, curr) => acc + (curr.finishedAt! - curr.startedAt!), 0) / completedItems.length / 1000
          : 0;

        const totalProspects = queueItems.length;
        const completedCount = completedItems.length;
        const successRate = totalProspects > 0 ? Math.round((completedCount / totalProspects) * 100) : 0;

        setCampaignStats({
          totalCampaigns: 0,
          activeCampaigns: 0,
          completedCampaigns: 0,
          companiesInQueue: queueItems.length,
          successRate,
          avgCompletionTime: avgTime
        });

        setActivities(logs.slice(0, 5));

        // Generate dynamic notifications
        const list: any[] = [];
        tsks.forEach(t => {
          if (t.priority === 'critical' && t.status !== 'completed') {
            list.push({ id: t.id, title: 'Critical Task', message: `Task "${t.title}" is unresolved.` });
          }
        });
        invs.forEach(i => {
          if (i.status === 'overdue') {
            list.push({ id: i.id, title: 'Invoice Overdue', message: `Invoice #${i.invoice_number} is overdue.` });
          }
        });
        setNotifications(list.slice(0, 3));

      } catch (err) {
        console.error('Error loading overview metrics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadMetrics();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div>
        <h2 className="font-syne font-bold text-3xl text-white">
          Welcome back, {profile?.first_name || 'Staff'}!
        </h2>
        <p className="text-gray-500 text-sm mt-1">Here is a summary of AJ & Co. operations today.</p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#121212] border border-white/5 p-6 rounded-2xl flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Active Projects</span>
            <p className="text-3xl font-syne font-bold text-white">{projectCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <FolderGit2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#121212] border border-white/5 p-6 rounded-2xl flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Tasks Due</span>
            <p className="text-3xl font-syne font-bold text-white">{taskCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
            <CheckSquare className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#121212] border border-white/5 p-6 rounded-2xl flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Unpaid Invoices</span>
            <p className="text-3xl font-syne font-bold text-white">{pendingInvoices}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#121212] border border-white/5 p-6 rounded-2xl flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Total Revenue</span>
            <p className="text-3xl font-syne font-bold text-emerald-400">{formatCurrency(revenue)}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Campaign Metrics Section */}
      <div className="space-y-4">
        <h3 className="font-syne font-bold text-lg text-white">AI Outreach Campaigns Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-[#121212] border border-white/5 p-4 rounded-xl text-center">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">Total Campaigns</span>
            <p className="text-xl font-bold text-gray-300 mt-1 font-mono">{campaignStats.totalCampaigns}</p>
          </div>
          <div className="bg-[#121212] border border-white/5 p-4 rounded-xl text-center">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">Active Campaigns</span>
            <p className="text-xl font-bold text-emerald-400 mt-1 font-mono">{campaignStats.activeCampaigns}</p>
          </div>
          <div className="bg-[#121212] border border-white/5 p-4 rounded-xl text-center">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">Completed Campaigns</span>
            <p className="text-xl font-bold text-blue-400 mt-1 font-mono">{campaignStats.completedCampaigns}</p>
          </div>
          <div className="bg-[#121212] border border-white/5 p-4 rounded-xl text-center">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">Companies in Queue</span>
            <p className="text-xl font-bold text-purple-400 mt-1 font-mono">{campaignStats.companiesInQueue}</p>
          </div>
          <div className="bg-[#121212] border border-white/5 p-4 rounded-xl text-center">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">Success Rate</span>
            <p className="text-xl font-bold text-amber-400 mt-1 font-mono">{campaignStats.successRate}%</p>
          </div>
          <div className="bg-[#121212] border border-white/5 p-4 rounded-xl text-center">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">Avg Processing Time</span>
            <p className="text-xl font-bold text-emerald-400 mt-1 font-mono">{campaignStats.avgCompletionTime.toFixed(1)}s</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <div className="bg-[#121212] border border-white/5 p-6 rounded-2xl lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="font-syne font-bold text-lg text-white">System Activity Feed</h3>
            <Activity className="w-5 h-5 text-gray-500" />
          </div>
          
          {activities.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-sm">
              No recent activity found. Run some database entries.
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((act, i) => (
                <div key={i} className="flex gap-4 items-start text-sm">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0 animate-pulse" />
                  <div className="flex-grow">
                    <p className="text-gray-300">
                      <span className="font-semibold text-white">
                        {act.profiles ? `${act.profiles.first_name} ${act.profiles.last_name}` : 'Staff'}
                      </span>{' '}
                      {act.action}
                    </p>
                    <span className="text-xs text-gray-500 font-mono">
                      {new Date(act.created_at || '').toLocaleTimeString()} - {act.module}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions & Notifications */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-[#121212] border border-white/5 p-6 rounded-2xl space-y-4">
            <h3 className="font-syne font-bold text-lg text-white">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setActiveTab('tasks')}
                className="flex flex-col items-center justify-center p-4 bg-[#1A1A1A] hover:bg-white/[0.03] border border-white/5 rounded-xl text-center group transition-colors"
              >
                <Plus className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-gray-400">Add Task</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('billing')}
                className="flex flex-col items-center justify-center p-4 bg-[#1A1A1A] hover:bg-white/[0.03] border border-white/5 rounded-xl text-center group transition-colors"
              >
                <Plus className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-gray-400">New Invoice</span>
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-[#121212] border border-white/5 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-syne font-bold text-lg text-white">Alerts</h3>
              <Bell className="w-5 h-5 text-gray-500" />
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-xs">
                No high-priority alerts today.
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notif, i) => (
                  <div key={i} className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl flex gap-3 items-start text-xs text-orange-400">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white">{notif.title}</p>
                      <p className="text-gray-400 mt-1">{notif.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
