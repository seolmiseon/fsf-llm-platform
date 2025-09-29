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

        'react-kakao-maps-sdk',
        'react-youtube',
        'swiper',

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
        domains: [
            'firebasestorage.googleapis.com',
            'dapi.kakao.com',
            'map.daumcdn.net',
        ],
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
