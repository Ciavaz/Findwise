/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'assets.mmsrg.com',
                pathname: '**',
            }
        ],
    }
};

export default nextConfig;
