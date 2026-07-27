/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Proxy /api/v1/* to the actual API server-side, so the browser only ever talks to this
  // app's own origin. This keeps the session cookie same-site even when accessed through a
  // forwarded dev URL (e.g. GitHub Codespaces), where each forwarded port lives on its own
  // subdomain and is treated as a distinct "site" for cookie purposes.
  async rewrites() {
    const raw = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
    // Render's fromService injects a bare host (no scheme); prepend https:// when one is missing.
    const apiInternalUrl = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
    return [{ source: "/api/v1/:path*", destination: `${apiInternalUrl}/api/v1/:path*` }];
  },
};

module.exports = nextConfig;
