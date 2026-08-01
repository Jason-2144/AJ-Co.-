import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Plus, 
  Search, 
  Trash2, 
  X, 
  Calendar,
  AlertCircle,
  FolderGit2,
  DollarSign
} from 'lucide-react';
import { projectsService, Project, Milestone } from '../../services/projects';
import { clientsService, Client } from '../../services/clients';
import { usersService } from '../../services/users';

export default function Projects() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected project state
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddMilestone, setShowAddMilestone] = useState(false);

  // Form states - Project
  const [clientId, setClientId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectBudget, setProjectBudget] = useState(0);
  const [projectStart, setProjectStart] = useState('');
  const [projectDue, setProjectDue] = useState('');
  const [projectStatus, setProjectStatus] = useState<'planning' | 'active' | 'completed' | 'on_hold'>('planning');

  // Form states - Milestone
  const [milestoneName, setMilestoneName] = useState('');
  const [milestoneDesc, setMilestoneDesc] = useState('');
  const [milestoneDue, setMilestoneDue] = useState('');

  useEffect(() => {
    loadProjectsData();
  }, []);

  async function loadProjectsData() {
    try {
      setLoading(true);
      const [pList, cList] = await Promise.all([
        projectsService.getProjects(),
        clientsService.getClients()
      ]);
      setProjects(pList);
      setClients(cList);
    } catch (err) {
      console.error('Error loading Projects metrics:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newProj = await projectsService.createProject({
        client_id: clientId,
        name: projectName,
        description: projectDesc,
        budget: projectBudget,
        start_date: projectStart || undefined,
        due_date: projectDue || undefined,
        status: projectStatus,
        progress_percent: 0
      });

      // Write log
      await usersService.writeAuditLog({
        user_id: profile?.id || null,
        action: `created project workspace "${projectName}"`,
        module: 'Projects',
        new_value: newProj
      });

      setProjects([newProj, ...projects]);
      setShowAddProject(false);
      resetProjectForm();
      loadProjectsData(); // Reload to fetch clients relation nested name
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject?.id) return;
    try {
      const newMilestone = await projectsService.createMilestone({
        project_id: selectedProject.id,
        name: milestoneName,
        description: milestoneDesc,
        due_date: milestoneDue || undefined,
        status: 'pending'
      });

      // Write log
      await usersService.writeAuditLog({
        user_id: profile?.id || null,
        action: `added milestone "${milestoneName}" to project "${selectedProject.name}"`,
        module: 'Projects',
        new_value: newMilestone
      });

      setMilestones([...milestones, newMilestone]);
      setShowAddMilestone(false);
      setMilestoneName('');
      setMilestoneDesc('');
      setMilestoneDue('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (id: string, status: any) => {
    try {
      const updated = await projectsService.updateProject(id, { status });
      setProjects(projects.map(p => p.id === id ? { ...p, status } : p));
      if (selectedProject?.id === id) {
        setSelectedProject({ ...selectedProject, status });
      }
      
      // Write log
      await usersService.writeAuditLog({
        user_id: profile?.id || null,
        action: `updated project status to "${status}"`,
        module: 'Projects',
        new_value: updated
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProgress = async (id: string, progress_percent: number) => {
    try {
      const updated = await projectsService.updateProject(id, { progress_percent });
      setProjects(projects.map(p => p.id === id ? { ...p, progress_percent } : p));
      if (selectedProject?.id === id) {
        setSelectedProject({ ...selectedProject, progress_percent });
      }

      // Write log
      await usersService.writeAuditLog({
        user_id: profile?.id || null,
        action: `updated project progress to ${progress_percent}%`,
        module: 'Projects',
        new_value: updated
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleMilestone = async (milestone: Milestone) => {
    try {
      const nextStatus = milestone.status === 'pending' ? 'completed' : 'pending';
      const updated = await projectsService.updateMilestone(milestone.id!, { status: nextStatus });
      setMilestones(milestones.map(m => m.id === milestone.id ? updated : m));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProject = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete project "${name}"?`)) return;
    try {
      await projectsService.softDeleteProject(id, profile?.id || 'owner');
      
      // Write log
      await usersService.writeAuditLog({
        user_id: profile?.id || null,
        action: `archived project "${name}"`,
        module: 'Projects'
      });

      setProjects(projects.filter(p => p.id !== id));
      if (selectedProject?.id === id) {
        setSelectedProject(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectProject = async (proj: Project) => {
    setSelectedProject(proj);
    if (proj.id) {
      try {
        const list = await projectsService.getMilestones(proj.id);
        setMilestones(list);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const resetProjectForm = () => {
    setClientId('');
    setProjectName('');
    setProjectDesc('');
    setProjectBudget(0);
    setProjectStart('');
    setProjectDue('');
    setProjectStatus('planning');
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.clients?.company_name && p.clients.company_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-syne font-bold text-2xl text-white">Project Workspaces</h2>
          <p className="text-gray-500 text-sm mt-1">Manage project timelines, milestones, and budgets.</p>
        </div>
        <button
          onClick={() => setShowAddProject(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2.5 rounded-xl font-semibold transition-colors flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> Create Project
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Project Lists Panel */}
        <div className="bg-[#121212] border border-white/5 p-6 rounded-2xl lg:col-span-2 space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none transition-colors"
              placeholder="Search projects by name, client..."
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 text-gray-500 font-mono uppercase text-xs">
                  <th className="pb-3">Project</th>
                  <th className="pb-3">Client</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Budget</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredProjects.map((proj) => (
                  <tr 
                    key={proj.id}
                    onClick={() => selectProject(proj)}
                    className={`hover:bg-white/[0.01] transition-colors cursor-pointer ${selectedProject?.id === proj.id ? 'bg-emerald-500/[0.03]' : ''}`}
                  >
                    <td className="py-4">
                      <p className="font-semibold text-white">{proj.name}</p>
                      <div className="w-24 bg-gray-800 rounded-full h-1.5 mt-2">
                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${proj.progress_percent}%` }} />
                      </div>
                    </td>
                    <td className="py-4 text-gray-300">{proj.clients?.company_name || 'Generic Client'}</td>
                    <td className="py-4 font-mono text-xs uppercase tracking-wider">
                      <span className={`px-2 py-0.5 rounded-full ${
                        proj.status === 'active' ? 'bg-blue-500/10 text-blue-400' :
                        proj.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                        'bg-gray-500/10 text-gray-400'
                      }`}>
                        {proj.status}
                      </span>
                    </td>
                    <td className="py-4 font-semibold text-white">₹{Number(proj.budget).toLocaleString()}</td>
                    <td className="py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDeleteProject(proj.id!, proj.name)}
                        className="p-2 text-gray-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Project Drawer */}
        <div className="space-y-6">
          {selectedProject ? (
            <div className="bg-[#121212] border border-white/5 p-6 rounded-2xl space-y-6">
              <div className="flex items-start justify-between border-b border-white/5 pb-4">
                <div>
                  <h3 className="font-syne font-bold text-xl text-white">{selectedProject.name}</h3>
                  <p className="text-gray-500 text-xs mt-1">{selectedProject.clients?.company_name}</p>
                </div>
                <button
                  onClick={() => setSelectedProject(null)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Progress Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono text-gray-400">
                  <span>Progress tracking</span>
                  <span>{selectedProject.progress_percent}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={selectedProject.progress_percent}
                  onChange={(e) => handleUpdateProgress(selectedProject.id!, Number(e.target.value))}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Status Select */}
              <div className="space-y-2">
                <label className="block text-xs font-mono uppercase tracking-wider text-gray-500">Project Status</label>
                <select
                  value={selectedProject.status}
                  onChange={(e) => handleUpdateStatus(selectedProject.id!, e.target.value as any)}
                  className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none transition-colors"
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>

              {/* Milestones Checklist */}
              <div className="border-t border-white/5 pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-syne font-semibold text-white text-sm">Milestones Checklist</h4>
                  <button
                    onClick={() => setShowAddMilestone(true)}
                    className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Milestone
                  </button>
                </div>
                <div className="space-y-2">
                  {milestones.map(m => (
                    <label 
                      key={m.id}
                      className="flex items-center gap-3 p-3 bg-[#1A1A1A] border border-white/5 rounded-xl cursor-pointer select-none text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={m.status === 'completed'}
                        onChange={() => handleToggleMilestone(m)}
                        className="w-4 h-4 rounded border-white/5 bg-[#121212] text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                      <div className="flex-grow">
                        <span className={`text-white ${m.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                          {m.name}
                        </span>
                        {m.due_date && (
                          <span className="block text-[10px] text-gray-500 mt-0.5 font-mono">
                            Due: {new Date(m.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-[#121212] border border-white/5 p-8 rounded-2xl text-center text-gray-500 text-sm">
              <FolderGit2 className="w-8 h-8 text-gray-600 mx-auto mb-3" />
              <span>Select a project workspace to manage progress, update milestones, and track budgets.</span>
            </div>
          )}
        </div>
      </div>

      {/* Add Project Modal */}
      {showAddProject && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/5 p-8 rounded-2xl w-full max-w-lg shadow-2xl relative">
            <h3 className="font-syne font-bold text-xl text-white mb-6">Create Project Workspace</h3>
            
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Corporate Client</label>
                  <select
                    required
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none transition-colors"
                  >
                    <option value="">Select client...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.company_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Project Name</label>
                  <input
                    type="text"
                    required
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none transition-colors"
                    placeholder="Automation Pipeline"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Project Description</label>
                <textarea
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none transition-colors h-24"
                  placeholder="Task parameters scope..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Budget ($)</label>
                  <input
                    type="number"
                    required
                    value={projectBudget}
                    onChange={(e) => setProjectBudget(Number(e.target.value))}
                    className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Start Date</label>
                  <input
                    type="date"
                    value={projectStart}
                    onChange={(e) => setProjectStart(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Due Date</label>
                  <input
                    type="date"
                    value={projectDue}
                    onChange={(e) => setProjectDue(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-8">
                <button
                  type="button"
                  onClick={() => setShowAddProject(false)}
                  className="border border-white/5 hover:bg-white/[0.02] text-white px-5 py-2.5 rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Milestone Modal */}
      {showAddMilestone && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/5 p-8 rounded-2xl w-full max-w-md shadow-2xl relative">
            <h3 className="font-syne font-bold text-xl text-white mb-6">Create Milestone</h3>
            
            <form onSubmit={handleAddMilestone} className="space-y-4">
              <div>
                <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Milestone Name</label>
                <input
                  type="text"
                  required
                  value={milestoneName}
                  onChange={(e) => setMilestoneName(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none transition-colors"
                  placeholder="UI Design Complete"
                />
              </div>

              <div>
                <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Due Date</label>
                <input
                  type="date"
                  value={milestoneDue}
                  onChange={(e) => setMilestoneDue(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none transition-colors"
                />
              </div>

              <div className="flex gap-3 justify-end mt-8">
                <button
                  type="button"
                  onClick={() => setShowAddMilestone(false)}
                  className="border border-white/5 hover:bg-white/[0.02] text-white px-5 py-2.5 rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
