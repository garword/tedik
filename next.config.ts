import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: false,
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Hindari MIME sniffing — sinyal keamanan Google
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Cegah clickjacking
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Kontrol referrer info
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Batasi fitur browser berbahaya
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // Cache agresif untuk aset statis (gambar, JS, CSS)
        source: '/uploads/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
