import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { format } from 'date-fns';
import api from '../lib/api';
import { DashboardData } from '../types';

const fmt = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const monthLabel = (y: number, m: number) => format(new Date(y, m - 1, 1), 'MMM yy');

function KpiCard({ title, value, sub, color }: { title: string; value: string; sub?: string; color: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((r) => r.data),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading dashboard…</div>;
  if (error) return <div className="text-red-600">Failed to load dashboard</div>;
  if (!data) return null;

  const { kpis, lowStockMaterials, topConsumedMaterials, monthlyConsumption, monthlyProduction, orderStatusDistribution } = data;

  const consumptionChart = monthlyConsumption.map((d) => ({
    month: monthLabel(d._id.year, d._id.month),
    consumed: Math.round(d.totalConsumed),
    cost: Math.round(d.totalCost),
  }));

  const productionChart = monthlyProduction.map((d) => ({
    month: monthLabel(d._id.year, d._id.month),
    orders: d.count,
    qty: d.totalQuantity,
  }));

  const statusChart = orderStatusDistribution.map((d) => ({
    name: d._id.replace('_', ' '),
    value: d.count,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total Inventory Value" value={fmt(kpis.totalInventoryValue)} color="text-blue-600" />
        <KpiCard title="Raw Material Value" value={fmt(kpis.rawMaterialValue)} color="text-indigo-600" />
        <KpiCard title="Finished Goods Value" value={fmt(kpis.finishedGoodsValue)} color="text-green-600" />
        <KpiCard title="Production Today" value={String(kpis.productionToday)} sub="orders" color="text-amber-600" />
        <KpiCard title="Production This Month" value={String(kpis.productionMonth)} sub="completed" color="text-teal-600" />
        <KpiCard title="Pending Sales Orders" value={String(kpis.pendingOrders)} color="text-orange-600" />
        <KpiCard title="Low Stock Alerts" value={String(kpis.lowStockCount)} sub="materials below min" color={kpis.lowStockCount > 0 ? 'text-red-600' : 'text-gray-600'} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Monthly Material Consumption</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={consumptionChart}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="consumed" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Monthly Production Orders</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={productionChart}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Order Status Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {statusChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Top Consumed Materials</h3>
          <div className="space-y-3">
            {topConsumedMaterials.length === 0 && <p className="text-gray-400 text-sm">No consumption data yet</p>}
            {topConsumedMaterials.map((m, i) => (
              <div key={m._id} className="flex items-center gap-3">
                <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{m.materialName}</p>
                  <p className="text-xs text-gray-500">{m.totalConsumed.toFixed(2)} {m.unit}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockMaterials.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-3 text-red-600">Low Stock Alerts</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-th">Material</th>
                  <th className="table-th">Category</th>
                  <th className="table-th">Current Stock</th>
                  <th className="table-th">Min Stock</th>
                  <th className="table-th">Unit</th>
                </tr>
              </thead>
              <tbody>
                {lowStockMaterials.map((m) => (
                  <tr key={m._id} className="border-b border-gray-100 hover:bg-red-50">
                    <td className="table-td font-medium">{m.materialName}</td>
                    <td className="table-td text-gray-500">{m.category}</td>
                    <td className="table-td text-red-600 font-semibold">{m.currentStock} {m.unit}</td>
                    <td className="table-td">{m.minimumStock} {m.unit}</td>
                    <td className="table-td">{m.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
