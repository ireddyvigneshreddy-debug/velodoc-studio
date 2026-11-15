/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  poweredByHeader: false,
  generateBuildId: async () => `velodoc-${Date.now()}`,
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        {
          key: "X-Application-Name",
          value: "VeloDoc-Studio",
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
      ],
    },
  ],
  webpack: (config, { webpack }) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      https: false,
      http: false,
      stream: false,
      zlib: false,
      crypto: false,
    };

    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
        resource.request = resource.request.replace(/^node:/, "");
      })
    );

    return config;
  },
};

export default nextConfig;
