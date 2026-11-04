import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright drives the real browser agent. Keep it external so the bundle
  // never inlines the browser binaries.
  serverExternalPackages: ["playwright", "playwright-core"],
};

export default nextConfig;
