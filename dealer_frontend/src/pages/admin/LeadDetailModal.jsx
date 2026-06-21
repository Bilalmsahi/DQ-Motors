import { useState, useEffect } from 'react';
import {
  X, Phone, Mail, Clock, Archive, CheckCircle, XCircle,
  MessageSquare, PhoneCall, AtSign, Users, FileText, Plus,
  ListTodo, Car, Calendar, MapPin, DollarSign, User,
  ChevronDown, Send, ShieldCheck, ShieldX, ShieldAlert,
} from 'lucide-react';
import api from '../../services/api';

/* ──────────────── helpers ──────────────── */

const STATUS_CFG = {
  NEW:    { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  HOT:    { bg: 'bg-brand-100', text: 'text-brand-800', dot: 'bg-brand-600' },
  COLD:   { bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400' },
  CLOSED: { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
};

const TYPE_LABELS = {
  GENERAL_INQUIRY: 'General Inquiry',
  VEHICLE_REQUEST: 'Vehicle Request',
  TEST_DRIVE: 'Test Drive',
  FINANCING: 'Financing',
};

const PRIORITY_STYLES = {
  HIGH:   'bg-red-100 text-red-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW:    'bg-green-100 text-green-700',
};

const interactionIcon = (type) => {
  switch (type) {
    case 'CALL':    return <PhoneCall size={14} className="text-green-500" />;
    case 'EMAIL':   return <AtSign size={14} className="text-blue-500" />;
    case 'MEETING': return <Users size={14} className="text-purple-500" />;
    case 'NOTE':    return <FileText size={14} className="text-gray-500" />;
    default:        return <MessageSquare size={14} className="text-gray-400" />;
  }
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const formatCurrency = (amt) => {
  if (!amt) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amt);
};

/**
 * Try to parse structured key:value pairs from the notes field.
 * Website forms often store data like:
 *   "Full Name: John Doe\nEmail: john@example.com\nMonthly Income: $5000"
 *
 * Returns { structured: [{key, value}], freeText: string }
 */
const parseNotes = (notes) => {
  if (!notes || !notes.trim()) return { structured: [], freeText: '' };

  const lines = notes.split('\n').map(l => l.trim()).filter(Boolean);
  const pairs = [];
  const freeLines = [];

  for (const line of lines) {
    // Match "Key: Value" or "Key : Value"
    const match = line.match(/^([A-Za-z][A-Za-z0-9 _/()-]{1,40})\s*:\s*(.+)$/);
    if (match) {
      pairs.push({ key: match[1].trim(), value: match[2].trim() });
    } else {
      freeLines.push(line);
    }
  }

  return { structured: pairs, freeText: freeLines.join('\n') };
};

/* ──────────────── main component ──────────────── */

const LeadDetailModal = ({ lead, onClose, onLeadUpdated }) => {
  /* ---- state ---- */
  const [currentStatus, setCurrentStatus] = useState(lead.status);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // History / Interactions
  const [interactions, setInteractions] = useState([]);
  const [interactionsLoading, setInteractionsLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState('NOTE');
  const [addingNote, setAddingNote] = useState(false);

  // Tasks
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', due_date: '', priority: 'MEDIUM' });
  const [addingTask, setAddingTask] = useState(false);

  // CRM tab (left column)
  const [crmTab, setCrmTab] = useState('history');

  /* ---- data fetching ---- */
  useEffect(() => {
    fetchInteractions();
    fetchTasks();
  }, []);

  const fetchInteractions = async () => {
    try {
      setInteractionsLoading(true);
      const data = await api.get(`/crm/interactions/?lead=${lead.id}`);
      setInteractions(Array.isArray(data) ? data : data.results ?? []);
    } catch (err) {
      console.error('Failed to fetch interactions:', err);
    } finally {
      setInteractionsLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      setTasksLoading(true);
      const data = await api.get(`/crm/tasks/?lead=${lead.id}`);
      setTasks(Array.isArray(data) ? data : data.results ?? []);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setTasksLoading(false);
    }
  };

  /* ---- actions ---- */
  const handleStatusChange = async (newStatus) => {
    setStatusUpdating(true);
    try {
      await api.patch(`/crm/leads/${lead.id}/`, { status: newStatus });
      setCurrentStatus(newStatus);
      onLeadUpdated?.({ ...lead, status: newStatus });
    } catch (err) {
      console.error('Status update failed:', err);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      setAddingNote(true);
      const created = await api.post('/crm/interactions/', {
        lead: lead.id,
        interaction_type: noteType,
        notes: newNote.trim(),
      });
      setInteractions(prev => [created, ...prev]);
      setNewNote('');
      setNoteType('NOTE');
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setAddingNote(false);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim() || !taskForm.due_date) return;
    try {
      setAddingTask(true);
      const created = await api.post('/crm/tasks/', {
        title: taskForm.title.trim(),
        lead: lead.id,
        due_date: taskForm.due_date,
        priority: taskForm.priority,
      });
      setTasks(prev => [created, ...prev]);
      setTaskForm({ title: '', due_date: '', priority: 'MEDIUM' });
      setShowTaskForm(false);
    } catch (err) {
      console.error('Failed to add task:', err);
    } finally {
      setAddingTask(false);
    }
  };

  const toggleTaskComplete = async (task) => {
    try {
      const updated = await api.patch(`/crm/tasks/${task.id}/`, {
        is_completed: !task.is_completed,
      });
      setTasks(prev => prev.map(t => (t.id === task.id ? updated : t)));
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  /* ---- parsed submission data ---- */
  const { structured, freeText } = parseNotes(lead.notes);

  /* ---- status configs ---- */
  const sCfg = STATUS_CFG[currentStatus] || STATUS_CFG.NEW;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* modal shell */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* ─── HEADER ─── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center text-white text-xl font-bold shrink-0">
              {lead.customer_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{lead.customer_name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-400">Lead #{lead.id}</span>
                <span className="text-xs text-gray-300">•</span>
                <span className="text-xs text-gray-400">{formatDate(lead.created_at)}</span>
                <span className="text-xs text-gray-300">•</span>
                <span className="text-xs text-gray-500 font-medium">{TYPE_LABELS[lead.lead_type] || lead.lead_type}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* inline status dropdown */}
            <div className="relative">
              <select
                value={currentStatus}
                disabled={statusUpdating}
                onChange={(e) => handleStatusChange(e.target.value)}
                className={`appearance-none pl-3 pr-8 py-1.5 rounded-full text-xs font-semibold border-0 cursor-pointer focus:ring-2 focus:ring-brand-600 ${sCfg.bg} ${sCfg.text} ${statusUpdating ? 'opacity-50' : ''}`}
              >
                <option value="NEW">New</option>
                <option value="HOT">Hot</option>
                <option value="COLD">Cold</option>
                <option value="CLOSED">Closed</option>
              </select>
              <ChevronDown size={12} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${sCfg.text}`} />
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* ─── BODY — two columns ─── */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100 min-h-0">

            {/* ════════ LEFT: CRM PANEL ════════ */}
            <div className="flex flex-col min-h-0">
              {/* sub-tabs */}
              <div className="flex gap-1 px-5 pt-4 pb-2">
                {[
                  { key: 'history', label: 'History', icon: MessageSquare },
                  { key: 'tasks', label: 'Tasks', icon: ListTodo },
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => setCrmTab(t.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      crmTab === t.key
                        ? 'bg-brand-600/10 text-brand-600'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <t.icon size={14} />
                    {t.label}
                    {t.key === 'tasks' && tasks.filter(tk => !tk.is_completed).length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-red-500 text-white leading-none">
                        {tasks.filter(tk => !tk.is_completed).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-3">
                {/* ── History Tab ── */}
                {crmTab === 'history' && (
                  <>
                    {/* add interaction form */}
                    <form onSubmit={handleAddNote} className="flex gap-2 items-end">
                      <select
                        value={noteType}
                        onChange={(e) => setNoteType(e.target.value)}
                        className="px-2.5 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-brand-600 focus:border-transparent"
                      >
                        <option value="NOTE">Note</option>
                        <option value="CALL">Call</option>
                        <option value="EMAIL">Email</option>
                        <option value="MEETING">Meeting</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Log an interaction…"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-600 focus:border-transparent"
                      />
                      <button
                        type="submit"
                        disabled={addingNote || !newNote.trim()}
                        className="p-2 bg-brand-600 text-white rounded-lg hover:bg-[#e65100] transition-colors disabled:opacity-40"
                      >
                        <Send size={16} />
                      </button>
                    </form>

                    {/* timeline */}
                    {interactionsLoading ? (
                      <div className="py-8 text-center">
                        <div className="inline-block h-5 w-5 border-2 border-gray-200 border-t-brand-600 rounded-full animate-spin" />
                      </div>
                    ) : interactions.length === 0 ? (
                      <div className="py-8 text-center">
                        <MessageSquare className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-gray-400 text-xs">No interactions yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {interactions.map((item) => (
                          <div key={item.id} className="flex gap-2.5 items-start bg-gray-50 rounded-xl p-3">
                            <div className="mt-0.5">{interactionIcon(item.interaction_type)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                  {item.interaction_type_display || item.interaction_type}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {new Date(item.created_at).toLocaleString()}
                                </span>
                                {item.created_by_name && (
                                  <span className="text-[10px] text-gray-400">by {item.created_by_name}</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed">{item.notes}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* ── Tasks Tab ── */}
                {crmTab === 'tasks' && (
                  <>
                    {!showTaskForm ? (
                      <button
                        onClick={() => setShowTaskForm(true)}
                        className="flex items-center gap-2 w-full px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-brand-600 hover:text-brand-600 transition-colors"
                      >
                        <Plus size={16} />
                        Add follow-up task
                      </button>
                    ) : (
                      <form onSubmit={handleAddTask} className="bg-gray-50 rounded-xl p-4 space-y-3">
                        <input
                          type="text"
                          placeholder="Task title…"
                          value={taskForm.title}
                          onChange={(e) => setTaskForm(p => ({ ...p, title: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-600 focus:border-transparent"
                          required
                        />
                        <div className="flex gap-2">
                          <input
                            type="datetime-local"
                            value={taskForm.due_date}
                            onChange={(e) => setTaskForm(p => ({ ...p, due_date: e.target.value }))}
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-600 focus:border-transparent"
                            required
                          />
                          <select
                            value={taskForm.priority}
                            onChange={(e) => setTaskForm(p => ({ ...p, priority: e.target.value }))}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-600 focus:border-transparent"
                          >
                            <option value="HIGH">High</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="LOW">Low</option>
                          </select>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => { setShowTaskForm(false); setTaskForm({ title: '', due_date: '', priority: 'MEDIUM' }); }}
                            className="px-3 py-1.5 text-gray-500 text-sm hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={addingTask}
                            className="px-4 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-[#e65100] transition-colors disabled:opacity-50"
                          >
                            {addingTask ? 'Adding…' : 'Add Task'}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* task list */}
                    {tasksLoading ? (
                      <div className="py-8 text-center">
                        <div className="inline-block h-5 w-5 border-2 border-gray-200 border-t-brand-600 rounded-full animate-spin" />
                      </div>
                    ) : tasks.length === 0 ? (
                      <div className="py-8 text-center">
                        <ListTodo className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-gray-400 text-xs">No tasks yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {tasks.map((task) => (
                          <div
                            key={task.id}
                            className={`flex items-center gap-3 bg-gray-50 rounded-xl p-3 ${task.is_completed ? 'opacity-50' : ''}`}
                          >
                            <button
                              onClick={() => toggleTaskComplete(task)}
                              className={`shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                task.is_completed
                                  ? 'bg-green-500 border-green-500 text-white'
                                  : 'border-gray-300 hover:border-brand-600'
                              }`}
                            >
                              {task.is_completed && <CheckCircle size={12} />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${task.is_completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                {task.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-gray-400">
                                  Due: {new Date(task.due_date).toLocaleString()}
                                </span>
                                {task.assigned_to_name && (
                                  <span className="text-[10px] text-gray-400">• {task.assigned_to_name}</span>
                                )}
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${PRIORITY_STYLES[task.priority]}`}>
                              {task.priority}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ════════ RIGHT: SUBMISSION DATA ════════ */}
            <div className="overflow-y-auto px-5 py-4 space-y-5">

              {/* Contact Info card */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact</h4>
                <div className="space-y-2">
                  {lead.customer_email && (
                    <a href={`mailto:${lead.customer_email}`} className="flex items-center gap-2.5 text-sm text-gray-700 hover:text-brand-600 transition-colors">
                      <Mail size={15} className="text-gray-400 shrink-0" />
                      {lead.customer_email}
                    </a>
                  )}
                  {lead.customer_phone && (
                    <a href={`tel:${lead.customer_phone}`} className="flex items-center gap-2.5 text-sm text-gray-700 hover:text-brand-600 transition-colors">
                      <Phone size={15} className="text-gray-400 shrink-0" />
                      {lead.customer_phone}
                    </a>
                  )}
                  <div className="flex items-center gap-2.5 text-sm text-gray-500">
                    <MapPin size={15} className="text-gray-400 shrink-0" />
                    {lead.source}
                  </div>
                  {lead.assigned_to_name && (
                    <div className="flex items-center gap-2.5 text-sm text-gray-500">
                      <User size={15} className="text-gray-400 shrink-0" />
                      Assigned to {lead.assigned_to_name}
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle Request (if applicable) */}
              {lead.lead_type === 'VEHICLE_REQUEST' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Vehicle Interest</h4>
                  <div className="bg-purple-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Car size={18} className="text-purple-600" />
                      <span className="font-semibold text-gray-900">
                        {lead.desired_make || 'Any Make'} {lead.desired_model || 'Any Model'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase">Year Range</p>
                        <p className="font-medium text-gray-900">
                          {lead.preferred_year_min || 'Any'} – {lead.preferred_year_max || 'Any'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase">Max Budget</p>
                        <p className="font-bold text-brand-600">{formatCurrency(lead.max_budget)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Credit Check Consent (FINANCING leads only) */}
              {lead.lead_type === 'FINANCING' && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Credit Check Consent</h4>
                  {lead.credit_check_consent === true && (
                    <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                      <ShieldCheck size={20} className="text-green-600 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-green-800">Consent Given</p>
                        <p className="text-xs text-green-600 mt-0.5">Applicant authorized a credit check</p>
                      </div>
                    </div>
                  )}
                  {lead.credit_check_consent === false && (
                    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                      <ShieldX size={20} className="text-red-500 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-red-700">Consent Not Given</p>
                        <p className="text-xs text-red-500 mt-0.5">Applicant did not authorize a credit check</p>
                      </div>
                    </div>
                  )}
                  {(lead.credit_check_consent === null || lead.credit_check_consent === undefined) && (
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                      <ShieldAlert size={20} className="text-gray-400 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-600">No Response</p>
                        <p className="text-xs text-gray-400 mt-0.5">Consent status was not recorded</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Submission Data — parsed notes */}
              {(structured.length > 0 || freeText) && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Submission Data</h4>

                  {/* Structured key-value pairs */}
                  {structured.length > 0 && (
                    <div className="bg-gray-50 rounded-xl overflow-hidden divide-y divide-gray-100">
                      {structured.map((pair, i) => (
                        <div key={i} className="flex px-4 py-2.5">
                          <span className="text-xs text-gray-500 w-36 shrink-0 font-medium">{pair.key}</span>
                          <span className="text-sm text-gray-900 font-medium">{pair.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Free-form text shown as a chat bubble */}
                  {freeText && (
                    <div className="flex gap-2.5 items-start">
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                        {lead.customer_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-full">
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{freeText}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* If no notes at all */}
              {!lead.notes?.trim() && lead.lead_type !== 'VEHICLE_REQUEST' && (
                <div className="py-6 text-center">
                  <FileText className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-xs">No submission data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── FOOTER: Quick Status Actions ─── */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/80">
          <div className="flex items-center gap-2">
            {currentStatus !== 'HOT' && currentStatus !== 'CLOSED' && (
              <button
                onClick={() => handleStatusChange('HOT')}
                disabled={statusUpdating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-100 text-brand-800 rounded-lg text-xs font-medium hover:bg-brand-200 transition-colors disabled:opacity-50"
              >
                <Clock size={14} /> Mark Hot
              </button>
            )}
            {currentStatus !== 'COLD' && currentStatus !== 'CLOSED' && (
              <button
                onClick={() => handleStatusChange('COLD')}
                disabled={statusUpdating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                <Archive size={14} /> Mark Cold
              </button>
            )}
            {currentStatus !== 'CLOSED' && (
              <button
                onClick={() => handleStatusChange('CLOSED')}
                disabled={statusUpdating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors disabled:opacity-50"
              >
                <CheckCircle size={14} /> Close
              </button>
            )}
            {currentStatus === 'CLOSED' && (
              <button
                onClick={() => handleStatusChange('NEW')}
                disabled={statusUpdating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors disabled:opacity-50"
              >
                <XCircle size={14} /> Reopen
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-gray-500 text-sm hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailModal;
