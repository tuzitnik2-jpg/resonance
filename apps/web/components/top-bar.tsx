"use client";

import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/use-current-user";

export function TopBar() {
  const router = useRouter();
  const { me } = useCurrentUser();

  const initial = me?.email?.[0]?.toUpperCase() ?? "R";

  return (
    <header className="topbar">
      <div className="topbar-nav">
        <button
          className="topbar-round"
          onClick={() => router.back()}
          title="Back"
          aria-label="Go back"
        >
          ‹
        </button>
        <button
          className="topbar-round"
          onClick={() => router.forward()}
          title="Forward"
          aria-label="Go forward"
        >
          ›
        </button>
      </div>
      <div className="topbar-right">
        <span className="avatar" title={me?.email ?? undefined}>
          {initial}
        </span>
      </div>
    </header>
  );
}
