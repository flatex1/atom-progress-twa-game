import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://telegram.org https://*.telegram.org; connect-src 'self' https://*.convex.dev wss://*.convex.dev; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
