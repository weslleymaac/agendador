import type { NextConfig } from "next";
import { getPublicApiBaseUrl } from "./src/lib/root-env";
import path from "path";

function apiInternalUrl(): string {
  const u = process.env.API_INTERNAL_URL?.trim();
  if (u) return u.replace(/\/$/, "");
  return "http://127.0.0.1:3000";
}

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: path.join(__dirname),
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL: getPublicApiBaseUrl(),
  },
  async rewrites() {
    const internal = apiInternalUrl();
    return [
      { source: "/agendamentos", destination: `${internal}/agendamentos` },
      { source: "/agendamentos/:path*", destination: `${internal}/agendamentos/:path*` },
    ];
  },
};

export default nextConfig;
