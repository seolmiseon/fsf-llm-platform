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

        // 백엔드 URL 결정: 프로덕션 빌드에서 localhost를 무시하고 production URL만 사용
        const productionBackendUrl = 'https://fsf-server-303660711261.asia-northeast3.run.app';
        const isProduction = process.env.NODE_ENV === 'production';
        
        let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
        
        // 환경변수가 없으면 production URL 사용
        if (!backendUrl) {
            backendUrl = productionBackendUrl;
        }
        // 프로덕션 빌드에서 localhost가 포함되어 있으면 무시하고 production URL 사용
        else if (isProduction && backendUrl.includes('localhost')) {
            console.warn('⚠️ 프로덕션 빌드에서 localhost가 감지되었습니다. Production URL을 사용합니다.');
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