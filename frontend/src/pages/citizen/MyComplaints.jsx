import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Trash2, ThumbsUp, Calendar, Inbox } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { getMyComplaints, deleteComplaint } from '../../services/complaintService';
import StatusBadge from '../../components/complaints/StatusBadge';

const TABS = ['All', 'Pending', 'In Progress', 'Resolved', 'Closed'];

const CATEGORY_LABELS = {
  roads: 'Roads', bridges: 'Bridges', buildings: 'Buildings',
  water_supply: 'Water Supply', electricity: 'Electricity', street_lights: 'Street Lights',
  garbage: 'Garbage', sewage: 'Sewage', drainage: 'Drainage',
  dangerous_structures: 'Dangerous Structures', open_manholes: 'Open Manholes',
  scheme_delays: 'Scheme Delays', other: 'Other',
};

function MyComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  const fetchComplaints = useCallback(async () => {
    try {
      const res = await getMyComplaints();
      setComplaints(res.data.complaints);
    } catch {
      toast.error('Failed to load complaints');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this complaint?')) return;
    try {
      await deleteComplaint(id);
      setComplaints((prev) => prev.filter((c) => c._id !== id));
      toast.success('Complaint deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const statusCounts = {
    pending: complaints.filter((c) => c.status === 'pending').length,
    in_progress: complaints.filter((c) => c.status === 'in_progress').length,
    resolved: complaints.filter((c) => c.status === 'resolved').length,
    closed: complaints.filter((c) => c.status === 'closed').length,
  };

  const filtered = activeTab === 'All'
    ? complaints
    : complaints.filter((c) => c.status === activeTab.toLowerCase().replace(' ', '_'));

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-6 bg-gray-200 rounded w-full" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">My Complaints</h1>

      <div className="flex flex-wrap gap-3 mb-6">
        {Object.entries({ All: complaints.length, ...statusCounts }).map(([key, count]) => {
          const tabKey = key === 'in_progress' ? 'In Progress' : key.charAt(0).toUpperCase() + key.slice(1);
          const label = key === 'All' ? 'All' : tabKey;
          return (
            <div key={key} className="bg-white border rounded-lg px-4 py-2 text-center min-w-[100px]">
              <p className="text-2xl font-bold text-gray-800">{count}</p>
              <p className="text-xs text-gray-500 capitalize">{label.replace('_', ' ')}</p>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 mb-6 border-b pb-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm font-medium rounded-t transition ${
              activeTab === tab
                ? 'bg-green-600 text-white'
                : 'text-gray-500 hover:text-green-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Inbox size={64} />
          <p className="mt-4 text-lg font-medium">No complaints found</p>
          <Link to="/submit" className="mt-2 text-sm text-green-600 hover:underline">Submit a complaint</Link>
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm bg-white rounded-xl shadow-sm border">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3">#</th>
                  <th className="text-left px-4 py-3">Title</th>
                  <th className="text-left px-4 py-3">Category</th>
                  <th className="text-left px-4 py-3">Ward</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3"><ThumbsUp size={14} className="inline" /></th>
                  <th className="text-left px-4 py-3"><Calendar size={14} className="inline" /></th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((c, i) => (
                  <tr key={c._id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-[200px] truncate">{c.title}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{CATEGORY_LABELS[c.category] || c.category}</td>
                    <td className="px-4 py-3 text-gray-600">{c.ward}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3 text-gray-600">{c.upvoteCount || 0}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(c.createdAt), 'dd MMM yy')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/complaints/${c._id}`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition">
                          <Eye size={16} />
                        </Link>
                        <button onClick={() => handleDelete(c._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {filtered.map((c) => (
              <div key={c._id} className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-800 line-clamp-1">{c.title}</h3>
                  <StatusBadge status={c.status} />
                </div>
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                  <span className="capitalize">{CATEGORY_LABELS[c.category] || c.category}</span>
                  <span>Ward {c.ward}</span>
                  <span className="flex items-center gap-1"><ThumbsUp size={12} /> {c.upvoteCount || 0}</span>
                  <span className="flex items-center gap-1"><Calendar size={12} /> {format(new Date(c.createdAt), 'dd MMM yy')}</span>
                </div>
                <div className="flex gap-3 mt-3 pt-2 border-t">
                  <Link to={`/complaints/${c._id}`} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                    <Eye size={14} /> View
                  </Link>
                  <button onClick={() => handleDelete(c._id)} className="flex items-center gap-1 text-sm text-red-600 hover:underline">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default MyComplaints;
