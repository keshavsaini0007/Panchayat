import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Inbox } from 'lucide-react';
import toast from 'react-hot-toast';
import { getComplaints, upvoteComplaint } from '../../services/complaintService';
import useAuthStore from '../../store/authStore';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES } from '../../utils/constants';
import ComplaintCard from '../../components/complaints/ComplaintCard';

function Home() {
  const user = useAuthStore((s) => s.user);
  const [complaints, setComplaints] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({ search: '', category: '', status: '', village: '' });

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;
      if (filters.village) params.village = filters.village;

      const res = await getComplaints(params);
      let data = res.data.complaints;
      if (filters.search) {
        data = data.filter((c) =>
          c.title.toLowerCase().includes(filters.search.toLowerCase())
        );
      }
      setComplaints(data);
      setTotalCount(filters.search ? data.length : res.data.totalCount);
      setPages(filters.search ? 1 : res.data.pages);
    } catch {
      toast.error('Failed to load complaints');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleUpvote = async (id) => {
    if (!user) return toast.error('Please login to upvote');
    try {
      const res = await upvoteComplaint(id);
      setComplaints((prev) =>
        prev.map((c) =>
          c._id === id
            ? { ...c, upvoteCount: res.data.upvoteCount, upvotes: c.upvotes }
            : c
        )
      );
    } catch {
      toast.error('Failed to upvote');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Community Complaints</h1>
          <p className="text-gray-500 text-sm mt-1">Showing {complaints.length} of {totalCount} complaints</p>
        </div>
        {user && (
          <Link
            to="/submit"
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition self-start"
          >
            <Plus size={18} /> Submit a Complaint
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <select
          value={filters.category}
          onChange={(e) => handleFilterChange('category', e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Categories</option>
          {COMPLAINT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Statuses</option>
          {COMPLAINT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Village..."
          value={filters.village}
          onChange={(e) => handleFilterChange('village', e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border p-5 animate-pulse space-y-3">
              <div className="h-5 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/4" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : complaints.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Inbox size={64} />
          <p className="mt-4 text-lg font-medium">No complaints found</p>
          <p className="text-sm">Try adjusting your filters or submit a new complaint.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {complaints.map((c) => (
              <ComplaintCard key={c._id} complaint={c} onUpvote={handleUpvote} />
            ))}
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
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
        </>
      )}
    </div>
  );
}

export default Home;
