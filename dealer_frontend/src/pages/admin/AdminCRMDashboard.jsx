import { useState, useEffect } from 'react';
import { 
  CheckCircle, Clock, Flame, Phone, Plus, ListTodo,
  Calendar, AlertTriangle, Users, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

/**
 * AdminCRMDashboard - Sales Rep Daily CRM Dashboard
 *
 * Section 1: "My Day" - Tasks due today with instant completion toggle
 * Section 2: "Hot Leads to Call" - HOT leads list
 * Section 3: "Add Task" form with date/time picker
 */
const AdminCRMDashboard = () => {
  const navigate = useNavigate();

  // Tasks
  const [todayTasks, setTodayTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  // Hot Leads
  const [hotLeads, setHotLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(true);

  // Add Task form
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    due_date: '',
    priority: 'MEDIUM',
    lead: '',
  });
  const [addingTask, setAddingTask] = useState(false);

  // All leads for the task form dropdown
  const [allLeads, setAllLeads] = useState([]);

  // Stats
  const [allTasks, setAllTasks] = useState([]);

  useEffect(() => {
    fetchTodayTasks();
    fetchHotLeads();
    fetchAllLeads();
  }, []);

  const fetchTodayTasks = async () => {
    try {
      setTasksLoading(true);
      // Fetch all non-completed tasks; we'll filter client-side for "due today"
      const data = await api.get('/crm/tasks/?is_completed=false');
      setAllTasks(data);
      const today = new Date().toDateString();
      const dueTodayOrOverdue = data.filter(t => {
        const due = new Date(t.due_date);
        return due.toDateString() === today || due < new Date();
      });
      setTodayTasks(dueTodayOrOverdue);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setTasksLoading(false);
    }
  };

  const fetchHotLeads = async () => {
    try {
      setLeadsLoading(true);
      const data = await api.get('/crm/leads/');
      const list = data.results || data;
      const hot = list.filter(l => l.status === 'HOT');
      setHotLeads(hot);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLeadsLoading(false);
    }
  };

  const fetchAllLeads = async () => {
    try {
      const data = await api.get('/crm/leads/');
      setAllLeads(data.results || data);
    } catch (error) {
      console.error('Failed to fetch leads for dropdown:', error);
    }
  };

  const toggleTaskComplete = async (task) => {
    try {
      await api.patch(`/crm/tasks/${task.id}/`, { is_completed: true });
      setTodayTasks(prev => prev.filter(t => t.id !== task.id));
      setAllTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: true } : t));
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim() || !taskForm.due_date) return;
    try {
      setAddingTask(true);
      const body = {
        title: taskForm.title.trim(),
        due_date: taskForm.due_date,
        priority: taskForm.priority,
      };
      if (taskForm.lead) body.lead = taskForm.lead;
      const created = await api.post('/crm/tasks/', body);
      // If the new task is due today, add it to today list
      const today = new Date().toDateString();
      if (new Date(created.due_date).toDateString() === today) {
        setTodayTasks(prev => [...prev, created]);
      }
      setAllTasks(prev => [...prev, created]);
      setTaskForm({ title: '', due_date: '', priority: 'MEDIUM', lead: '' });
      setShowAddTask(false);
    } catch (error) {
      console.error('Failed to add task:', error);
    } finally {
      setAddingTask(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit',
    });
  };

  const priorityStyles = {
    HIGH: 'bg-red-100 text-red-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    LOW: 'bg-green-100 text-green-700',
  };

  const isOverdue = (dateString) => {
    const due = new Date(dateString);
    const now = new Date();
    return due < now && due.toDateString() !== now.toDateString();
  };

  // Stats
  const pendingCount = allTasks.filter(t => !t.is_completed).length;
  const todayCount = todayTasks.length;
  const hotCount = hotLeads.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM Dashboard</h1>
          <p className="text-gray-500 mt-1">Your daily sales overview and follow-ups</p>
        </div>
        <button
          onClick={() => setShowAddTask(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl font-medium hover:bg-[#e65100] transition-colors"
        >
          <Plus size={18} />
          Add Task
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
            <ListTodo size={24} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
            <p className="text-sm text-gray-500">Pending Tasks</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-brand-50 flex items-center justify-center">
            <Clock size={24} className="text-brand-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{todayCount}</p>
            <p className="text-sm text-gray-500">Due Today / Overdue</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center">
            <Flame size={24} className="text-red-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{hotCount}</p>
            <p className="text-sm text-gray-500">Hot Leads</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ==================== SECTION 1: MY DAY ==================== */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Calendar size={20} className="text-brand-600" />
              My Day
            </h2>
            <span className="text-sm text-gray-500">{todayCount} task{todayCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="p-4">
            {tasksLoading ? (
              <div className="py-8 text-center">
                <div className="inline-block h-6 w-6 border-4 border-gray-200 border-t-brand-600 rounded-full animate-spin" />
                <p className="mt-2 text-sm text-gray-500">Loading tasks...</p>
              </div>
            ) : todayTasks.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle className="h-10 w-10 text-green-300 mx-auto mb-2" />
                <p className="text-gray-500 font-medium">All caught up!</p>
                <p className="text-gray-400 text-sm mt-1">No tasks due today</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {todayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-colors group"
                  >
                    <button
                      onClick={() => toggleTaskComplete(task)}
                      className="flex-shrink-0 h-6 w-6 rounded-full border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 flex items-center justify-center transition-colors group-hover:border-green-400"
                      title="Mark as done"
                    >
                      <CheckCircle size={14} className="text-transparent group-hover:text-green-500 transition-colors" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {isOverdue(task.due_date) ? (
                          <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                            <AlertTriangle size={12} />
                            Overdue – {formatDate(task.due_date)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {formatTime(task.due_date)}
                          </span>
                        )}
                        {task.lead_title && (
                          <span className="text-xs text-gray-400 truncate">• {task.lead_title}</span>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${priorityStyles[task.priority]}`}>
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ==================== SECTION 2: HOT LEADS ==================== */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Flame size={20} className="text-red-500" />
              Hot Leads to Call
            </h2>
            <button
              onClick={() => navigate('/admin/leads')}
              className="text-sm text-brand-600 hover:underline font-medium"
            >
              View All Leads
            </button>
          </div>
          <div className="p-4">
            {leadsLoading ? (
              <div className="py-8 text-center">
                <div className="inline-block h-6 w-6 border-4 border-gray-200 border-t-brand-600 rounded-full animate-spin" />
                <p className="mt-2 text-sm text-gray-500">Loading leads...</p>
              </div>
            ) : hotLeads.length === 0 ? (
              <div className="py-8 text-center">
                <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 font-medium">No hot leads</p>
                <p className="text-gray-400 text-sm mt-1">Mark leads as HOT from the Leads page</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {hotLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center gap-3 bg-brand-50 rounded-xl p-3 hover:bg-brand-100 transition-colors cursor-pointer"
                    onClick={() => navigate('/admin/leads')}
                  >
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {lead.customer_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{lead.customer_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {lead.customer_phone && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Phone size={11} /> {lead.customer_phone}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {formatDate(lead.created_at)}
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-200 text-brand-900 flex-shrink-0">
                      HOT
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== ADD TASK MODAL ==================== */}
      {showAddTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddTask(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <ListTodo size={20} className="text-brand-600" />
                Add New Task
              </h2>
              <button onClick={() => setShowAddTask(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleAddTask} className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
                <input
                  type="text"
                  placeholder="e.g., Call John about financing"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-600 focus:border-transparent"
                  required
                  autoFocus
                />
              </div>

              {/* Due Date & Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date & Time</label>
                <input
                  type="datetime-local"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, due_date: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-600 focus:border-transparent"
                  required
                />
              </div>

              {/* Priority & Lead */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-600 focus:border-transparent bg-white"
                  >
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link to Lead (optional)</label>
                  <select
                    value={taskForm.lead}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, lead: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-600 focus:border-transparent bg-white"
                  >
                    <option value="">None</option>
                    {allLeads.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.customer_name} (#{l.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTask(false)}
                  className="px-4 py-2.5 text-gray-600 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingTask}
                  className="px-6 py-2.5 bg-brand-600 text-white rounded-xl font-medium hover:bg-[#e65100] transition-colors disabled:opacity-50"
                >
                  {addingTask ? 'Adding...' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCRMDashboard;
