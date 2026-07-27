"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api-client";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    getMe()
      .then(() => router.replace("/home"))
      .catch(() => router.replace("/login"));
  }, [router]);

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div
          style={{ display: "flex", alignItems: "center", gap: "0.7rem", marginBottom: "0.35rem" }}
        >
          <span className="sidebar-brand-mark" style={{ width: 36, height: 36, fontSize: "1rem" }}>
            R
          </span>
          <h1 style={{ fontSize: "1.4rem", margin: 0 }}>Resonance</h1>
        </div>
        <p className="text-muted" style={{ margin: 0, fontSize: "0.88rem" }}>
          Osobní hudební archiv a inteligentní průvodce moderní hudbou.
        </p>
      </div>
    </div>
  );
}
