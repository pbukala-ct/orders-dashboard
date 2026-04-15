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
};

export default nextConfig;
