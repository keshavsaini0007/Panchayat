import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, RefreshCw, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "@/services/complaintService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NOTIF_ICONS = {
  citizen_verification: "🔍",
  complaint_reopened: "🔄",
  complaint_closed: "✅",
};

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const fetchRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getNotifications();
      setNotifications(res.data?.notifications || []);
      setUnreadCount(res.data?.unreadCount || 0);
    } catch (err) {
      setError(err?.message || "Failed to load notifications");
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Badge must reflect unread count as soon as the page loads — not only after
  // the dropdown is first opened.
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleOpenChange = (isOpen) => {
    setOpen(isOpen);
    if (isOpen) {
      if (!fetchRef.current) {
        fetchRef.current = true;
        fetchNotifications();
      }
    } else {
      fetchRef.current = false;
    }
  };

  const handleRetry = () => {
    fetchNotifications();
  };

  const handleMarkRead = async (id, complaintId) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
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
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`${unreadCount} unread notifications`}>
          <Bell className="h-5 w-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1"
              >
                <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="h-auto p-0 text-xs text-primary"
            >
              <CheckCheck className="mr-1 h-3 w-3" /> Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : error ? (
            <div className="p-4 text-center text-sm text-muted-foreground space-y-2">
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={handleRetry}>
                <RefreshCw className="mr-1 h-3 w-3" /> Retry
              </Button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem
                key={n._id}
                onClick={() => handleMarkRead(n._id, n.complaintId?._id)}
                className={`cursor-pointer px-4 py-3 ${!n.read ? "bg-muted/30 font-medium" : ""}`}
              >
                <div className="flex items-start gap-2 w-full">
                  <span className="text-lg mt-0.5">{NOTIF_ICONS[n.type] || "📋"}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {n.createdAt ? format(new Date(n.createdAt), "dd MMM yyyy, h:mm a") : ""}
                    </p>
                  </div>
                  {!n.read && <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationBell;
