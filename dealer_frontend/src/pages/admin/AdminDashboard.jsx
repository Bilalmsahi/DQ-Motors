import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Car, 
  Users, 
  CalendarCheck, 
  DollarSign,
  Plus,
  UserPlus,
  FileText,
  ArrowRight,
  Clock,
  CheckCircle,
  Loader2,
  Package,
  Wrench,
  Tag,
  ShoppingBag
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const formatCurrency = (value) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
};

const AdminDashboard = () => {
  const { user } = useAuth();

  // Dashboard Stats State
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Today's Appointments State
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Inventory Pipeline State
  const [pipelineStats, setPipelineStats] = useState(null);
  const [pipelineLoading, setPipelineLoading] = useState(true);

  // Fetch dashboard stats
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const data = await api.get('/config/dashboard-stats/');
        setDashboardData(data);
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        setDashboardLoading(false);
      }
    };
    fetchDashboardStats();
  }, []);

  // Fetch today's appointments
  useEffect(() => {
    const fetchTodayAppointments = async () => {
      try {
        const data = await api.get('/crm/appointments/today/');
        setTodayAppointments(data);
      } catch (err) {
        console.error('Failed to fetch today appointments:', err);
      } finally {
        setAppointmentsLoading(false);
      }
    };
    fetchTodayAppointments();
  }, []);

  // Fetch inventory pipeline stats
  useEffect(() => {
    const fetchPipelineStats = async () => {
      try {
        const data = await api.get('/inventory/stats/');
        setPipelineStats(data);
      } catch (err) {
        console.error('Failed to fetch pipeline stats:', err);
      } finally {
        setPipelineLoading(false);
      }
    };
    fetchPipelineStats();
  }, []);

  // Handle confirm appointment
  const handleConfirmAppointment = async (id) => {
    setActionLoading(id);
    try {
      await api.post(`/crm/appointments/${id}/confirm/`);
      setTodayAppointments(prev => 
        prev.map(apt => apt.id === id ? { ...apt, status: 'CONFIRMED' } : apt)
      );
    } catch (err) {
      alert('Failed to confirm: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle complete appointment
  const handleCompleteAppointment = async (id) => {
    setActionLoading(id);
    try {
      await api.post(`/crm/appointments/${id}/complete/`);
      setTodayAppointments(prev => 
        prev.map(apt => apt.id === id ? { ...apt, status: 'COMPLETED' } : apt)
      );
    } catch (err) {
      alert('Failed to complete: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Get status badge styling
  const getAppointmentStatusBadge = (status) => {
    const styles = {
      'PENDING': 'bg-amber-100 text-amber-700',
      'CONFIRMED': 'bg-green-100 text-green-700',
      'COMPLETED': 'bg-gray-100 text-gray-600',
      'CANCELLED': 'bg-red-100 text-red-600',
      'NO_SHOW': 'bg-slate-100 text-slate-600',
    };
    return styles[status] || styles['PENDING'];
  };

  // Build stats cards from API data
  const s = dashboardData?.stats || {};
  const userName = dashboardData?.user_name || user?.first_name || 'there';
  const activeLeadsCount = s.active_leads ?? 0;
  const stats = [
    {
      title: 'Total Inventory',
      value: dashboardLoading ? '—' : s.total_inventory,
      icon: Car,
      lightColor: 'bg-accent-50',
      textColor: 'text-accent-600'
    },
    {
      title: 'Active Leads',
      value: dashboardLoading ? '—' : s.active_leads,
      icon: Users,
      lightColor: 'bg-emerald-50',
      textColor: 'text-emerald-600'
    },
    {
      title: 'Pending Tasks',
      value: dashboardLoading ? '—' : s.pending_tasks,
      icon: CalendarCheck,
      lightColor: 'bg-amber-50',
      textColor: 'text-amber-600'
    },
    {
      title: 'Monthly Revenue',
      value: dashboardLoading ? '—' : formatCurrency(s.monthly_revenue || 0),
      icon: DollarSign,
      lightColor: 'bg-brand-50',
      textColor: 'text-brand-600'
    },
  ];

  const salesData = dashboardData?.sales_chart || [];
  const recentLeads = dashboardData?.recent_leads || [];
  const inventoryStatus = dashboardData?.inventory_status || {};
  const sixMonthTotal = dashboardData?.six_month_total || 0;

  const getStatusBadge = (status) => {
    const styles = {
      'NEW': 'bg-blue-100 text-blue-700',
      'HOT': 'bg-red-100 text-red-700',
      'COLD': 'bg-slate-100 text-slate-700',
      'CLOSED': 'bg-gray-100 text-gray-700',
    };
    return styles[status] || styles['NEW'];
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard Overview</h1>
          <p className="text-gray-500 mt-1">
            {dashboardLoading
              ? 'Loading your dashboard...'
              : `Welcome back, ${userName}. You have ${activeLeadsCount} active lead${activeLeadsCount !== 1 ? 's' : ''} today.`}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/admin/inventory"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white 
              shadow-lg shadow-brand-200 hover:bg-brand-700 transition-colors"
          >
            <Plus size={18} />
            Add Vehicle
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div 
              key={stat.title}
              className="group rounded-2xl bg-white p-6 shadow-sm border border-gray-100 
                hover:shadow-md hover:border-gray-200 transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div className={`rounded-xl ${stat.lightColor} p-3`}>
                  <Icon className={`h-6 w-6 ${stat.textColor}`} />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                <p className="mt-1 text-3xl font-bold text-slate-800">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Inventory Pipeline Widget */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Inventory Pipeline</h2>
            <p className="text-sm text-gray-500">Vehicle lifecycle overview</p>
          </div>
          <Link 
            to="/admin/inventory" 
            className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            View Inventory <ArrowRight size={14} />
          </Link>
        </div>
        
        {pipelineLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            <span className="ml-2 text-gray-500 text-sm">Loading pipeline...</span>
          </div>
        ) : pipelineStats ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Acquired */}
            <Link 
              to="/admin/inventory?status=ACQUIRED"
              className="group p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-slate-200">
                  <Package size={18} className="text-slate-600" />
                </div>
                <span className="text-2xl font-bold text-slate-800">
                  {pipelineStats.by_status?.ACQUIRED?.count || 0}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-600">Acquired</p>
              <p className="text-xs text-slate-400 mt-1">Just bought</p>
            </Link>

            {/* In Prep */}
            <Link 
              to="/admin/inventory?status=PREP"
              className="group p-4 rounded-xl bg-brand-50 border border-brand-100 hover:border-brand-200 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-brand-200">
                  <Wrench size={18} className="text-brand-700" />
                </div>
                <span className="text-2xl font-bold text-slate-800">
                  {pipelineStats.by_status?.PREP?.count || 0}
                </span>
              </div>
              <p className="text-sm font-medium text-brand-700">In Prep</p>
              <p className="text-xs text-brand-400 mt-1">Being reconditioned</p>
            </Link>

            {/* Ready */}
            <Link 
              to="/admin/inventory?status=READY"
              className="group p-4 rounded-xl bg-emerald-50 border border-emerald-100 hover:border-emerald-200 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-emerald-200">
                  <Tag size={18} className="text-emerald-600" />
                </div>
                <span className="text-2xl font-bold text-slate-800">
                  {pipelineStats.by_status?.READY?.count || 0}
                </span>
              </div>
              <p className="text-sm font-medium text-emerald-600">Ready</p>
              <p className="text-xs text-emerald-400 mt-1">Available for sale</p>
            </Link>

            {/* Pending */}
            <Link 
              to="/admin/inventory?status=PENDING"
              className="group p-4 rounded-xl bg-amber-50 border border-amber-100 hover:border-amber-200 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-amber-200">
                  <Clock size={18} className="text-amber-600" />
                </div>
                <span className="text-2xl font-bold text-slate-800">
                  {pipelineStats.by_status?.PENDING?.count || 0}
                </span>
              </div>
              <p className="text-sm font-medium text-amber-600">Pending</p>
              <p className="text-xs text-amber-400 mt-1">Deal in progress</p>
            </Link>

            {/* Sold */}
            <Link 
              to="/admin/inventory?status=SOLD"
              className="group p-4 rounded-xl bg-red-50 border border-red-100 hover:border-red-200 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-red-200">
                  <ShoppingBag size={18} className="text-red-600" />
                </div>
                <span className="text-2xl font-bold text-slate-800">
                  {pipelineStats.by_status?.SOLD?.count || 0}
                </span>
              </div>
              <p className="text-sm font-medium text-red-600">Sold</p>
              <p className="text-xs text-red-400 mt-1">Deal finalized</p>
            </Link>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">Unable to load pipeline data</p>
        )}
        
        {/* Pipeline Progress Bar */}
        {pipelineStats && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Pipeline Overview</span>
              <span className="text-sm font-medium text-slate-800">{pipelineStats.total} Total Vehicles</span>
            </div>
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden flex">
              {pipelineStats.total > 0 && (
                <>
                  <div 
                    className="h-full bg-slate-400 transition-all" 
                    style={{ width: `${(pipelineStats.by_status?.ACQUIRED?.count || 0) / pipelineStats.total * 100}%` }}
                    title={`Acquired: ${pipelineStats.by_status?.ACQUIRED?.count || 0}`}
                  />
                  <div 
                    className="h-full bg-brand-400 transition-all" 
                    style={{ width: `${(pipelineStats.by_status?.PREP?.count || 0) / pipelineStats.total * 100}%` }}
                    title={`In Prep: ${pipelineStats.by_status?.PREP?.count || 0}`}
                  />
                  <div 
                    className="h-full bg-emerald-400 transition-all" 
                    style={{ width: `${(pipelineStats.by_status?.READY?.count || 0) / pipelineStats.total * 100}%` }}
                    title={`Ready: ${pipelineStats.by_status?.READY?.count || 0}`}
                  />
                  <div 
                    className="h-full bg-amber-400 transition-all" 
                    style={{ width: `${(pipelineStats.by_status?.PENDING?.count || 0) / pipelineStats.total * 100}%` }}
                    title={`Pending: ${pipelineStats.by_status?.PENDING?.count || 0}`}
                  />
                  <div 
                    className="h-full bg-red-400 transition-all" 
                    style={{ width: `${(pipelineStats.by_status?.SOLD?.count || 0) / pipelineStats.total * 100}%` }}
                    title={`Sold: ${pipelineStats.by_status?.SOLD?.count || 0}`}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Middle Section: Chart + Recent Leads */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        
        {/* Sales Overview Chart */}
        <div className="lg:col-span-3 rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Sales Overview</h2>
              <p className="text-sm text-gray-500">Monthly revenue performance</p>
            </div>
            <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-700">
              Last 6 months
            </span>
          </div>
          
          {/* CSS Bar Chart */}
          {dashboardLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            </div>
          ) : salesData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">No sales data</div>
          ) : (
          <div className="flex items-end justify-between gap-4 h-64 pt-8">
            {salesData.map((item, index) => (
              <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-slate-600">{formatCurrency(item.amount)}</span>
                <div 
                  className={`w-full rounded-t-lg transition-all duration-500 ease-out
                    ${index === salesData.length - 1 ? 'bg-brand-600' : 'bg-brand-200 hover:bg-brand-300'}`}
                  style={{ height: `${item.value}%` }}
                />
                <span className="text-xs font-medium text-gray-500">{item.month}</span>
              </div>
            ))}
          </div>
          )}

          {/* Total Summary */}
          <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Revenue (6 months)</p>
              <p className="text-2xl font-bold text-slate-800">
                {dashboardLoading ? '—' : formatCurrency(sixMonthTotal)}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Leads */}
        <div className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Recent Leads</h2>
            <Link 
              to="/admin/leads" 
              className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          
          {dashboardLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-gray-400" size={24} />
            </div>
          ) : recentLeads.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto text-gray-300 mb-2" size={32} />
              <p className="text-gray-500 text-sm">No leads yet</p>
            </div>
          ) : (
          <div className="space-y-3">
            {recentLeads.map((lead) => (
              <div 
                key={lead.id}
                className="group flex items-center gap-3 rounded-xl p-3 hover:bg-gray-50 
                  transition-colors cursor-pointer border border-transparent hover:border-gray-100"
              >
                {/* Avatar */}
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full 
                  bg-gradient-to-br from-slate-700 to-slate-900 text-white text-sm font-semibold">
                  {lead.name.split(' ').map(n => n[0]).join('')}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-800 truncate">{lead.name}</p>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${getStatusBadge(lead.status)}`}>
                      {lead.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{lead.vehicle}</p>
                </div>

                {/* Time */}
                <span className="text-xs text-gray-400 whitespace-nowrap">{lead.time}</span>
              </div>
            ))}
          </div>
          )}

          {/* Quick Contact Actions */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
            <Link to="/admin/leads" className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 
              bg-gray-50 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-gray-100 transition-colors">
              <UserPlus size={16} />
              New Lead
            </Link>
            <Link to="/admin/leads" className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 
              bg-gray-50 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-gray-100 transition-colors">
              <Users size={16} />
              All Leads
            </Link>
          </div> 
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          
          {/* Add New Vehicle */}
          <Link 
            to="/admin/inventory"
            className="group flex items-center gap-4 rounded-xl border-2 border-dashed border-gray-200 
              p-5 hover:border-brand-600 hover:bg-brand-50/50 transition-all"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 
              group-hover:bg-brand-600 transition-colors">
              <Plus className="h-6 w-6 text-brand-600 group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Add New Vehicle</p>
              <p className="text-sm text-gray-500">List a car in inventory</p>
            </div>
          </Link>

          {/* Create Lead */}
          <Link 
            to="/admin/leads"
            className="group flex items-center gap-4 rounded-xl border-2 border-dashed border-gray-200 
              p-5 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 
              group-hover:bg-emerald-500 transition-colors">
              <UserPlus className="h-6 w-6 text-emerald-600 group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Create Lead</p>
              <p className="text-sm text-gray-500">Add a new customer lead</p>
            </div>
          </Link>

          {/* View Reports */}
          <Link 
            to="/admin/financials"
            className="group flex items-center gap-4 rounded-xl border-2 border-dashed border-gray-200 
              p-5 hover:border-blue-500 hover:bg-blue-50/50 transition-all"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 
              group-hover:bg-blue-500 transition-colors">
              <FileText className="h-6 w-6 text-blue-600 group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">View Reports</p>
              <p className="text-sm text-gray-500">Financial analytics</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Upcoming Tasks / Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        
        {/* Today's Appointments */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Today's Appointments</h2>
            <Link 
              to="/admin/calendar" 
              className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              View All <ArrowRight size={14} />
            </Link>
          </div>
          
          {appointmentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-gray-400" size={24} />
            </div>
          ) : todayAppointments.length === 0 ? (
            <div className="text-center py-8">
              <CalendarCheck className="mx-auto text-gray-300 mb-2" size={32} />
              <p className="text-gray-500 text-sm">No appointments scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayAppointments.slice(0, 4).map((apt) => (
                <div 
                  key={apt.id}
                  className="flex items-center gap-4 rounded-xl bg-gray-50 p-4 hover:bg-gray-100 transition-colors"
                >
                  <div className="text-sm font-medium text-brand-600 w-16">
                    {apt.time_slot_display || apt.time_slot}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {apt.appointment_type === 'TEST_DRIVE' ? '🚗' : '🔍'} {apt.customer_name}
                      </p>
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${getAppointmentStatusBadge(apt.status)}`}>
                        {apt.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{apt.vehicle_title}</p>
                  </div>
                  
                  {/* Quick Actions */}
                  {apt.status === 'PENDING' && (
                    <button
                      onClick={() => handleConfirmAppointment(apt.id)}
                      disabled={actionLoading === apt.id}
                      className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition"
                      title="Confirm"
                    >
                      {actionLoading === apt.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle size={16} />
                      )}
                    </button>
                  )}
                  {apt.status === 'CONFIRMED' && (
                    <button
                      onClick={() => handleCompleteAppointment(apt.id)}
                      disabled={actionLoading === apt.id}
                      className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition"
                      title="Mark Complete"
                    >
                      {actionLoading === apt.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle size={16} />
                      )}
                    </button>
                  )}
                </div>
              ))}
              
              {todayAppointments.length > 4 && (
                <p className="text-center text-sm text-gray-500 pt-2">
                  +{todayAppointments.length - 4} more appointments
                </p>
              )}
            </div>
          )}
        </div>

        {/* Inventory Status */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Inventory Status</h2>
          {dashboardLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-gray-400" size={24} />
            </div>
          ) : (
          <>
          <div className="space-y-4">
            {[
              { label: 'Available', count: inventoryStatus.available || 0, percentage: inventoryStatus.available_pct || 0, color: 'bg-emerald-500' },
              { label: 'Reserved', count: inventoryStatus.reserved || 0, percentage: inventoryStatus.reserved_pct || 0, color: 'bg-amber-500' },
              { label: 'Sold (This Month)', count: inventoryStatus.sold_this_month || 0, percentage: inventoryStatus.sold_pct || 0, color: 'bg-brand-600' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  <span className="text-sm font-semibold text-slate-800">{item.count} vehicles</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100">
                  <div 
                    className={`h-2 rounded-full ${item.color} transition-all duration-500`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total Inventory Value</span>
              <span className="text-lg font-bold text-slate-800">
                {formatCurrency(inventoryStatus.total_inventory_value || 0)}
              </span>
            </div>
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
