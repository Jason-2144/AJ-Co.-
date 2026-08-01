import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Plus, 
  Search, 
  Trash2, 
  X, 
  Calendar,
  AlertCircle,
  CheckSquare,
  Check,
  User,
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { tasksService, Task, ChecklistItem, TaskComment } from '../../services/tasks';
import { projectsService, Project } from '../../services/projects';
import { usersService } from '../../services/users';
import { UserProfile } from '../../services/auth';

export default function Tasks() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected task state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);

  // Modals
  const [showAddTask, setShowAddTask] = useState(false);
  const [showTaskDetail, setShowTaskDetail] = useState(false);

  // Form states - Task
  const [projectId, setProjectId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [taskDue, setTaskDue] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  // Form states - Checklist
  const [newCheckItem, setNewCheckItem] = useState('');

  // Form states - Comment
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    loadTasksData();
  }, []);

  async function loadTasksData() {
    try {
      setLoading(true);
      const [tList, pList, sList] = await Promise.all([
        tasksService.getTasks(),
        projectsService.getProjects(),
        usersService.getStaffProfiles()
      ]);
      setTasks(tList);
      setProjects(pList);
      setStaffList(sList);
    } catch (err) {
      console.error('Error loading Tasks board:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newTask = await tasksService.createTask({
        project_id: projectId || null,
        title: taskTitle,
        description: taskDesc,
        status: 'todo',
        priority: taskPriority,
        due_date: taskDue || undefined
      }, selectedAssignees);

      // Write log
      await usersService.writeAuditLog({
        user_id: profile?.id || null,
        action: `created task "${taskTitle}"`,
        module: 'Tasks',
        new_value: newTask
      });

      setShowAddTask(false);
      resetTaskForm();
      loadTasksData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTaskStatus = async (task: Task, nextStatus: any) => {
    try {
      const updated = await tasksService.updateTask(task.id!, { status: nextStatus });
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
      if (selectedTask?.id === task.id) {
        setSelectedTask({ ...selectedTask, status: nextStatus });
      }

      // Write log
      await usersService.writeAuditLog({
        user_id: profile?.id || null,
        action: `changed task "${task.title}" status to "${nextStatus}"`,
        module: 'Tasks',
        new_value: updated
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (id: string, title: string) => {
    if (!profile?.id || !window.confirm(`Are you sure you want to archive task "${title}"?`)) return;
    try {
      await tasksService.softDeleteTask(id, profile.id);
      
      // Write log
      await usersService.writeAuditLog({
        user_id: profile.id,
        action: `archived task "${title}"`,
        module: 'Tasks'
      });

      setTasks(tasks.filter(t => t.id !== id));
      setShowTaskDetail(false);
      setSelectedTask(null);
    } catch (err) {
      console.error(err);
    }
  };

  const openTaskDetail = async (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
    if (task.id) {
      try {
        const [items, comms] = await Promise.all([
          tasksService.getChecklist(task.id),
          tasksService.getComments(task.id)
        ]);
        setChecklist(items);
        setComments(comms);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAddCheckItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask?.id || !newCheckItem.trim()) return;
    try {
      const newItem = await tasksService.addChecklistItem({
        task_id: selectedTask.id,
        item_text: newCheckItem,
        is_completed: false
      });
      setChecklist([...checklist, newItem]);
      setNewCheckItem('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleCheckItem = async (item: ChecklistItem) => {
    try {
      const nextVal = !item.is_completed;
      const updated = await tasksService.updateChecklistItem(item.id!, { is_completed: nextVal });
      setChecklist(checklist.map(c => c.id === item.id ? updated : c));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask?.id || !newComment.trim() || !profile?.id) return;
    try {
      const newItem = await tasksService.addComment({
        task_id: selectedTask.id,
        author_id: profile.id,
        comment: newComment
      });
      
      // Inject author name manually to save api request
      const fullItem = {
        ...newItem,
        profiles: {
          first_name: profile.first_name,
          last_name: profile.last_name
        }
      };

      setComments([...comments, fullItem]);
      setNewComment('');
    } catch (err) {
      console.error(err);
    }
  };

  const toggleAssigneeSelection = (staffId: string) => {
    if (selectedAssignees.includes(staffId)) {
      setSelectedAssignees(selectedAssignees.filter(id => id !== staffId));
    } else {
      setSelectedAssignees([...selectedAssignees, staffId]);
    }
  };

  const resetTaskForm = () => {
    setProjectId('');
    setTaskTitle('');
    setTaskDesc('');
    setTaskPriority('medium');
    setTaskDue('');
    setSelectedAssignees([]);
  };

  const [viewFilter, setViewFilter] = useState<'all' | 'my'>('all');

  const myProfileId = profile?.id;
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;

    if (viewFilter === 'my') {
      if (!myProfileId && !profile?.email) return true;
      const isAssigned = t.task_assignees?.some((a: any) => 
        a.profiles?.id === myProfileId || 
        a.profiles?.email === profile?.email ||
        (a.profiles?.first_name && profile?.first_name && a.profiles.first_name.toLowerCase() === profile.first_name.toLowerCase())
      );
      return isAssigned;
    }
    return true;
  });

  const columns = [
    { id: 'todo', name: 'To Do', color: 'bg-gray-500/10 text-gray-400' },
    { id: 'in_progress', name: 'In Progress', color: 'bg-blue-500/10 text-blue-400' },
    { id: 'waiting', name: 'Waiting', color: 'bg-purple-500/10 text-purple-400' },
    { id: 'review', name: 'Review', color: 'bg-orange-500/10 text-orange-400' },
    { id: 'completed', name: 'Completed', color: 'bg-emerald-500/10 text-emerald-400' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const myTaskCount = tasks.filter(t => t.task_assignees?.some((a: any) => 
    a.profiles?.id === myProfileId || 
    a.profiles?.email === profile?.email ||
    (a.profiles?.first_name && profile?.first_name && a.profiles.first_name.toLowerCase() === profile.first_name.toLowerCase())
  )).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-syne font-bold text-2xl text-white">Tasks Kanban Board</h2>
          <p className="text-gray-500 text-sm mt-1">Assign workflows, check task priorities, and track progress.</p>
        </div>
        <button
          onClick={() => setShowAddTask(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2.5 rounded-xl font-semibold transition-colors flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> Create Task
        </button>
      </div>

      {/* Subtab View Filters */}
      <div className="flex items-center gap-3 border-b border-white/5 pb-3">
        <button
          onClick={() => setViewFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wider transition-colors ${
            viewFilter === 'all' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-gray-400 hover:text-white'
          }`}
        >
          All Tasks ({tasks.length})
        </button>
        <button
          onClick={() => setViewFilter('my')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wider transition-colors flex items-center gap-2 ${
            viewFilter === 'my' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-gray-400 hover:text-white'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          My Assigned Tasks ({myTaskCount})
        </button>
      </div>

      <div className="relative max-w-md mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#121212] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none transition-colors"
          placeholder="Search task title..."
        />
      </div>

      {/* Kanban columns flex row */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start overflow-x-auto pb-4">
        {columns.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);
          return (
            <div key={col.id} className="bg-[#121212] border border-white/5 p-4 rounded-2xl min-h-[500px] flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-semibold ${col.color}`}>
                  {col.name}
                </span>
                <span className="text-xs text-gray-500 font-mono font-bold">{colTasks.length}</span>
              </div>

              <div className="flex-grow space-y-3">
                {colTasks.map(task => (
                  <div 
                    key={task.id}
                    onClick={() => openTaskDetail(task)}
                    className="bg-[#1A1A1A] border border-white/5 hover:border-white/10 p-4 rounded-xl space-y-3 cursor-pointer group transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-white text-sm leading-tight group-hover:text-emerald-400 transition-colors">
                        {task.title}
                      </h4>
                    </div>

                    {task.projects && (
                      <span className="text-[10px] text-gray-500 font-mono font-medium truncate block">
                        Project: {task.projects.name}
                      </span>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className={`text-[10px] font-mono uppercase tracking-wider ${
                        task.priority === 'critical' ? 'text-red-400' :
                        task.priority === 'high' ? 'text-orange-400' :
                        task.priority === 'medium' ? 'text-blue-400' :
                        'text-gray-400'
                      }`}>
                        {task.priority}
                      </span>

                      {task.due_date && (
                        <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(task.due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/5 p-8 rounded-2xl w-full max-w-lg shadow-2xl relative">
            <h3 className="font-syne font-bold text-xl text-white mb-6">Create Kanban Task</h3>
            
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Project Scope</label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none transition-colors"
                  >
                    <option value="">No Project (Internal)</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Task Title</label>
                  <input
                    type="text"
                    required
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none transition-colors"
                    placeholder="Refactor stylesheet hooks"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Task Description</label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none transition-colors h-24"
                  placeholder="Task parameters..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e: any) => setTaskPriority(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none transition-colors"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Due Date</label>
                  <input
                    type="date"
                    value={taskDue}
                    onChange={(e) => setTaskDue(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Assignees selection checkboard */}
              <div>
                <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Assign Team Members</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto bg-[#1A1A1A] p-3 rounded-xl border border-white/5">
                  {staffList.map(staff => (
                    <label 
                      key={staff.id}
                      className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAssignees.includes(staff.id)}
                        onChange={() => toggleAssigneeSelection(staff.id)}
                        className="w-3.5 h-3.5 rounded border-white/5 bg-[#121212] text-emerald-500 focus:ring-0"
                      />
                      <span>{staff.first_name} {staff.last_name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-8">
                <button
                  type="button"
                  onClick={() => setShowAddTask(false)}
                  className="border border-white/5 hover:bg-white/[0.02] text-white px-5 py-2.5 rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details Side-Drawer / Modal */}
      {showTaskDetail && selectedTask && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-end">
          <div className="bg-[#121212] border-l border-white/5 w-full max-w-xl h-full p-8 overflow-y-auto space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-start justify-between border-b border-white/5 pb-4">
                <div>
                  <h3 className="font-syne font-bold text-xl text-white">{selectedTask.title}</h3>
                  {selectedTask.projects && (
                    <p className="text-emerald-400 text-xs mt-1 font-semibold">{selectedTask.projects.name}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteTask(selectedTask.id!, selectedTask.title)}
                    className="p-2 text-gray-500 hover:text-red-400 transition-colors rounded-lg"
                    title="Archive Task"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowTaskDetail(false)}
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Status and Priority controls */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">Status</label>
                  <select
                    value={selectedTask.status}
                    onChange={(e) => handleUpdateTaskStatus(selectedTask, e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-2.5 px-3 text-xs focus:outline-none transition-colors"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting">Waiting</option>
                    <option value="review">Review</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">Priority</label>
                  <span className={`block px-3 py-2 rounded-xl bg-[#1A1A1A] border border-white/5 font-mono text-xs font-semibold tracking-wider ${
                    selectedTask.priority === 'critical' ? 'text-red-400' :
                    selectedTask.priority === 'high' ? 'text-orange-400' :
                    selectedTask.priority === 'medium' ? 'text-blue-400' :
                    'text-gray-400'
                  }`}>
                    {selectedTask.priority.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Description */}
              {selectedTask.description && (
                <div className="bg-[#1A1A1A] border border-white/5 p-4 rounded-xl text-sm text-gray-300">
                  <span className="block text-xs font-mono text-gray-500 uppercase mb-2">Description</span>
                  <p className="leading-relaxed">{selectedTask.description}</p>
                </div>
              )}

              {/* Task Checklist */}
              <div className="space-y-3">
                <h4 className="font-syne font-bold text-white text-sm">Task Checklist</h4>
                <div className="space-y-2">
                  {checklist.map(item => (
                    <label 
                      key={item.id}
                      className="flex items-center gap-3 p-3 bg-[#1A1A1A] border border-white/5 rounded-xl cursor-pointer select-none text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={item.is_completed}
                        onChange={() => handleToggleCheckItem(item)}
                        className="w-4 h-4 rounded border-white/5 bg-[#121212] text-emerald-500 focus:ring-0"
                      />
                      <span className={`text-white ${item.is_completed ? 'line-through text-gray-500' : ''}`}>
                        {item.item_text}
                      </span>
                    </label>
                  ))}
                </div>

                <form onSubmit={handleAddCheckItem} className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newCheckItem}
                    onChange={(e) => setNewCheckItem(e.target.value)}
                    className="flex-grow bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-2.5 px-4 text-xs focus:outline-none transition-colors"
                    placeholder="Add checklist sub-item..."
                  />
                  <button
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 rounded-xl text-xs font-semibold"
                  >
                    Add
                  </button>
                </form>
              </div>

              {/* Task Comments */}
              <div className="border-t border-white/5 pt-6 space-y-4">
                <h4 className="font-syne font-bold text-white text-sm">Discussions</h4>
                
                <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                  {comments.map(c => (
                    <div key={c.id} className="bg-[#1A1A1A] p-3 rounded-xl border border-white/5 text-xs space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-gray-500">
                        <span className="font-semibold text-white">
                          {c.profiles ? `${c.profiles.first_name} ${c.profiles.last_name}` : 'Staff'}
                        </span>
                        <span>{new Date(c.created_at || '').toLocaleTimeString()}</span>
                      </div>
                      <p className="text-gray-300 leading-relaxed">{c.comment}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-grow bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-2.5 px-4 text-xs focus:outline-none"
                    placeholder="Write a comment..."
                  />
                  <button
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 rounded-xl text-xs font-semibold"
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
