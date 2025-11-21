
const nextConfig = {
    output: 'export',   
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
            'oapi.map.naver.com',
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
