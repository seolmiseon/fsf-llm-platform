import type { Config } from 'tailwindcss';

const config: Config = {
    darkMode: ['class'],
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        container: {
            center: true,
            padding: '2rem',
            screens: {
                lg: '1024px',
                xl: '1280px',
                '2xl': '1536px',
            },
        },
        extend: {
            colors: {
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
            },
            fontFamily: {
                sans: ['var(--font-pretendard)'],
                pretendard: ['var(--font-pretendard)'],
            },
            fontWeight: {
                light: '300',
                normal: '400',
                medium: '500',
                bold: '700',
            },

            fontSize: {
                xs: ['0.75rem', { lineHeight: '1rem' }],
                sm: ['0.875rem', { lineHeight: '1.25rem' }],
                base: ['1rem', { lineHeight: '1.5rem' }],
                lg: ['1.125rem', { lineHeight: '1.75rem' }],
                xl: ['1.25rem', { lineHeight: '1.75rem' }],
                '2xl': ['1.5rem', { lineHeight: '2rem' }],
            },
            borderRadius: {
                lg: 'var(--border-radius)',
                md: 'calc(var(--border-radius) - 4px)',
                sm: 'calc(var(--border-radius) - 8px)',
            },
            spacing: {
                card: '1.25rem',
                section: '2rem',
            },
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' },
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' },
                },
                fadeIn: {
                    from: { opacity: `${0}` },
                    to: { opacity: `${1}` },
                },
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'fade-in': 'fadeIn 0.3s ease-in',
            },
        },
    },
    plugins: [require('tailwindcss-animate')],
};

export default config;
