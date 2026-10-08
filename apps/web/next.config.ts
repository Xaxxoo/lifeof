import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Shared game rules and content are TypeScript source in workspace packages.
  // Lets teammates open the dev server via 127.0.0.1 or a LAN IP on their phone.
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*"],
  transpilePackages: ["@nyl/game-core", "@nyl/content"],
  turbopack: {
    root: path.join(__dirname, "../.."),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
