"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-current-user";

export function TopBar() {
  const router = useRouter();
  const { me } = useCurrentUser();

  async function handleLogout() {
    await logout().catch(() => undefined);
    router.replace("/login");
  }

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
        <button onClick={handleLogout} className="btn btn-secondary btn-sm">
          Log out
        </button>
        <span className="avatar" title={me?.email ?? undefined}>
          {initial}
        </span>
      </div>
    </header>
  );
}
