import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, UsersRound, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import toast from 'react-hot-toast';
import { getAnalytics } from '../../services/adminService';

const STATUS_COLORS = {
  pending: '#EAB308',
  approved: '#3B82F6',
  in_progress: '#F97316',
  resolved: '#22C55E',
  rejected: '#EF4444',
  closed: '#6B7280',
};

function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getAnalytics();
        setData(res.data);
      } catch {
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const resolvedCount = data.byStatus?.find((s) => s._id === 'resolved')?.count || 0;
  const pendingCount = data.byStatus?.find((s) => s._id === 'pending')?.count || 0;
  const rejectedCount = data.byStatus?.find((s) => s._id === 'rejected')?.count || 0;
  const resolvedRate = data.totalComplaints ? ((resolvedCount / data.totalComplaints) * 100).toFixed(1) : 0;
  const avgHours = data.avgResolutionHours ? Number(data.avgResolutionHours).toFixed(1) : 0;

  const sortedByCategory = [...(data.byCategory || [])].sort((a, b) => b.count - a.count);
  const sortedByVillage = [...(data.byVillage || [])].sort((a, b) => b.count - a.count);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <Link
          to="/admin/users"
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Users size={16} /> Manage Users
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { icon: AlertTriangle, label: 'Total Complaints', value: data.totalComplaints, color: 'text-blue-600 bg-blue-50' },
          { icon: UsersRound, label: 'Total Users', value: data.usersByRole?.reduce((a, b) => a + b.count, 0) || 0, color: 'text-purple-600 bg-purple-50' },
          { icon: CheckCircle, label: 'Resolved Rate', value: `${resolvedRate}%`, color: 'text-green-600 bg-green-50' },
          { icon: Clock, label: 'Avg Resolution', value: `${avgHours}h`, color: 'text-orange-600 bg-orange-50' },
          { icon: AlertTriangle, label: 'Pending', value: pendingCount, color: 'text-yellow-600 bg-yellow-50' },
          { icon: XCircle, label: 'Rejected', value: rejectedCount, color: 'text-red-600 bg-red-50' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
            <div className="flex items-center gap-2 mb-1">
              <s.icon size={18} />
              <p className="text-xs">{s.label}</p>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Complaints by Status</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data.byStatus || []} dataKey="count" nameKey="_id" cx="50%" cy="50%" outerRadius={90} label>
                {(data.byStatus || []).map((entry) => (
                  <Cell key={entry._id} fill={STATUS_COLORS[entry._id] || '#6B7280'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Complaints by Category</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sortedByCategory} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="_id" tick={{ fontSize: 11 }} width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="#22C55E" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Users by Role</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data.usersByRole || []} dataKey="count" nameKey="_id" cx="50%" cy="50%" outerRadius={90} label>
                {(data.usersByRole || []).map((entry, i) => (
                  <Cell key={entry._id} fill={['#22C55E', '#3B82F6', '#F97316', '#8B5CF6'][i % 4]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Complaints by Village</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sortedByVillage} margin={{ bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="_id" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#22C55E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
