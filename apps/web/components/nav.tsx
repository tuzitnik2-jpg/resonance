"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-current-user";

const links = [
  { href: "/songs", label: "Songs", icon: "♪" },
  { href: "/artists", label: "Artists", icon: "◈" },
  { href: "/albums", label: "Albums", icon: "◍" },
  { href: "/tags", label: "Tags", icon: "◉" },
  { href: "/playlists", label: "Playlists", icon: "☰" },
  { href: "/festivals", label: "Festivals", icon: "✺" },
  { href: "/inbox", label: "AI Inbox", icon: "✦" },
  { href: "/stats", label: "Stats", icon: "▤" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const { me } = useCurrentUser();

  async function handleLogout() {
    await logout().catch(() => undefined);
    router.replace("/login");
  }

  return (
    <aside className="sidebar">
      <Link href="/songs" className="sidebar-brand">
        <span className="sidebar-brand-mark">R</span>
        Resonance
      </Link>
      <nav className="sidebar-links">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname?.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`sidebar-link${isActive ? " is-active" : ""}`}
            >
              <span className="sidebar-icon">{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        {me && <div className="sidebar-user">{me.email}</div>}
        <button onClick={handleLogout} className="btn btn-ghost btn-sm btn-block">
          Log out
        </button>
      </div>
    </aside>
  );
}
