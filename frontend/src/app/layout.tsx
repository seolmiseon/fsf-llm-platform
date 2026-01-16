import './globals.css';
import localFont from 'next/font/local';
import { ErrorBoundary } from '@/components/providers/ErrorBoundary';
import { ModalRoot } from '@/components/ui/modal/ModalRoot';
import Navigation from '@/components/navigation/Navigation';
import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { Toaster } from '@/components/ui/toast/Toaster';
import FloatingChatBot from '@/components/chat/FloatingChatBot';
import { AmplitudeProvider } from '@/components/providers/AmplitudeProvider';


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
                <ErrorBoundary>
                    <AmplitudeProvider>
                        <ThemeProvider>
                            <AuthProvider>
                                <Navigation />
                                <main>{children}</main>
                                <ModalRoot />
                                <Toaster />
                                <FloatingChatBot />
                            </AuthProvider>
                        </ThemeProvider>
                    </AmplitudeProvider>
                </ErrorBoundary>
            </body>
        </html>
    );
}