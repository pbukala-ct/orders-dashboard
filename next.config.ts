import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent webpack from bundling packages that rely on native Node.js modules.
  // @google-cloud/bigquery (and its auth dependencies) use crypto/fs internals
  // that break when bundled — they must be required at runtime by Node directly.
  serverExternalPackages: [
    "@google-cloud/bigquery",
    "google-auth-library",
    "@google-cloud/common",
  ],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Allow embedding from any origin — internal tool, no public exposure risk.
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors *",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
