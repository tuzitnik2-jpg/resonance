import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { Nav } from "./nav";
import { TopBar } from "./top-bar";
import { NowSpinning } from "./now-spinning";
import { PlayerProvider } from "./player-provider";
import { CommandPalette } from "./command-palette";
import { ImageTile, type EntityImageRef } from "./image-tile";
import { PlayFab } from "./play-button";
import type { PlayerTrack } from "./player-provider";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variantClass: Record<Variant, string> = {
  primary: "btn btn-primary",
  secondary: "btn btn-secondary",
  ghost: "btn btn-ghost",
  danger: "btn btn-danger",
};

export type Tone = "green" | "gold" | "red" | "mixed";

const toneTile: Record<Tone, string> = {
  green: "tile-green",
  gold: "tile-gold",
  red: "tile-red",
  mixed: "tile-mixed",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "sm";
}

export function Button({ variant = "secondary", size = "md", className, ...rest }: ButtonProps) {
  const classes = [variantClass[variant], size === "sm" ? "btn-sm" : "", className]
    .filter(Boolean)
    .join(" ");
  return <button className={classes} {...rest} />;
}

interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: Variant;
  size?: "md" | "sm";
}

export function LinkButton({
  href,
  variant = "secondary",
  size = "md",
  className,
  children,
  ...rest
}: LinkButtonProps) {
  const classes = [variantClass[variant], size === "sm" ? "btn-sm" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <Link href={href} className={classes} {...rest}>
      {children}
    </Link>
  );
}

export function Card({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
}) {
  return (
    <div className={["card", className].filter(Boolean).join(" ")}>
      {title && <h2 className="card-title">{title}</h2>}
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="empty-state">{children}</p>;
}

export function Alert({
  children,
  tone = "danger",
}: {
  children: ReactNode;
  tone?: "danger" | "success" | "warning";
}) {
  return <p className={`alert alert-${tone}`}>{children}</p>;
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "danger" | "warning" | "primary";
}) {
  const cls = tone === "primary" ? "badge" : `badge badge-${tone}`;
  return <span className={cls}>{children}</span>;
}

export function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export function Loading() {
  return <p className="skeleton-text">Loading…</p>;
}

/* ---------------- Spotify content primitives ---------------- */

/** A Spotify-style content tile: gradient art + title + subtitle, with a hover play button. */
export function MediaCard({
  href,
  title,
  subtitle,
  icon,
  tone = "green",
  round = false,
  image,
  track,
}: {
  href: string;
  title: ReactNode;
  subtitle?: ReactNode;
  icon: ReactNode;
  tone?: Tone;
  round?: boolean;
  image?: EntityImageRef;
  track?: PlayerTrack;
}) {
  return (
    <Link href={href} className="media-card">
      <ImageTile
        image={image}
        className={`media-art ${toneTile[tone]}${round ? " media-art--round" : ""}`}
        icon={icon}
      />
      <div className="media-title">{title}</div>
      {subtitle !== undefined && <div className="media-sub">{subtitle}</div>}
      {track && <PlayFab track={track} />}
    </Link>
  );
}

export function MediaGrid({ children }: { children: ReactNode }) {
  return <div className="media-grid">{children}</div>;
}

/** A titled row of content, with an optional "show all" link. */
export function Shelf({
  title,
  moreHref,
  moreLabel = "Show all",
  children,
}: {
  title: ReactNode;
  moreHref?: string;
  moreLabel?: string;
  children: ReactNode;
}) {
  return (
    <section className="shelf">
      <div className="shelf-head">
        <h2 className="shelf-title">{title}</h2>
        {moreHref && (
          <Link href={moreHref} className="shelf-more">
            {moreLabel}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/** A gradient hero header for detail pages. */
export function Hero({
  tone = "green",
  icon,
  eyebrow,
  title,
  meta,
  round = false,
  actions,
  image,
}: {
  tone?: "green" | "gold" | "red";
  icon: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  round?: boolean;
  actions?: ReactNode;
  image?: EntityImageRef;
}) {
  return (
    <>
      <div className={`hero hero--${tone}`}>
        <ImageTile
          image={image}
          className={`hero-art ${toneTile[tone]}${round ? " hero-art--round" : ""}`}
          icon={icon}
        />
        <div className="hero-body">
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h1 className="hero-title">{title}</h1>
          {meta && <div className="hero-meta">{meta}</div>}
        </div>
      </div>
      {actions && (
        <div className="page-actions" style={{ marginBottom: "1.5rem" }}>
          {actions}
        </div>
      )}
    </>
  );
}

/** The three-region Spotify shell: sidebar · (top bar + scroll) · now-spinning bar. */
export function AppShell({
  children,
  width = "default",
}: {
  children: ReactNode;
  width?: "default" | "wide" | "narrow";
}) {
  const containerClass =
    width === "wide"
      ? "app-container app-container--wide"
      : width === "narrow"
        ? "app-container app-container--narrow"
        : "app-container";
  return (
    <PlayerProvider>
      <div className="app-shell">
        <Nav />
        <main className="main-view">
          <TopBar />
          <div className={containerClass}>{children}</div>
        </main>
        <NowSpinning />
      </div>
      <CommandPalette />
    </PlayerProvider>
  );
}
