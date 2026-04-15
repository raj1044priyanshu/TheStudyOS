import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

const distDir = process.env.NEXT_DIST_DIR?.trim();

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  distDir: distDir || ".next",
  webpack: (config, { dev }) => {
    if (dev && process.env.NEXT_DISABLE_WEBPACK_CACHE === "true") {
      // Keep this opt-in for debugging cache issues, because disabling cache makes local navigation slower.
      config.cache = false;
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com"
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com"
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com"
      }
    ]
  }
};

export default nextConfig;
