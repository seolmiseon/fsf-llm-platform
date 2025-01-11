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
    },

    // 프로덕션 빌드 최적화를 위한 추가 설정
    poweredByHeader: false, // 보안을 위해 X-Powered-By 헤더 제거
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production', // 프로덕션에서 console.log 제거
    },
    experimental: {
        optimizeCss: true, // CSS 최적화
    },
};

export default nextConfig;
