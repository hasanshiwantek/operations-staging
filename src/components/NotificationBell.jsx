import { formatDistanceToNow } from "date-fns";
import { Bell, Check, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  NOTIFICATIONS_CHANGED,
  fetchNotifications,
  markNotificationRead,
} from "../utils/notificationsApi";

const timeAgo = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, { addSuffix: true });
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const token = useSelector((state) => state.auth.token);
  const storeId = useSelector((state) => state.auth.storeId?.id);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  // Unread count shown on the bell's badge
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const rootRef = useRef(null);

  const load = useCallback(
    async (event) => {
      if (!token) return;
      setLoading(true);
      try {
        const result = await fetchNotifications();
        setNotifications(result.notifications);
        setTotal(result.unreadCount);
        setFailed(false);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    load();
  }, [load, storeId]);

  // Toasts are skipped while the tab is hidden, so catch up on returning to it
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener(NOTIFICATIONS_CHANGED, load);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener(NOTIFICATIONS_CHANGED, load);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    const onMouseDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const toggle = () => {
    if (!open) load();
    setOpen(!open);
  };

  // Shown as read right away (kept in the list, without the blue dot); if the
  // API call fails, reloading brings the real state back
  const markRead = (id) => {
    const item = notifications.find((n) => n.id === id);
    if (!item || item.readAt) return;
    const readAt = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt } : n)),
    );
    setTotal((prev) => Math.max(prev - 1, 0));
    markNotificationRead(id).catch(load);
  };

  const openNotification = ({ id, orderNo }) => {
    markRead(id);

    if (orderNo) {
      setOpen(false);
      navigate("/dashboard", { state: { focusOrderNo: orderNo } });
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={toggle}
        className="relative p-2 hover:bg-gray-100 rounded-full transition"
        title="Notifications"
        aria-label={`Notifications (${total})`}
        aria-expanded={open}
      >
        <Bell size={20} className="text-gray-600" />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-semibold flex items-center justify-center">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[90vw] bg-white rounded-xl border border-gray-100 shadow-lg z-50">
          <div className="px-4 py-3 border-b border-gray-200 text-sm font-semibold text-gray-800">
            Notifications
          </div>
          {/* Fixed height; while loading, the list dims behind a centred spinner */}
          <div className="relative h-96" aria-busy={loading}>
            <div
              className={`h-full overflow-y-auto transition-opacity duration-200 ${
                loading ? "opacity-40 pointer-events-none select-none" : ""
              }`}
            >
            {!notifications.length ? (
              loading ? null : (
                <p
                  className={`h-full flex items-center justify-center px-4 text-center text-sm ${
                    failed ? "text-red-500" : "text-gray-500"
                  }`}
                >
                  {failed
                    ? "Couldn't load notifications."
                    : "No missed notifications."}
                </p>
              )
            ) : (
              notifications.map(
                ({ id, title, message, orderNo, createdAt, readAt }) => {
                  const unread = !readAt;
                  return (
                    <div
                      key={id}
                      className={`flex items-start gap-2 px-4 py-3 border-b border-gray-200 last:border-b-0 transition-colors ${
                        unread
                          ? "bg-blue-50 hover:bg-blue-100/70"
                          : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      {/* Blue dot = unread; an empty slot keeps rows aligned */}
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          unread ? "bg-blue-600" : "bg-transparent"
                        }`}
                        aria-hidden="true"
                      />
                      <button
                        type="button"
                        onClick={() => openNotification({ id, orderNo })}
                        className="flex-1 min-w-0 text-left"
                        aria-label={`${unread ? "Unread: " : ""}${title || orderNo || "Notification"}`}
                      >
                        <span
                          className={`block text-xs ${
                            unread
                              ? "font-bold text-gray-900"
                              : "font-medium text-gray-600"
                          }`}
                        >
                          {title || orderNo || "Notification"}
                        </span>
                        {message && (
                          <span
                            className={`block text-xs mt-0.5 ${
                              unread ? "text-gray-700" : "text-gray-500"
                            }`}
                          >
                            {message}
                          </span>
                        )}
                        {createdAt && (
                          <span className="block text-[11px] text-gray-400 mt-1">
                            {timeAgo(createdAt)}
                          </span>
                        )}
                      </button>
                      {unread && (
                        <button
                          type="button"
                          onClick={() => markRead(id)}
                          title="Mark as read"
                          className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-blue-700 hover:bg-blue-200/60 outline-none focus:ring-2 focus:ring-blue-300"
                        >
                          <Check size={12} />
                          Mark as read
                        </button>
                      )}
                    </div>
                  );
                },
              )
            )}
            </div>
            {loading && (
              <div
                role="status"
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm font-medium text-gray-700"
              >
                <Loader2 size={28} className="animate-spin text-blue-600" />
                Loading...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
