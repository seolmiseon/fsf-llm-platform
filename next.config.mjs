/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: [
        '@fullcalendar/react',
        '@fullcalendar/daygrid',
        '@fullcalendar/interaction',
        '@fullcalendar/core',

        'firebase',
        'firebase/messaging',
        'firebase/app',

        'react-kakao-maps-sdk', // 카카오맵 사용중
        'react-youtube', // 유튜브 사용중
        'swiper', // 슬라이더 사용중

        '@radix-ui/react-dialog',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-navigation-menu',
        '@radix-ui/react-select',
        '@radix-ui/react-tabs',
        '@radix-ui/react-toast',
    ],
    webpack: (config) => {
        config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false,
        };
        return config;
    },
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

    poweredByHeader: false,
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production',
    },
    experimental: {
        optimizeCss: false,
    },
};

export default nextConfig;
