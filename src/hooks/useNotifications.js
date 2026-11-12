import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { createEcho } from "../utils/echo";
import {
  markNotificationRead,
  refreshNotifications,
} from "../utils/notificationsApi";

const TOAST_LEVELS = ["info", "success", "warning", "error"];

const showNotificationToast = (notification, onOpenOrder) => {
  // The socket stays open in background tabs, so hidden tabs must drop these.
  if (document.visibilityState !== "visible") return;
  console.log({
    notification,
    onOpenOrder,
  });
  const { id, title, message, level, order_no: orderNo } = notification;
  const body = message || title || "You have a new notification";
  const content = title && message ? `${title}: ${message}` : body;

  // Laravel reserves `type` for the notification class name, so the toast
  // style comes from a custom `level` field in toBroadcast().
  const showToast = TOAST_LEVELS.includes(level) ? toast[level] : toast.info;

  showToast(content, {
    toastId: id,
    autoClose: 6000,
    style: {
      fontSize: "12px",
      fontWeight: "bold",
      cursor: orderNo ? "pointer" : undefined,
    },
    onClick: orderNo
      ? () => {
          // The bell still lists it if this fails, so nothing is lost
          markNotificationRead(id).catch(() => {});
          onOpenOrder(orderNo);
        }
      : undefined,
  });
};

/**
 * Shows Laravel broadcast notifications as toasts for the logged-in user.
 * The connection follows the session: it opens on login and closes on logout.
 */
const useNotifications = () => {
  const token = useSelector((state) => state.auth.token);
  const userId = useSelector((state) => state.auth.user?.id);
  // navigate changes on every route change; that must not reopen the socket
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    if (!token || !userId) return undefined;

    const echo = createEcho(token);
    if (!echo) return undefined;

    const channelName = `App.Models.User.${userId}`;

    echo
      .private(channelName)
      .notification((notification) => {
        // Update the bell's count right away, without opening it
        refreshNotifications();
        showNotificationToast(notification, (focusOrderNo) =>
          navigateRef.current("/dashboard", { state: { focusOrderNo } }),
        );
      })
      .error((error) => {
        console.error(`Could not subscribe to ${channelName}`, error);
      });

    return () => {
      echo.leave(channelName);
      echo.disconnect();
    };
  }, [token, userId]);
};

export default useNotifications;
