import { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, Inbox } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { getAllUsers, updateUserRole, deleteUser } from '../../services/adminService';
import useAuthStore from '../../store/authStore';
import { USER_ROLES } from '../../utils/constants';

const ROLE_BADGE = {
  citizen: 'bg-gray-100 text-gray-700',
  ward_member: 'bg-blue-100 text-blue-700',
  gram_pradhan: 'bg-purple-100 text-purple-700',
  admin: 'bg-red-100 text-red-700',
};

const ROLE_TABS = ['All', ...USER_ROLES.map((r) => r.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()))];

const ROLE_MAP = { All: 'All', Citizen: 'citizen', 'Ward Member': 'ward_member', 'Gram Pradhan': 'gram_pradhan', Admin: 'admin' };

function ManageUsers() {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const params = {};
      if (activeTab !== 'All') params.role = ROLE_MAP[activeTab];
      const res = await getAllUsers(params);
      setUsers(res.data.users);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (userId, role) => {
    try {
      await updateUserRole(userId, role);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role, isVerified: role === 'ward_member' || role === 'gram_pradhan' ? true : u.isVerified } : u))
      );
      toast.success('Role updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      toast.success('User deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-10 bg-gray-200 rounded w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 bg-gray-200 rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Manage Users</h1>
      <p className="text-sm text-gray-500 mb-6">{users.length} user(s)</p>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b pb-2 overflow-x-auto">
        {ROLE_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setLoading(true); }}
            className={`whitespace-nowrap px-4 py-1.5 text-sm font-medium rounded-t transition ${
              activeTab === tab ? 'bg-green-600 text-white' : 'text-gray-500 hover:text-green-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Inbox size={64} />
          <p className="mt-4 text-lg font-medium">No users found</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow-sm border">
          <table className="w-full text-sm bg-white">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Phone</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Village</th>
                <th className="text-left px-4 py-3">Ward</th>
                <th className="text-left px-4 py-3">Verified</th>
                <th className="text-left px-4 py-3">Joined</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3 text-gray-600">{u.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${ROLE_BADGE[u.role] || ''}`}>
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.village}</td>
                  <td className="px-4 py-3 text-gray-600">{u.ward}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.isVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {u.isVerified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {u.createdAt ? format(new Date(u.createdAt), 'dd MMM yyyy') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        {USER_ROLES.map((r) => (
                          <option key={r} value={r}>{r.replace('_', ' ')}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleDelete(u._id)}
                        disabled={u._id === currentUser?._id}
                        className={`p-1.5 rounded transition ${
                          u._id === currentUser?._id
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                        title={u._id === currentUser?._id ? 'Cannot delete yourself' : 'Delete user'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ManageUsers;
