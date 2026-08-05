"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-current-user";

const primary = [
  { href: "/home", label: "Home", icon: "⌂" },
  { href: "/search", label: "Search", icon: "⌕" },
  { href: "/browse", label: "Browse", icon: "▦" },
  { href: "/assistant", label: "Assistant", icon: "✧" },
];

const library = [
  { href: "/liked", label: "Liked Songs", icon: "♥" },
  { href: "/songs", label: "Songs", icon: "♪" },
  { href: "/artists", label: "Artists", icon: "◈" },
  { href: "/albums", label: "Albums", icon: "◍" },
  { href: "/playlists", label: "Playlists", icon: "☰" },
  { href: "/festivals", label: "Festivals", icon: "✺" },
  { href: "/tags", label: "Tags", icon: "◉" },
  { href: "/inbox", label: "AI Inbox", icon: "✦" },
  { href: "/stats", label: "Stats", icon: "▤" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The nav link groups, shared by the desktop sidebar and the mobile drawer. */
function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <>
      <div className="sidebar-block sidebar-block--nav">
        <Link href="/home" className="sidebar-brand">
          <span className="sidebar-brand-mark">R</span>
          Resonance
        </Link>
        <nav className="sidebar-links">
          {primary.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`sidebar-link${isActive(pathname, link.href) ? " is-active" : ""}`}
            >
              <span className="sidebar-icon">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="sidebar-block sidebar-library">
        <div className="sidebar-library-head">
          <span>Your Library</span>
          <Link
            href="/songs/new"
            className="topbar-round"
            title="Add a song"
            aria-label="Add a song"
          >
            +
          </Link>
        </div>
        <nav className="sidebar-links">
          {library.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`sidebar-link${isActive(pathname, link.href) ? " is-active" : ""}`}
            >
              <span className="sidebar-icon">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { me } = useCurrentUser();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await logout().catch(() => undefined);
    router.replace("/login");
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <NavLinks pathname={pathname} />
      </aside>

      {/* Mobile top bar */}
      <header className="mobile-bar">
        <button
          className="mobile-bar-btn"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          ☰
        </button>
        <Link href="/home" className="mobile-bar-brand">
          <span className="sidebar-brand-mark">R</span>
          Resonance
        </Link>
        <Link href="/songs/new" className="mobile-bar-btn" aria-label="Add a song">
          +
        </Link>
      </header>

      {/* Mobile slide-in drawer */}
      <div
        className={`nav-drawer-backdrop${open ? " is-open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <aside
        className={`nav-drawer${open ? " is-open" : ""}`}
        onClick={(e) => {
          // Close after tapping any link inside the drawer.
          if ((e.target as HTMLElement).closest("a")) setOpen(false);
        }}
      >
        <NavLinks pathname={pathname} />
        <div className="sidebar-block sidebar-footer">
          {me && <div className="sidebar-user">{me.email}</div>}
          <button onClick={handleLogout} className="btn btn-secondary btn-sm btn-block">
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
