/** @type {import("next").NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Google OAuth profile pictures
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      // Generic Google user content (other subdomains)
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
    ],
  },
};

export default nextConfig;
