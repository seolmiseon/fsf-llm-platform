/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // async rewrites() {
    //     return [
    //         {
    //             source: '/api/:path*', // 클라이언트가 요청할 경로
    //             destination:
    //                 'https://api.football-data.org/v4/teams/{id}/matches/:path*', // 실제 API 주소로 변경
    //         },
    //     ];
    // },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'storage.googleapis.com',
                pathname: '/**',
            },
        ],
    },
};

export default nextConfig;
