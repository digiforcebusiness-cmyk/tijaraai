/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],

  webpack: (config, { isServer }) => {
    if (isServer) {
      const existingExternals = Array.isArray(config.externals)
        ? config.externals
        : [config.externals].filter(Boolean);

      config.externals = [
        ...existingExternals,
        "sharp",
        // "module X" tells webpack to emit  import("X")  in the bundle
        // instead of  require("X").  ESM-only packages MUST use this form
        // because require() of an ES module throws ERR_REQUIRE_ESM.
        // import() is valid inside any Node.js async function, including CJS.
        {
          "baileys": "module baileys",
          "@hapi/boom": "module @hapi/boom",
        },
      ];
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
