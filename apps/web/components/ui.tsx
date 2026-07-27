import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { Nav } from "./nav";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variantClass: Record<Variant, string> = {
  primary: "btn btn-primary",
  secondary: "btn btn-secondary",
  ghost: "btn btn-ghost",
  danger: "btn btn-danger",
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

export function Alert({ children, tone = "danger" }: { children: ReactNode; tone?: "danger" | "success" }) {
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

export function Field({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
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
    <div className="app-shell">
      <Nav />
      <main className="app-main">
        <div className={containerClass}>{children}</div>
      </main>
    </div>
  );
}
