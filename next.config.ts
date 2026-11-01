import type { NextConfig } from "next";
import { securityHeaders } from "./src/core/security-headers";

// Every page is per-family and request-time (cookies, device tokens), so the
// classic dynamic rendering model fits better than Cache Components here.
const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: "/(.*)",
      headers: securityHeaders({ dev: process.env.NODE_ENV !== "production", supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL }),
    }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
