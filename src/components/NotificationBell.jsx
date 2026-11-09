import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
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
        setTotal(result.total);
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

  const openNotification = ({ id, orderNo }) => {
    // Removed right away; if the API call fails, reloading brings it back
    setNotifications((prev) => prev.filter((item) => item.id !== id));
    setTotal((prev) => Math.max(prev - 1, 0));
    markNotificationRead(id).catch(load);

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
          <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-800">
            Notifications
          </div>
          <div className="max-h-96 overflow-y-auto">
            {failed && !notifications.length ? (
              <p className="px-4 py-6 text-center text-sm text-red-500">
                Couldn't load notifications.
              </p>
            ) : loading && !notifications.length ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">
                Loading...
              </p>
            ) : !notifications.length ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">
                No missed notifications.
              </p>
            ) : (
              notifications.map(
                ({ id, title, message, orderNo, createdAt }) => (
                  <button
                    key={id}
                    onClick={() => openNotification({ id, orderNo })}
                    className="block w-full text-left px-4 py-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50"
                  >
                    <span className="block text-xs font-semibold text-gray-800">
                      {title || orderNo || "Notification"}
                    </span>
                    {message && (
                      <span className="block text-xs text-gray-600 mt-0.5">
                        {message}
                      </span>
                    )}
                    {createdAt && (
                      <span className="block text-[11px] text-gray-400 mt-1">
                        {timeAgo(createdAt)}
                      </span>
                    )}
                  </button>
                ),
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
