"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const primary = [
  { href: "/home", label: "Home", icon: "⌂" },
  { href: "/songs", label: "Search", icon: "⌕" },
];

const library = [
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

export function Nav() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
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
              className={`sidebar-link${isActive(pathname, link.href) && link.href === "/home" ? " is-active" : ""}`}
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
    </aside>
  );
}
