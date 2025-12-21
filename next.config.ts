import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	reactStrictMode: true,
	experimental: {
		authInterrupts: true,
	},
	images: {
		unoptimized: true,
	},
};

export default nextConfig;
