"use client";

import { useEffect, useState } from "react";
import { getMe, type Me } from "./api-client";

/**
 * Returns the current user. Login is disabled — the API resolves the single archive account for
 * every request — so this always succeeds and never redirects.
 */
export function useCurrentUser(): { me: Me | null; loading: boolean } {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((result) => {
        if (!cancelled) setMe(result);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { me, loading };
}
