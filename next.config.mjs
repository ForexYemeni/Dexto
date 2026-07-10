/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
  // Disable sharp - it needs native bindings that fail on Vercel
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
