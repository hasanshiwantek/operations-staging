import { useCallback, useEffect, useRef, useState } from "react";
import axiosInstance from "../Axios/axiosInstance";

const POLL_MS = 3000;

const fetchProgress = async (storeName) => {
  // silent: the progress response carries a message, which would toast every poll
  const res = await axiosInstance.get(`/${storeName}/sync/progress`, {
    silent: true,
  });
  // Idle has no data: { success, status: "idle", message }
  return res.data?.data || { status: res.data?.status || "idle" };
};

const isDone = (status) => status === "completed" || status === "cancelled";

// Polls the BigCommerce sync progress API while a sync runs.
// - begin(): call when this tab starts a sync; polling runs until end() is called
// - end(error?): call once the sync request settles; a last poll fills `result`
// - On mount (and store change) it checks once, so a sync started elsewhere
//   (another tab, a reload) is picked up and followed until it finishes
// progress: latest data while running, else null
// result:   final data once a followed sync stops ({ status: "failed" } on error),
//           kept until clearResult()
// onFinished runs when a sync started elsewhere stops running.
export default function useSyncProgress(storeName, onFinished) {
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const timerRef = useRef(null);
  // True while this tab's own sync request is pending: keep polling even if the
  // API still reports idle or the previous run's completed/cancelled state
  const ownSyncRef = useRef(false);
  const lastProgressRef = useRef(null);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  const stopPolling = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const finish = useCallback(
    (final) => {
      stopPolling();
      setProgress(null);
      setCancelling(false);
      setResult(final);
    },
    [stopPolling],
  );

  const updateProgress = (data) => {
    lastProgressRef.current = data;
    setProgress(data);
  };

  const poll = useCallback(async () => {
    if (!storeName) return;
    try {
      const data = await fetchProgress(storeName);
      if (data.status === "running") {
        updateProgress(data);
      } else if (!ownSyncRef.current && timerRef.current) {
        // Followed a sync started elsewhere; it has stopped
        finish(isDone(data.status) ? data : lastProgressRef.current);
        onFinishedRef.current?.(data);
      }
    } catch {
      // A failed poll is skipped; the next tick tries again
    }
  }, [storeName, finish]);

  const startPolling = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(poll, POLL_MS);
  }, [poll]);

  const begin = useCallback(() => {
    ownSyncRef.current = true;
    setCancelling(false);
    setResult(null);
    updateProgress({ status: "running", synced: 0, batches: 0 });
    startPolling();
  }, [startPolling]);

  const end = useCallback(
    async (error) => {
      ownSyncRef.current = false;
      stopPolling();
      const last = lastProgressRef.current;
      let final = null;
      try {
        final = await fetchProgress(storeName);
      } catch {
        // Fall back to the last progress seen
      }
      if (isDone(final?.status)) {
        finish(final);
      } else if (error) {
        finish({ ...last, status: "failed", message: String(error) });
      } else {
        finish({ ...last, ...final, status: "completed", message: "Sync completed" });
      }
    },
    [storeName, stopPolling, finish],
  );

  const cancel = useCallback(async () => {
    if (!storeName || cancelling) return;
    setCancelling(true);
    try {
      await axiosInstance.post(`/${storeName}/sync/cancel`, {});
    } catch {
      setCancelling(false);
    }
  }, [storeName, cancelling]);

  const clearResult = useCallback(() => setResult(null), []);

  // Pick up a sync that is already running for this store
  useEffect(() => {
    if (!storeName) return undefined;
    let ignore = false;
    fetchProgress(storeName)
      .then((data) => {
        if (ignore || data.status !== "running") return;
        updateProgress(data);
        startPolling();
      })
      .catch(() => {});
    return () => {
      ignore = true;
      ownSyncRef.current = false;
      lastProgressRef.current = null;
      stopPolling();
      setProgress(null);
      setResult(null);
      setCancelling(false);
    };
  }, [storeName, startPolling, stopPolling]);

  return { progress, result, cancelling, begin, end, cancel, clearResult };
}
