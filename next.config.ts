import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright drives the real browser agent. Keep it external so the bundle
  // never inlines the browser binaries.
  serverExternalPackages: ["playwright", "playwright-core"],
  outputFileTracingIncludes: {
    "/api/pdf": ["./public/fonts/**"],
  },
};

export default nextConfig;
