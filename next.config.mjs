/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
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
