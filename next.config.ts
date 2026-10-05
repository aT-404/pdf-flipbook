import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Build a plain folder of web files ("out") that can be opened locally
  // or uploaded to any simple web host. No server needed.
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
