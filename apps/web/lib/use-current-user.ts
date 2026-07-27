"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, getMe, type Me } from "./api-client";

/** Redirects to /login if the session is missing/expired; otherwise returns the current user. */
export function useCurrentUser(): { me: Me | null; loading: boolean } {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((result) => {
        if (!cancelled) setMe(result);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.problem.status === 401) {
          router.replace("/login");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return { me, loading };
}
