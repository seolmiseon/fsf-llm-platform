import './globals.css';
import localFont from 'next/font/local';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ErrorBoundary } from '@/components/providers/ErrorBoundary';
import { ModalRoot } from '@/components/ui/modal/ModalRoot';
import Navigation from '@/components/navigation/Navigation';
import type { Metadata } from 'next';
// import Script from 'next/script';

const pretendard = localFont({
    src: '../fonts/PretendardVariable.woff2',
    display: 'swap',
    weight: '100 900',
    variable: '--font-pretendard',
});

export const metadata: Metadata = {
    title: 'Full of Soccer Fun',
    description:
        'Your Gateway to Football Joy - Live scores, stats, and news for football fans',
    keywords:
        'soccer, football, live scores, stats, premier league, la liga, bundesliga',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${pretendard.variable} vsc-initialized`}>
                {/* <Script
                    type="text/javascript"
                    src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY}&libraries=services`}
                    strategy="beforeInteractive"
                /> */}
                <ErrorBoundary>
                    <ThemeProvider>
                        <AuthProvider>
                            <Navigation />
                            <main>{children}</main>
                            <ModalRoot />
                        </AuthProvider>
                    </ThemeProvider>
                </ErrorBoundary>
            </body>
        </html>
    );
}
