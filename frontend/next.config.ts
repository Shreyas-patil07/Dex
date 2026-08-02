import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow external image sources — picsum for mock data, TMDB for production
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
    ],
  },
};

export default nextConfig;

