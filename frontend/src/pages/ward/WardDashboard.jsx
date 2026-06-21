import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, ThumbsUp, Calendar, ChevronDown, X } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { getWardComplaints, updateStatus } from '../../services/complaintService';
import { COMPLAINT_STATUSES } from '../../utils/constants';
import StatusBadge from '../../components/complaints/StatusBadge';

const PRIORITY_TINT = {
  urgent: 'bg-red-50',
  high: 'bg-orange-50',
  medium: 'bg-yellow-50',
  low: '',
};

const CATEGORY_LABELS = {
  roads: 'Roads', bridges: 'Bridges', buildings: 'Buildings',
  water_supply: 'Water Supply', electricity: 'Electricity', street_lights: 'Street Lights',
  garbage: 'Garbage', sewage: 'Sewage', drainage: 'Drainage',
  dangerous_structures: 'Dangerous Structures', open_manholes: 'Open Manholes',
  scheme_delays: 'Scheme Delays', other: 'Other',
};

function WardDashboard() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [modal, setModal] = useState(null);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;
      const res = await getWardComplaints(params);
      let data = res.data.complaints;
      if (sortBy === 'upvotes') data.sort((a, b) => b.upvoteCount - a.upvoteCount);
      setComplaints(data);
      setTotalCount(res.data.totalCount);
      setPages(res.data.pages);
    } catch {
      toast.error('Failed to load ward complaints');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, sortBy]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const stats = {
    total: totalCount,
    pending: complaints.filter((c) => c.status === 'pending').length,
    inProgress: complaints.filter((c) => c.status === 'in_progress').length,
    resolved: complaints.filter((c) => c.status === 'resolved').length,
    verificationPending: complaints.filter((c) => c.status === 'citizen_verification_pending' || c.status === 'awaiting_citizen_response').length,
    reopened: complaints.filter((c) => c.status === 'reopened').length,
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = {
      status: form.status.value,
    };
    if (payload.status === 'rejected') payload.rejectionReason = form.reason.value;
    if (payload.status === 'resolved') payload.resolutionRemarks = form.resolutionRemarks.value;
    if (form.assign.value) payload.assignedTo = form.assign.value;
    try {
      const res = await updateStatus(modal._id, payload);
      setComplaints((prev) => prev.map((c) => (c._id === modal._id ? res.data : c)));
      setModal(null);
      toast.success('Status updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-gray-200 rounded" />)}
        </div>
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Ward Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-blue-600 bg-blue-50' },
          { label: 'Pending', value: stats.pending, color: 'text-yellow-600 bg-yellow-50' },
          { label: 'In Progress', value: stats.inProgress, color: 'text-orange-600 bg-orange-50' },
          { label: 'Verification Pending', value: stats.verificationPending, color: 'text-purple-600 bg-purple-50' },
          { label: 'Reopened', value: stats.reopened, color: 'text-red-600 bg-red-50' },
          { label: 'Resolved', value: stats.resolved, color: 'text-green-600 bg-green-50' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Statuses</option>
          {COMPLAINT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="date">Sort by Date</option>
          <option value="upvotes">Sort by Upvotes</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl shadow-sm border">
        <table className="w-full text-sm bg-white">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Priority</th>
              <th className="text-left px-4 py-3"><ThumbsUp size={14} className="inline" /></th>
              <th className="text-left px-4 py-3"><Calendar size={14} className="inline" /></th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {complaints.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">No complaints in your ward</td></tr>
            ) : (
              complaints.map((c) => (
                <tr key={c._id} className={`hover:bg-gray-50 transition ${PRIORITY_TINT[c.priority] || ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-800 max-w-[200px] truncate">{c.title}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize whitespace-nowrap">{CATEGORY_LABELS[c.category] || c.category}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 capitalize text-sm">{c.priority}</td>
                  <td className="px-4 py-3 text-gray-600">{c.upvoteCount || 0}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{format(new Date(c.createdAt), 'dd MMM yyyy')}</td>
                  <td className="px-4 py-3">
                    <div className="relative group">
                      <button className="flex items-center gap-1 px-2 py-1 border rounded text-sm hover:bg-gray-50 transition">
                        Actions <ChevronDown size={14} />
                      </button>
                      <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-10 hidden group-hover:block min-w-[160px]">
                        <button
                          onClick={() => navigate(`/complaints/${c._id}`)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 transition"
                        >
                          <Eye size={14} /> View Details
                        </button>
                        <button
                          onClick={() => setModal(c)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 transition"
                        >
                          <ChevronDown size={14} /> Update Status
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 border rounded text-sm disabled:opacity-40 hover:bg-gray-100 transition"
          >
            Previous
          </button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-3 py-1.5 rounded text-sm transition ${p === page ? 'bg-green-600 text-white' : 'border hover:bg-gray-100'}`}
            >
              {p}
            </button>
          ))}
          <button
            disabled={page === pages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 border rounded text-sm disabled:opacity-40 hover:bg-gray-100 transition"
          >
            Next
          </button>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Update Status</h2>
              <button onClick={() => setModal(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  defaultValue={modal.status}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {COMPLAINT_STATUSES.filter((s) => !['citizen_verification_pending', 'awaiting_citizen_response', 'closed'].includes(s.value)).map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign To (User ID)</label>
                <input
                  name="assign"
                  type="text"
                  defaultValue={modal.assignedTo?._id || ''}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="User ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Remarks</label>
                <textarea
                  name="resolutionRemarks"
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder="Describe the resolution (required for resolved status)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason</label>
                <textarea
                  name="reason"
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder="Required if rejecting"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default WardDashboard;
