import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../../services/complaintService';

const NOTIF_ICONS = {
  citizen_verification: '🔍',
  complaint_reopened: '🔄',
  complaint_closed: '✅',
};

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await getNotifications();
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open]);

  const handleMarkRead = async (id, complaintId) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (complaintId) navigate(`/complaints/${complaintId}`);
      setOpen(false);
    } catch {
      // silently fail
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // silently fail
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1.5 hover:bg-green-600 rounded-lg transition"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 text-center text-sm text-gray-400">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400">No notifications</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n._id}
                  onClick={() => handleMarkRead(n._id, n.complaintId?._id)}
                  className={`w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 transition ${
                    !n.read ? 'bg-purple-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{NOTIF_ICONS[n.type] || '📋'}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${!n.read ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                        {n.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {format(new Date(n.createdAt), 'dd MMM yyyy, h:mm a')}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="w-2 h-2 bg-purple-600 rounded-full flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
