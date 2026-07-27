"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { listAlbums, listArtists, listSongs } from "@/lib/api-client";

interface Item {
  id: string;
  label: string;
  sub: string;
  href: string;
  icon: string;
}

/** Global quick-jump: ⌘K / Ctrl-K (or "/") opens a search-and-navigate palette. */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable;
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "/" && !typing && !open) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape") {
        setOpen(false);
        setQ("");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 20);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open || !q.trim()) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      const needle = q.trim().toLowerCase();
      Promise.all([listSongs({ query: q }), listArtists({ query: q }), listAlbums({})])
        .then(([s, a, al]) => {
          if (cancelled) return;
          setItems([
            ...s.items.slice(0, 6).map((x) => ({
              id: x.id,
              label: x.title,
              sub: x.primaryArtist?.canonicalName ?? "Song",
              href: `/songs/${x.id}`,
              icon: "♪",
            })),
            ...a.items.slice(0, 4).map((x) => ({
              id: x.id,
              label: x.canonicalName,
              sub: "Artist",
              href: `/artists/${x.id}`,
              icon: "◈",
            })),
            ...al.items
              .filter((x) => x.title.toLowerCase().includes(needle))
              .slice(0, 4)
              .map((x) => ({
                id: x.id,
                label: x.title,
                sub: x.artist?.canonicalName ?? "Album",
                href: `/albums/${x.id}`,
                icon: "◍",
              })),
          ]);
          setActive(0);
        })
        .catch(() => undefined);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [open, q]);

  function go(item: Item) {
    setOpen(false);
    setQ("");
    router.push(item.href);
  }

  if (!open) return null;

  const visible = q.trim() ? items : [];

  return (
    <div
      className="cmdk-backdrop"
      onClick={() => {
        setOpen(false);
        setQ("");
      }}
    >
      <div className="cmdk" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="cmdk-input"
          placeholder="Jump to a song, artist, or album…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, visible.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && visible[active]) {
              e.preventDefault();
              go(visible[active]);
            }
          }}
        />
        <div className="cmdk-list">
          {visible.map((item, i) => (
            <button
              key={`${item.href}`}
              className={`cmdk-item${i === active ? " is-active" : ""}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(item)}
            >
              <span className="cmdk-icon">{item.icon}</span>
              <span className="cmdk-label">{item.label}</span>
              <span className="cmdk-sub">{item.sub}</span>
            </button>
          ))}
          {q.trim() && visible.length === 0 && <div className="cmdk-empty">No matches.</div>}
          {!q.trim() && <div className="cmdk-empty">Type to search your library.</div>}
        </div>
      </div>
    </div>
  );
}
