/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma", "baileys"],
    instrumentationHook: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Never bundle baileys or sharp — they must run natively
      const externals = Array.isArray(config.externals) ? config.externals : [];
      config.externals = [...externals, "baileys", "sharp", "@hapi/boom", "pino"];
    } else {
      // Baileys is server-only — stub out Node built-ins on the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        os: false,
        child_process: false,
      };
    }
    return config;
  },
};

export default nextConfig;
