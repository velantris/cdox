import lingoCompiler from "lingo.dev/compiler";


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

  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
      {
        source: '/ingest/decide',
        destination: 'https://us.i.posthog.com/decide',
      },
    ];
  },

  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

// export default lingoCompiler.next({
//   sourceLocale: "en",
//   targetLocales: ["es", "fr", "de", "it"],
//   models: "lingo.dev", // Option 1: Lingo.dev Engine
//   models: {
//     // "*:*": "openai:gpt-4o-mini",
//     "*:*": "groq:mistral-saba-24b", // Option 2: GROQ
//     // "*:*": "google:gemini-2.0-flash", // Option 2: Google AI
//   //   "*:*": "openrouter:mistralai/mistral-small-24b-instruct-2501", // Option 2: OpenRouter
//   //   "*:*": "ollama:mistral-small3.1", // Option 2: Ollama
//   //   "*:*": "mistral:mistral-small-latest", // Mistral
//   },
// })(nextConfig)

export default nextConfig