import type { NextConfig } from "next";

const nextConfig: NextConfig = {  
    reactStrictMode: true,
    images: {
      domains: ['www.datocms-assets.com'],
    },
};

export default nextConfig;
