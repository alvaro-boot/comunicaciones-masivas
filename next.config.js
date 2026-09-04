/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingExcludes: {
    "*": [".env.local", ".env", ".env.*"],
  },
};

module.exports = nextConfig;
