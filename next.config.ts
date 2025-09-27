import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_APP_DOMAIN: process.env.NEXT_PUBLIC_APP_DOMAIN,
  },
};

export default nextConfig;
