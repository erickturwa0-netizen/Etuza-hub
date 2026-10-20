import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "images.igdb.com" },
      { protocol: "https", hostname: "logo.clearbit.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "archive.org" },
      { protocol: "https", hostname: "i.imgur.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              // ElitePlex + HLS proxy + external APIs
              "connect-src 'self' https: blob: wss:",
              // Native video / HLS
              "media-src 'self' https: blob:",
              // Allow embed players (vidsrc, videasy, 2embed, etc.) + social
              "frame-src 'self' https: blob:",
              "child-src 'self' https: blob:",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
