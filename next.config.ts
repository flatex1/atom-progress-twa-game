import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Изменено на false для избежания двойных вызовов useEffect в режиме разработки
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://telegram.org https://*.telegram.org; connect-src 'self' https://*.convex.dev wss://*.convex.dev https://*.convex.cloud wss://*.convex.cloud https://*.ngrok-free.app wss://*.ngrok-free.app; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;"
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
