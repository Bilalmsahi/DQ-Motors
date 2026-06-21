import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, Percent,
  Loader2, RefreshCw, Car, CalendarDays, BarChart3,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { format, subDays, startOfYear, startOfQuarter } from 'date-fns';
import api from '../../services/api';

/* ─── colour palette for pie slices ──────────────────────── */
const PIE_COLORS = [
  '#E20505', '#052199', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#3B82F6',
  '#14B8A6', '#F97316', '#6366F1', '#84CC16',
];

/* ─── date range presets ─────────────────────────────────── */
const RANGES = [
  { key: '30d',      label: 'Last 30 Days' },
  { key: 'quarter',  label: 'This Quarter' },
  { key: 'ytd',      label: 'This Year' },
  { key: 'all',      label: 'All Time' },
];

function rangeToDates(key) {
  const today = new Date();
  switch (key) {
    case '30d':
      return { start: format(subDays(today, 30), 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
    case 'quarter':
      return { start: format(startOfQuarter(today), 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
    case 'ytd':
      return { start: format(startOfYear(today), 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
    case 'all':
      return { start: '2000-01-01', end: format(today, 'yyyy-MM-dd') };
    default:
      return { start: format(startOfYear(today), 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
  }
}

/* ─── currency formatter ─────────────────────────────────── */
const fmt = (v) =>
  Number(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const fmtFull = (v) =>
  Number(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

/* ─── custom area-chart tooltip ──────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-white/95 backdrop-blur shadow-lg border border-gray-100 px-4 py-3 text-sm">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-500 capitalize">{p.dataKey}:</span>
          <span className="font-semibold text-slate-800">{fmtFull(p.value)}</span>
        </p>
      ))}
    </div>
  );
};

/* ─── custom pie label ───────────────────────────────────── */
const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null; // hide tiny slices
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

/* ════════════════════════════════════════════════════════════ */
/*                      MAIN COMPONENT                         */
/* ════════════════════════════════════════════════════════════ */
export default function AdminFinancialDashboard() {
  const [range, setRange]             = useState('ytd');
  const [summary, setSummary]         = useState(null);
  const [chartData, setChartData]     = useState([]);
  const [pieData, setPieData]         = useState([]);
  const [topVehicles, setTopVehicles] = useState([]);
  const [loading, setLoading]         = useState(true);

  const { start, end } = useMemo(() => rangeToDates(range), [range]);

  /* ── fetch all four datasets in parallel ───────────────── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const qs = `?start_date=${start}&end_date=${end}`;
    try {
      const [sum, chart, pie, top] = await Promise.all([
        api.get(`/financials/stats/summary/${qs}`),
        api.get(`/financials/stats/chart-data/${qs}`),
        api.get(`/financials/stats/expenses-by-category/${qs}`),
        api.get(`/financials/stats/top-vehicles/${qs}&limit=5`),
      ]);
      setSummary(sum);
      setChartData(chart);
      setPieData(pie);
      setTopVehicles(top);
    } catch (err) {
      console.error('Analytics fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, [start, end]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── KPI card helper ───────────────────────────────────── */
  const KPICard = ({ label, value, icon: Icon, color, sub }) => (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5 flex items-start gap-4">
      <div className={`rounded-xl p-3 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-slate-800 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );

  const profitColor = (summary?.net_profit ?? 0) >= 0;

  /* ════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      {/* ─── Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Financial Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Revenue, expenses &amp; profitability at a glance</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Date range pills */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  range === r.key
                    ? 'bg-white text-brand-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={fetchAll}
            className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : (
        <>
          {/* ─── KPI Cards ───────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label="Revenue"
              value={fmt(summary?.revenue)}
              icon={DollarSign}
              color="bg-green-50 text-green-600"
              sub={`${summary?.vehicles_sold ?? 0} vehicles sold`}
            />
            <KPICard
              label="Total Expenses"
              value={fmt((summary?.cogs ?? 0) + (summary?.overhead ?? 0))}
              icon={TrendingDown}
              color="bg-red-50 text-red-500"
              sub={`COGS ${fmt(summary?.cogs)} + Overhead ${fmt(summary?.overhead)}`}
            />
            <KPICard
              label="Net Profit"
              value={fmt(summary?.net_profit)}
              icon={profitColor ? TrendingUp : TrendingDown}
              color={profitColor ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}
              sub={`Avg deal ${fmt(summary?.avg_deal_size)}`}
            />
            <KPICard
              label="Profit Margin"
              value={`${summary?.margin_pct ?? 0}%`}
              icon={Percent}
              color={profitColor ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}
              sub={profitColor ? 'Healthy' : 'Negative margin'}
            />
          </div>

          {/* ─── Area Chart ──────────────────────────────────── */}
          <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-5">
              <BarChart3 className="h-5 w-5 text-brand-600" />
              <h2 className="text-base font-bold text-slate-800">Revenue vs Expenses</h2>
            </div>

            {chartData.length === 0 ? (
              <p className="text-center text-gray-400 py-16">No data for the selected period.</p>
            ) : (
              <ResponsiveContainer width="100%" height={340}>
                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    fill="url(#gradRevenue)"
                    dot={{ r: 3, fill: '#10B981' }}
                    activeDot={{ r: 5 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="#EF4444"
                    strokeWidth={2.5}
                    fill="url(#gradExpense)"
                    dot={{ r: 3, fill: '#EF4444' }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ─── Bottom Row: Pie + Top Vehicles ──────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie (Donut) Chart */}
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-bold text-slate-800 mb-4">Expense Breakdown</h2>

              {pieData.length === 0 ? (
                <p className="text-center text-gray-400 py-16">No expense data.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="total"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={110}
                      paddingAngle={2}
                      labelLine={false}
                      label={renderPieLabel}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => fmtFull(value)}
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        fontSize: '13px',
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => (
                        <span className="text-xs text-gray-600">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top 5 Most Profitable Vehicles */}
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Car className="h-5 w-5 text-brand-600" />
                <h2 className="text-base font-bold text-slate-800">Top Profitable Vehicles</h2>
              </div>

              {topVehicles.length === 0 ? (
                <p className="text-center text-gray-400 py-16">No sold vehicles in this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-gray-400 text-xs uppercase tracking-wide">
                      <tr>
                        <th className="text-left pb-3">Vehicle</th>
                        <th className="text-right pb-3">Sold</th>
                        <th className="text-right pb-3">Cost</th>
                        <th className="text-right pb-3">Profit</th>
                        <th className="text-right pb-3">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {topVehicles.map((v, i) => (
                        <tr key={v.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-3 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600/10 text-[10px] font-bold text-brand-600">
                                {i + 1}
                              </span>
                              <span className="font-medium text-slate-700 whitespace-nowrap">{v.title}</span>
                            </div>
                          </td>
                          <td className="py-3 text-right text-gray-600">{fmt(v.sold_price)}</td>
                          <td className="py-3 text-right text-gray-600">{fmt(v.total_cost)}</td>
                          <td className={`py-3 text-right font-semibold ${v.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {fmt(v.profit)}
                          </td>
                          <td className="py-3 text-right">
                            <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                              v.margin_pct >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {v.margin_pct >= 0 ? '↑' : '↓'} {Math.abs(v.margin_pct)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
