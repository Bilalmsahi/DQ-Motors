import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import api from '../../services/api';

const POLL_INTERVAL = 60_000; // 60 seconds

const NotificationDropdown = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // ── Fetch unread count (lightweight poll) ──────────────
  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await api.get('/config/notifications/unread-count/');
      setUnreadCount(data.unread_count);
    } catch {
      // silently ignore – bell just stays at last known count
    }
  }, []);

  // Poll unread count on mount + every 60s
  useEffect(() => {
    fetchUnreadCount();
    const id = setInterval(fetchUnreadCount, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchUnreadCount]);

  // ── Fetch full list when dropdown opens ────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get('/config/notifications/');
      setNotifications(data);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggle = () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) fetchNotifications();
  };

  // ── Click a notification → mark read + navigate ────────
  const handleClick = async (notification) => {
    if (!notification.is_read) {
      try {
        await api.patch(`/config/notifications/${notification.id}/read/`);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // ignore – still navigate
      }
    }
    setOpen(false);
    if (notification.link) navigate(notification.link);
  };

  // ── Mark all as read ───────────────────────────────────
  const handleMarkAllRead = async () => {
    try {
      await api.post('/config/notifications/read-all/');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  // ── Close on outside click ─────────────────────────────
  useEffect(() => {
    const onClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // ── Time-ago helper ────────────────────────────────────
  const timeAgo = (dateStr) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={handleToggle}
        className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-gray-100 rounded-xl transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-12 w-96 rounded-xl border border-gray-100 bg-white shadow-xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
              >
                <CheckCheck size={14} />
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                    !n.is_read ? 'bg-brand-50/50' : ''
                  }`}
                >
                  {/* Unread dot */}
                  <div
                    className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
                      !n.is_read ? 'bg-brand-600' : 'bg-transparent'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm truncate ${
                        !n.is_read ? 'font-semibold text-slate-800' : 'text-gray-500'
                      }`}
                    >
                      {n.title}
                    </p>
                    <p
                      className={`text-xs mt-0.5 line-clamp-2 ${
                        !n.is_read ? 'text-slate-600' : 'text-gray-400'
                      }`}
                    >
                      {n.message}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
