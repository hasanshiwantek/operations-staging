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
  };
};

// Fired after a notification is marked read, so the bell can refresh
export const NOTIFICATIONS_CHANGED = "notifications:changed";

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
  return {
    notifications: rows.map(normalizeNotification),
    total: body?.meta?.total ?? body?.total ?? body?.data?.total ?? rows.length,
  };
};
