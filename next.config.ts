import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep pdf-parse and its canvas dependency out of the Turbopack bundle
  // so they load natively at runtime instead of being analyzed at build time.
  serverExternalPackages: ['pdf-parse', 'canvas'],
};

export default nextConfig;
