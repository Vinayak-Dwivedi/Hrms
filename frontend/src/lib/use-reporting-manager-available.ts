"use client";

import { useEffect, useState } from "react";
import { fetchCurrentManager } from "@/lib/hrms-client";

/** Whether the logged-in user has at least one direct report (reporting manager). */
export function useReportingManagerAvailable() {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await fetchCurrentManager();
        if (!cancelled) setAvailable(true);
      } catch {
        if (!cancelled) setAvailable(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { available, loading };
}
