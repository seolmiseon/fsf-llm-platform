import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const path = searchParams.get('path');

        if (!path) {
            return NextResponse.json(
                { error: 'Path parameter is required' },
                { status: 400 }
            );
        }

        // 백엔드 URL
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://fsf-server-303660711261.asia-northeast3.run.app';
        
        // path 변환: /competitions → /api/football/competitions  
        const apiPath = path.startsWith('/') ? path.substring(1) : path;
        const fullUrl = `${backendUrl}/api/football/${apiPath}`;

        console.log('Proxying to backend:', fullUrl);

        const response = await fetch(fullUrl);
        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { error: data.error || 'Backend error' },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Proxy error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}