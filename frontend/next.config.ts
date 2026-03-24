import type { NextConfig } from "next";
import { getPublicApiBaseUrl } from "./src/lib/root-env";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL: getPublicApiBaseUrl(),
  },
};

export default nextConfig;
