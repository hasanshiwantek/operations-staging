import axiosInstance from "../Axios/axiosInstance";

// Laravel database notifications keep their content under `data`; broadcast
// style rows have it at the top level
const normalizeNotification = (row) => {
  const content = row?.data && typeof row.data === "object" ? row.data : row;
  return {
    id: row?.id,
    title: content?.title || null,
    message: content?.message || null,
    orderNo: content?.order_no || null,
    createdAt: row?.created_at || content?.created_at || null,
    // Laravel sets read_at once read; null / missing = unread
    readAt: row?.read_at || null,
  };
};

// Fired whenever the notification list may have changed (one marked read, a
// live notification arrived, an RMA was created), so the bell reloads it
export const NOTIFICATIONS_CHANGED = "notifications:changed";

// Asks the bell to reload its list and unread count now; with
// alsoAfterMs, once more after that delay, for notifications the backend
// creates a moment later (e.g. from a queued job)
export const refreshNotifications = ({ alsoAfterMs } = {}) => {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
  if (alsoAfterMs) {
    setTimeout(
      () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED)),
      alsoAfterMs,
    );
  }
};

export const markNotificationRead = async (id) => {
  await axiosInstance.post(`/notifications/${id}/read`, null, { silent: true });
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
};

// The user's missed notifications. Handles a plain array, { data: [...] } or a
// Laravel paginator; total counts every page when the API reports it.
export const fetchNotifications = async () => {
  const { data: body } = await axiosInstance.get("/notifications", {
    silent: true,
  });
  const rows = Array.isArray(body)
    ? body
    : Array.isArray(body?.data)
      ? body.data
      : Array.isArray(body?.data?.data)
        ? body.data.data
        : [];
  const notifications = rows.map(normalizeNotification);
  const total =
    body?.meta?.total ?? body?.total ?? body?.data?.total ?? rows.length;
  return {
    notifications,
    // The bell's badge: the API's unread count when it sends one; otherwise
    // every row when none is read yet, else the unread rows on this page
    unreadCount:
      body?.unread_count ??
      body?.meta?.unread_count ??
      (notifications.every((n) => !n.readAt)
        ? total
        : notifications.filter((n) => !n.readAt).length),
  };
};
