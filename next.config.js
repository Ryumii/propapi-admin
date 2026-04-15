/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/propapi-admin",
  assetPrefix: "/propapi-admin",
  reactStrictMode: true,
  images: { unoptimized: true },
};

module.exports = nextConfig;
