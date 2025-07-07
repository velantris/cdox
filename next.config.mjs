/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Add pdf-parse to externals on the server to prevent bundling issues
    if (isServer) {
      config.externals.push('pdf-parse');
    }

    // Configure fallbacks for browser environment
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        stream: false,
        util: false,
        zlib: false,
      };
    }
    
    return config;
  },
}

export default nextConfig
