import Echo from "laravel-echo";
import Pusher from "pusher-js";

const PUSHER_KEY = import.meta.env.VITE_PUSHER_APP_KEY;
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_APP_CLUSTER;
const AUTH_ENDPOINT = import.meta.env.VITE_PUSHER_AUTH_ENDPOINT;

/**
 * Builds an Echo client that authorizes private channels with the given
 * Sanctum/JWT token. Returns null when Pusher isn't configured, so a missing
 * env var disables notifications instead of crashing the app.
 */
export const createEcho = (token) => {
  if (!PUSHER_KEY || !PUSHER_CLUSTER) {
    console.warn(
      "Realtime notifications are disabled: set VITE_PUSHER_APP_KEY and VITE_PUSHER_APP_CLUSTER.",
    );
    return null;
  }

  return new Echo({
    broadcaster: "pusher",
    Pusher,
    key: PUSHER_KEY,
    cluster: PUSHER_CLUSTER,
    forceTLS: true,
    authEndpoint: AUTH_ENDPOINT,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  });
};
