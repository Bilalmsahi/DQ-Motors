import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, ShoppingCart, Clock, Target, Loader2, CalendarDays,
  Trophy, Medal, Award, Users, ChevronDown, BarChart3,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../../services/api';

/* ── palette ─────────────────────────────────────────────── */

const BRAND_COLORS = [
  '#E20505', '#052199', '#10B981', '#8B5CF6', '#F59E0B',
  '#EC4899', '#14B8A6', '#3B82F6', '#6366F1', '#84CC16',
];

const FUNNEL_COLORS = ['#052199', '#8B5CF6', '#F59E0B', '#10B981'];

/* ── small progress ring ─────────────────────────────────── */

function ProgressRing({ value, size = 80, stroke = 7 }) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(value, 0), 100);
  const offset = circ - (pct / 100) * circ;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="#F1F5F9" strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="#E20505" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
    </svg>
  );
}

/* ── custom tooltip ──────────────────────────────────────── */

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-white border border-gray-100 shadow-lg px-4 py-2.5 text-sm">
      <p className="font-semibold text-gray-800">{label || payload[0]?.name}</p>
      <p className="text-brand-600 font-bold">{payload[0]?.value?.toLocaleString()}</p>
    </div>
  );
}

/* ── pie label ───────────────────────────────────────────── */
const renderPieLabel = ({ name, percent }) =>
  `${name} ${(percent * 100).toFixed(0)}%`;

/* ════════════════════════════════════════════════════════════ */
export default function AdminPerformance() {
  const [kpi, setKpi] = useState(null);
  const [funnel, setFunnel] = useState([]);
  const [topModels, setTopModels] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  // Date range controls
  const [range, setRange] = useState('ytd');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const buildParams = useCallback(() => {
    const today = new Date();
    let start, end;

    switch (range) {
      case 'month': {
        start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      }
      case 'quarter': {
        const qMonth = Math.floor(today.getMonth() / 3) * 3;
        start = new Date(today.getFullYear(), qMonth, 1).toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      }
      case 'year':
        start = `${today.getFullYear()}-01-01`;
        end = today.toISOString().split('T')[0];
        break;
      case 'custom':
        start = customStart || `${today.getFullYear()}-01-01`;
        end = customEnd || today.toISOString().split('T')[0];
        break;
      default: // ytd
        start = `${today.getFullYear()}-01-01`;
        end = today.toISOString().split('T')[0];
    }
    return `start_date=${start}&end_date=${end}`;
  }, [range, customStart, customEnd]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const qs = buildParams();
      const [kpiData, funnelData, modelsData, lbData] = await Promise.all([
        api.get(`/financials/performance/kpi/?${qs}`),
        api.get(`/financials/performance/funnel/?${qs}`),
        api.get(`/financials/performance/top-models/?${qs}`),
        api.get(`/financials/performance/leaderboard/?${qs}`),
      ]);
      setKpi(kpiData);
      setFunnel(funnelData.funnel || []);
      setTopModels(modelsData.top_models || []);
      setLeaderboard(lbData.leaderboard || []);
    } catch (err) {
      console.error('Performance fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── pie data for top models ────────────────────────────── */
  const pieData = topModels.map((m, i) => ({
    name: m.label,
    value: m.sold_count,
    fill: BRAND_COLORS[i % BRAND_COLORS.length],
  }));

  const rankIcons = [Trophy, Medal, Award];

  /* ────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header + Date Range ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-brand-600" /> Performance Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Operational metrics &amp; sales performance
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-4 pr-10 text-sm font-medium
                focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="ytd">Year to Date</option>
              <option value="year">Full Year</option>
              <option value="custom">Custom</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>

          {range === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
              />
              <span className="text-gray-400">–</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Sales Count */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-100">
              <ShoppingCart className="h-7 w-7 text-emerald-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{kpi?.total_sales ?? 0}</p>
              <p className="text-sm text-gray-500">Vehicles Sold</p>
            </div>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center">
              <ProgressRing value={kpi?.conversion_rate ?? 0} />
              <span className="absolute text-lg font-bold text-brand-600">
                {kpi?.conversion_rate ?? 0}%
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Lead Conversion</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {kpi?.won_leads ?? 0} won / {kpi?.total_leads ?? 0} leads
              </p>
            </div>
          </div>
        </div>

        {/* Avg Days to Sell */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100">
              <Clock className="h-7 w-7 text-blue-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {kpi?.avg_days_to_sell ?? 0}
                <span className="text-base font-normal text-gray-400 ml-1">days</span>
              </p>
              <p className="text-sm text-gray-500">Avg Inventory Velocity</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Charts Row ────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales Funnel (Horizontal Bar) */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target size={18} /> Sales Funnel
          </h3>
          {funnel.length === 0 ? (
            <p className="text-center py-12 text-gray-400">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={funnel}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#94A3B8' }} />
                <YAxis
                  type="category"
                  dataKey="stage"
                  width={100}
                  tick={{ fontSize: 13, fill: '#334155', fontWeight: 500 }}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={36}>
                  {funnel.map((_, i) => (
                    <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Sales by Brand (Pie) */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp size={18} /> Sales by Brand
          </h3>
          {pieData.length === 0 ? (
            <p className="text-center py-12 text-gray-400">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  label={renderPieLabel}
                  labelLine={false}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => <span className="text-xs text-gray-600 ml-1">{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Sales Rep Leaderboard ─────────────────────────── */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold text-gray-900">Sales Rep Leaderboard</h3>
        </div>

        {leaderboard.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p>No sales reps found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-4 w-12">#</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-4">Sales Rep</th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase px-6 py-4">Leads Assigned</th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase px-6 py-4">Deals Closed</th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase px-6 py-4">Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leaderboard.map((rep, idx) => {
                  const RankIcon = rankIcons[idx] || null;
                  const rankColors = ['text-amber-500', 'text-gray-400', 'text-brand-400'];

                  return (
                    <tr key={rep.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4">
                        {RankIcon ? (
                          <RankIcon className={`h-5 w-5 ${rankColors[idx]}`} />
                        ) : (
                          <span className="text-sm font-medium text-gray-400">{idx + 1}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-700 text-white text-sm font-bold">
                            {rep.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{rep.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-gray-700">
                        {rep.leads_assigned}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold bg-emerald-100 text-emerald-700">
                          {rep.deals_closed}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-bold text-gray-900">{rep.win_rate}%</span>
                          <div className="w-20 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-brand-600 transition-all duration-500"
                              style={{ width: `${Math.min(rep.win_rate, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
