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

        // 백엔드 URL (NEXT_PUBLIC_BACKEND_URL 우선, 기존 변수는 폴백)
        // 프로덕션에서는 절대 localhost를 사용하지 않도록 강제
        const productionBackendUrl = 'https://fsf-server-303660711261.asia-northeast3.run.app';
        
        let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
        if (!backendUrl) {
            backendUrl = productionBackendUrl;
        } else if (backendUrl.includes('localhost')) {
            // localhost가 설정되어 있으면 Cloud Run URL로 강제 변경
            console.warn('⚠️ localhost URL이 감지되었습니다. Cloud Run URL로 변경합니다.');
            backendUrl = productionBackendUrl;
        }
        
        // path 변환: /standings → /api/football/standings  
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