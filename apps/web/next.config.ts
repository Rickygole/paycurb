import type { NextConfig } from "next";

const proxyUrl = process.env.PROXY_URL || "http://localhost:4000";
const agentUrl = process.env.AGENT_URL || "http://localhost:4100";

const nextConfig: NextConfig = {
  transpilePackages: ["@paycurb/engine", "@paycurb/shared"],
  compress: false,
  agentRules: false,
  devIndicators: false,
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${proxyUrl}/api/:path*` },
      { source: "/agent/:path*", destination: `${agentUrl}/:path*` },
    ];
  },
};

export default nextConfig;
