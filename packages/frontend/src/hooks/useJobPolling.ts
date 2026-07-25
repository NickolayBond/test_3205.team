import { useEffect, useRef, useCallback } from "react";
import { jobsApi } from "../api/jobs";
import type { JobDetail } from "../types/job.types";

const POLLING_INTERVAL = parseInt(
  import.meta.env.VITE_POLLING_INTERVAL || "3000",
);

/* 
  Этот хук позволяет опрашивать API на предмет завершения джоба
*/
export const useJobPolling = (
  jobId: string | null,
  onUpdate: (data: JobDetail) => void,
  enabled: boolean = true,
) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isCompletedRef = useRef<boolean>(false);
  const currentJobIdRef = useRef<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!jobId || !enabled || isCompletedRef.current) return;

    try {
      const data = await jobsApi.getJobDetails(jobId);
      if (currentJobIdRef.current !== jobId) return;

      onUpdate(data);

      if (["completed", "cancelled", "failed"].includes(data.status)) {
        isCompletedRef.current = true;
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      }
    } catch (error) {
      console.error("Polling error:", error);
    }
  }, [jobId, onUpdate, enabled]);

  useEffect(() => {
    if (currentJobIdRef.current !== jobId) {
      isCompletedRef.current = false;
      currentJobIdRef.current = jobId;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!jobId || !enabled) return;

    fetchData();

    const startPolling = () => {
      if (isCompletedRef.current) return;

      timerRef.current = setTimeout(() => {
        fetchData();
        if (!isCompletedRef.current) {
          startPolling();
        }
      }, POLLING_INTERVAL);
    };

    startPolling();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [jobId, enabled, fetchData]);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    isCompletedRef.current = true;
  }, []);

  return { stopPolling };
};
