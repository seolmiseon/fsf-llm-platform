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
        domains: ['firebasestorage.googleapis.com', 'dapi.kakao.com'],
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
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.kakao.com dapi.kakao.com",
                            "img-src 'self' * data: *.kakao.com dapi.kakao.com",
                            "style-src 'self' 'unsafe-inline'",
                            "frame-src 'self'",
                            "connect-src 'self' *.kakao.com dapi.kakao.com",
                            "worker-src 'self' blob:",
                            "child-src 'self' blob: *.kakao.com",
                        ].join('; '),
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
