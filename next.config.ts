import type { NextConfig } from "next";

// Every page is per-family and request-time (cookies, device tokens), so the
// classic dynamic rendering model fits better than Cache Components here.
const nextConfig: NextConfig = {
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
