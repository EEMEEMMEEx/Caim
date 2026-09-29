import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@base-ui/react",
      "clsx",
      "tailwind-merge",
    ],
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
          { key: "Surrogate-Control", value: "no-store" },
          { key: "X-Accel-Buffering", value: "no" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/login",
        destination: "/",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/claims",
        destination: "/tickets",
      },
      {
        source: "/claims/:path*",
        destination: "/tickets/:path*",
      },
    ];
  },
};

export default nextConfig;
