import { supabase } from '../lib/supabase.js';

export interface Task {
  id?: string;
  project_id?: string | null;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'waiting' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  due_date?: string;
  tags?: string[];
  deleted_at?: string | null;
  deleted_by?: string | null;
  created_at?: string;
  task_assignees?: {
    profiles: {
      id: string;
      first_name: string;
      last_name: string;
    };
  }[];
  projects?: {
    name: string;
  } | null;
}

export interface ChecklistItem {
  id?: string;
  task_id: string;
  item_text: string;
  is_completed: boolean;
  created_at?: string;
}

export interface TaskComment {
  id?: string;
  task_id: string;
  author_id: string;
  comment: string;
  created_at?: string;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

export interface TaskAttachment {
  id?: string;
  task_id: string;
  uploader_id: string;
  file_name: string;
  file_url: string;
  created_at?: string;
}

export interface TimeLog {
  id?: string;
  staff_id: string;
  task_id?: string | null;
  duration_minutes: number;
  log_date: string;
  description?: string;
  created_at?: string;
  tasks?: {
    title: string;
  };
}

export interface LeaveRequest {
  id?: string;
  staff_id: string;
  start_date: string;
  end_date: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  created_at?: string;
}

export interface Attendance {
  id?: string;
  staff_id: string;
  date: string;
  check_in?: string;
  check_out?: string;
}

const TASKS_STORAGE_KEY = 'ajco_crm_tasks';
const CHECKLIST_STORAGE_KEY = 'ajco_crm_checklists';
const COMMENTS_STORAGE_KEY = 'ajco_crm_comments';
const TIMELOGS_STORAGE_KEY = 'ajco_crm_timelogs';
const LEAVES_STORAGE_KEY = 'ajco_crm_leaves';
const ATTENDANCE_STORAGE_KEY = 'ajco_crm_attendance';

function getLocalStore<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function setLocalStore<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to write to local storage ${key}`, e);
  }
}

export const tasksService = {
  async getTasks(): Promise<Task[]> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, task_assignees(profiles(id, first_name, last_name)), projects(name)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (!error && data && data.length > 0) {
        setLocalStore(TASKS_STORAGE_KEY, data);
        return data as any;
      }
    } catch (err) {
      console.warn('Supabase getTasks failed, falling back to local storage:', err);
    }
    return getLocalStore<Task>(TASKS_STORAGE_KEY);
  },

  async createTask(task: Omit<Task, 'id' | 'created_at' | 'task_assignees' | 'projects'>, assigneeIds: string[]): Promise<Task> {
    const newTask: Task = {
      ...task,
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      created_at: new Date().toISOString()
    };

    try {
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .insert(task)
        .select()
        .single();
      
      if (!taskError && taskData) {
        if (assigneeIds.length > 0) {
          const assigneeRows = assigneeIds.map(staffId => ({
            task_id: taskData.id,
            staff_id: staffId
          }));
          await supabase.from('task_assignees').insert(assigneeRows);
        }
        const local = getLocalStore<Task>(TASKS_STORAGE_KEY);
        setLocalStore(TASKS_STORAGE_KEY, [taskData, ...local]);
        return taskData;
      }
    } catch (err) {
      console.warn('Supabase createTask failed, saving locally:', err);
    }

    const local = getLocalStore<Task>(TASKS_STORAGE_KEY);
    setLocalStore(TASKS_STORAGE_KEY, [newTask, ...local]);
    return newTask;
  },

  async updateTask(id: string, task: Partial<Task>, assigneeIds?: string[]): Promise<Task> {
    try {
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .update(task)
        .eq('id', id)
        .select()
        .single();
      
      if (!taskError && taskData) {
        if (assigneeIds !== undefined) {
          await supabase.from('task_assignees').delete().eq('task_id', id);
          if (assigneeIds.length > 0) {
            const assigneeRows = assigneeIds.map(staffId => ({
              task_id: id,
              staff_id: staffId
            }));
            await supabase.from('task_assignees').insert(assigneeRows);
          }
        }
        const local = getLocalStore<Task>(TASKS_STORAGE_KEY);
        const updated = local.map(t => t.id === id ? { ...t, ...taskData } : t);
        setLocalStore(TASKS_STORAGE_KEY, updated);
        return taskData;
      }
    } catch (err) {
      console.warn('Supabase updateTask failed:', err);
    }

    const local = getLocalStore<Task>(TASKS_STORAGE_KEY);
    let updatedTask: Task = { title: '', status: 'todo', priority: 'medium' };
    const updated = local.map(t => {
      if (t.id === id) {
        updatedTask = { ...t, ...task };
        return updatedTask;
      }
      return t;
    });
    setLocalStore(TASKS_STORAGE_KEY, updated);
    return updatedTask;
  },

  async softDeleteTask(id: string, userId: string): Promise<void> {
    try {
      await supabase
        .from('tasks')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: userId
        })
        .eq('id', id);
    } catch (err) {
      console.warn('Supabase softDeleteTask failed:', err);
    }

    const local = getLocalStore<Task>(TASKS_STORAGE_KEY);
    const updated = local.filter(t => t.id !== id);
    setLocalStore(TASKS_STORAGE_KEY, updated);
  },

  async getChecklist(taskId: string): Promise<ChecklistItem[]> {
    try {
      const { data, error } = await supabase
        .from('task_checklists')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      
      if (!error && data) return data;
    } catch (err) {}
    return getLocalStore<ChecklistItem>(CHECKLIST_STORAGE_KEY).filter(c => c.task_id === taskId);
  },

  async addChecklistItem(item: Omit<ChecklistItem, 'id' | 'created_at'>): Promise<ChecklistItem> {
    const newItem: ChecklistItem = { ...item, id: 'check_' + Date.now(), created_at: new Date().toISOString() };
    try {
      const { data, error } = await supabase.from('task_checklists').insert(item).select().single();
      if (!error && data) {
        const local = getLocalStore<ChecklistItem>(CHECKLIST_STORAGE_KEY);
        setLocalStore(CHECKLIST_STORAGE_KEY, [data, ...local]);
        return data;
      }
    } catch (err) {}
    const local = getLocalStore<ChecklistItem>(CHECKLIST_STORAGE_KEY);
    setLocalStore(CHECKLIST_STORAGE_KEY, [newItem, ...local]);
    return newItem;
  },

  async updateChecklistItem(id: string, item: Partial<ChecklistItem>): Promise<ChecklistItem> {
    try {
      const { data, error } = await supabase.from('task_checklists').update(item).eq('id', id).select().single();
      if (!error && data) return data;
    } catch (err) {}
    const local = getLocalStore<ChecklistItem>(CHECKLIST_STORAGE_KEY);
    let updatedItem: ChecklistItem = { task_id: '', item_text: '', is_completed: false };
    const updated = local.map(c => {
      if (c.id === id) {
        updatedItem = { ...c, ...item };
        return updatedItem;
      }
      return c;
    });
    setLocalStore(CHECKLIST_STORAGE_KEY, updated);
    return updatedItem;
  },

  async deleteChecklistItem(id: string): Promise<void> {
    try {
      await supabase.from('task_checklists').delete().eq('id', id);
    } catch (err) {}
    const local = getLocalStore<ChecklistItem>(CHECKLIST_STORAGE_KEY).filter(c => c.id !== id);
    setLocalStore(CHECKLIST_STORAGE_KEY, local);
  },

  async getComments(taskId: string): Promise<TaskComment[]> {
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*, profiles(first_name, last_name)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      
      if (!error && data) return data as any;
    } catch (err) {}
    return getLocalStore<TaskComment>(COMMENTS_STORAGE_KEY).filter(c => c.task_id === taskId);
  },

  async addComment(comment: Omit<TaskComment, 'id' | 'created_at' | 'profiles'>): Promise<TaskComment> {
    const newComment: TaskComment = { ...comment, id: 'comment_' + Date.now(), created_at: new Date().toISOString() };
    try {
      const { data, error } = await supabase.from('task_comments').insert(comment).select().single();
      if (!error && data) {
        const local = getLocalStore<TaskComment>(COMMENTS_STORAGE_KEY);
        setLocalStore(COMMENTS_STORAGE_KEY, [data, ...local]);
        return data;
      }
    } catch (err) {}
    const local = getLocalStore<TaskComment>(COMMENTS_STORAGE_KEY);
    setLocalStore(COMMENTS_STORAGE_KEY, [newComment, ...local]);
    return newComment;
  },

  async getAttachments(taskId: string): Promise<TaskAttachment[]> {
    try {
      const { data, error } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    } catch (err) {}
    return [];
  },

  async addAttachment(attachment: Omit<TaskAttachment, 'id' | 'created_at'>): Promise<TaskAttachment> {
    const { data, error } = await supabase.from('task_attachments').insert(attachment).select().single();
    if (error) throw error;
    return data;
  },

  async getTimeLogs(staffId?: string): Promise<TimeLog[]> {
    try {
      let query = supabase.from('time_logs').select('*, tasks(title)');
      if (staffId) query = query.eq('staff_id', staffId);
      const { data, error } = await query.order('log_date', { ascending: false });
      if (!error && data) return data as any;
    } catch (err) {}
    return getLocalStore<TimeLog>(TIMELOGS_STORAGE_KEY);
  },

  async addTimeLog(log: Omit<TimeLog, 'id' | 'created_at' | 'tasks'>): Promise<TimeLog> {
    const newLog: TimeLog = { ...log, id: 'log_' + Date.now(), created_at: new Date().toISOString() };
    try {
      const { data, error } = await supabase.from('time_logs').insert(log).select().single();
      if (!error && data) return data;
    } catch (err) {}
    const local = getLocalStore<TimeLog>(TIMELOGS_STORAGE_KEY);
    setLocalStore(TIMELOGS_STORAGE_KEY, [newLog, ...local]);
    return newLog;
  },

  async getLeaveRequests(staffId?: string): Promise<LeaveRequest[]> {
    try {
      let query = supabase.from('leave_requests').select('*');
      if (staffId) query = query.eq('staff_id', staffId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && data) return data;
    } catch (err) {}
    return getLocalStore<LeaveRequest>(LEAVES_STORAGE_KEY);
  },

  async addLeaveRequest(req: Omit<LeaveRequest, 'id' | 'created_at'>): Promise<LeaveRequest> {
    const newReq: LeaveRequest = { ...req, id: 'leave_' + Date.now(), created_at: new Date().toISOString() };
    try {
      const { data, error } = await supabase.from('leave_requests').insert(req).select().single();
      if (!error && data) return data;
    } catch (err) {}
    const local = getLocalStore<LeaveRequest>(LEAVES_STORAGE_KEY);
    setLocalStore(LEAVES_STORAGE_KEY, [newReq, ...local]);
    return newReq;
  },

  async updateLeaveRequest(id: string, status: 'approved' | 'rejected'): Promise<LeaveRequest> {
    try {
      const { data, error } = await supabase.from('leave_requests').update({ status }).eq('id', id).select().single();
      if (!error && data) return data;
    } catch (err) {}
    const local = getLocalStore<LeaveRequest>(LEAVES_STORAGE_KEY);
    let updatedReq: LeaveRequest = { staff_id: '', start_date: '', end_date: '', type: '', status };
    const updated = local.map(l => {
      if (l.id === id) {
        updatedReq = { ...l, status };
        return updatedReq;
      }
      return l;
    });
    setLocalStore(LEAVES_STORAGE_KEY, updated);
    return updatedReq;
  },

  async getAttendance(staffId: string, dateStr: string): Promise<Attendance | null> {
    try {
      const { data, error } = await supabase.from('attendance').select('*').eq('staff_id', staffId).eq('date', dateStr).maybeSingle();
      if (!error && data) return data;
    } catch (err) {}
    const local = getLocalStore<Attendance>(ATTENDANCE_STORAGE_KEY);
    return local.find(a => a.staff_id === staffId && a.date === dateStr) || null;
  },

  async checkIn(staffId: string): Promise<Attendance> {
    const today = new Date().toISOString().split('T')[0];
    const newAtt: Attendance = { staff_id: staffId, date: today, check_in: new Date().toISOString() };
    try {
      const { data, error } = await supabase.from('attendance').upsert({ staff_id: staffId, date: today, check_in: new Date().toISOString() }, { onConflict: 'staff_id,date' }).select().single();
      if (!error && data) return data;
    } catch (err) {}
    const local = getLocalStore<Attendance>(ATTENDANCE_STORAGE_KEY);
    setLocalStore(ATTENDANCE_STORAGE_KEY, [newAtt, ...local]);
    return newAtt;
  },

  async checkOut(staffId: string): Promise<Attendance> {
    const today = new Date().toISOString().split('T')[0];
    try {
      const { data, error } = await supabase.from('attendance').update({ check_out: new Date().toISOString() }).eq('staff_id', staffId).eq('date', today).select().single();
      if (!error && data) return data;
    } catch (err) {}
    const local = getLocalStore<Attendance>(ATTENDANCE_STORAGE_KEY);
    let updatedAtt: Attendance = { staff_id: staffId, date: today, check_out: new Date().toISOString() };
    const updated = local.map(a => {
      if (a.staff_id === staffId && a.date === today) {
        updatedAtt = { ...a, check_out: new Date().toISOString() };
        return updatedAtt;
      }
      return a;
    });
    setLocalStore(ATTENDANCE_STORAGE_KEY, updated);
    return updatedAtt;
  }
};
