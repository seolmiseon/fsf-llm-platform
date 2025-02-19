import { NextResponse } from 'next/server';
import { auth } from 'firebase-admin';
import { adminDB } from '@/lib/firebase/admin';

export async function GET(request: Request) {
    try {
        // 인증 확인
        const token = request.headers.get('Authorization')?.split('Bearer ')[1];
        if (!token) {
            return NextResponse.json(
                { error: '토큰이 없습니다.' },
                { status: 401 }
            );
        }

        const decodedToken = await auth().verifyIdToken(token);
        if (!decodedToken) {
            return NextResponse.json(
                { error: '유효하지 않은 토큰입니다.' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = 10;

        if (!query?.trim()) {
            return NextResponse.json({
                results: [],
                pagination: {
                    currentPage: page,
                    hasMore: false,
                },
            });
        }

        const decodedQuery = decodeURIComponent(query).toLowerCase();

        const searchQuery = adminDB
            .collection('posts')
            .where('searchKeywords', 'array-contains', decodedQuery)
            .orderBy('createdAt', 'desc')
            .limit(limit + 1);

        if (page > 1) {
            const prevPageQuery = adminDB
                .collection('posts')
                .where('searchKeywords', 'array-contains', decodedQuery)
                .orderBy('createdAt', 'desc')
                .limit((page - 1) * limit);
            const prevPageDocs = await prevPageQuery.get();
            const lastDoc = prevPageDocs.docs[prevPageDocs.docs.length - 1];

            if (lastDoc) {
                searchQuery.startAfter(lastDoc);
            }
        }

        // 쿼리 실행
        const snapshot = await searchQuery.get();
        const hasMore = snapshot.docs.length > limit;

        const results = snapshot.docs.slice(0, limit).map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate().toISOString(),
        }));

        return NextResponse.json({
            results,
            pagination: {
                currentPage: page,
                hasMore,
                totalItems: results.length,
            },
        });
    } catch (error) {
        console.error('Search error:', error);
        if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json(
            { error: '검색 중 오류가 발생했습니다' },
            { status: 500 }
        );
    }
}
