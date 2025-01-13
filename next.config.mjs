/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'storage.googleapis.com',
                pathname: '/**',
            },
        ],
        domains: ['firebasestorage.googleapis.com'],
        unoptimized: true,
    },

    // 프로덕션 빌드 최적화를 위한 추가 설정
    poweredByHeader: false,
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production',
    },
    experimental: {
        optimizeCss: false,
    },
};

export default nextConfig;
