import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage (bucket thumbs) — host estável, resolve thumb_path
      {
        protocol: "https",
        hostname: "supabase.nickbargiela.com.br",
        pathname: "/storage/v1/object/public/**",
      },
      // YouTube thumbnails — uso futuro com next/image
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
