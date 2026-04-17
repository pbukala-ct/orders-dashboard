import type { NextConfig } from "next";

const VERCEL_MC_APP = "https://dashboard-alpha-tan-44.vercel.app";

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
          // Allow embedding in the Merchant Center custom app iframe.
          // CSP frame-ancestors takes precedence over X-Frame-Options in Chrome/Edge/Firefox.
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors 'self' ${VERCEL_MC_APP}`,
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
