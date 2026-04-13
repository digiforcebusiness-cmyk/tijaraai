/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prisma must be external (native bindings).
  // Baileys must NOT be here — it's ESM-only and external = require() which breaks ESM.
  serverExternalPackages: ["@prisma/client", "prisma"],

  webpack: (config, { isServer }) => {
    if (isServer) {
      const existingExternals = Array.isArray(config.externals)
        ? config.externals
        : [config.externals].filter(Boolean);

      // sharp stays external (native binary).
      // baileys, @hapi/boom, pino are ESM — do NOT externalize them,
      // let webpack bundle them so dynamic import() works correctly.
      config.externals = [...existingExternals, "sharp"];
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

    // Allow webpack to process ESM packages (baileys and its deps use .mjs / "type":"module")
    config.module.rules.push({
      test: /\.m?js$/,
      type: "javascript/auto",
      resolve: { fullySpecified: false },
    });

    return config;
  },
};

export default nextConfig;
