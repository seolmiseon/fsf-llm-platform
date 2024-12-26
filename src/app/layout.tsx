import './globals.css';
import localFont from 'next/font/local';
import { AuthProvider } from '@/components/client-components/providers/AuthProvider';
import { ModalRoot } from '@/components/ui/modal/ModalRoot';
import Navigation from '@/components/navigation/Navigation';

const pretendard = localFont({
    src: '../fonts/PretendardVariable.woff2',
    display: 'swap',
    weight: '100 900',
    variable: '--font-pretendard',
});

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${pretendard.variable} vsc-initialized`}>
                <AuthProvider>
                    <Navigation />
                    {children}
                    <ModalRoot />
                </AuthProvider>
            </body>
        </html>
    );
}
