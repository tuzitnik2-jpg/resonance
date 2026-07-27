/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The /api/v1/* proxy lives in app/api/v1/[...path]/route.ts (a runtime handler), NOT here.
  // A next.config rewrite would bake API_INTERNAL_URL at build time, which broke on Render when
  // an env-var change restarted the service without rebuilding it.
};

module.exports = nextConfig;
