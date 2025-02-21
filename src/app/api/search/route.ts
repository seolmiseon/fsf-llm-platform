import { NextResponse } from 'next/server';
import { auth } from 'firebase-admin';
import { SearchResponse } from '@/types/ui/search';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Admin 초기화 (파일 최상단에 한 번만)
// if (!admin.apps.length) {
// admin.initializeApp({
// credential: admin.credential.cert({
// 여기에 서비스 계정 정보
//         })
//     });
// }

export async function GET(request: Request) {
    try {
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
                pagination: { currentPage: page, hasMore: false },
            });
        }

        const decodedQuery = decodeURIComponent(query).toLowerCase();
        const db = getFirestore();

        // 페이지네이션 적용
        const offset = (page - 1) * limit;

        const searchQuery = db
            .collection('posts')
            .where('searchKeywords', 'array-contains', decodedQuery)
            .orderBy('createdAt', 'desc')
            .limit(limit + 1); // 다음 페이지 존재 여부 확인용

        if (offset > 0) {
            // 이전 페이지의 마지막 문서 가져오기
            const prevPageQuery = db
                .collection('posts')
                .where('searchKeywords', 'array-contains', decodedQuery)
                .orderBy('createdAt', 'desc')
                .limit(offset);

            const prevPageDocs = await prevPageQuery.get();
            const lastDoc = prevPageDocs.docs[prevPageDocs.docs.length - 1];

            if (lastDoc) {
                searchQuery.startAfter(lastDoc);
            }
        }

        const snapshot = await searchQuery.get();
        const hasMore = snapshot.docs.length > limit;

        const results = snapshot.docs.slice(0, limit).map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title,
                content: data.content,
                authorId: data.authorId,
                authorName: data.authorName,
                commentCount: data.commentCount,
                createdAt: data.createdAt?.toDate().toISOString(),
                like: data.like,
                views: data.views,
                updateAt: data.updateAt?.toDate().toISOString(),
            };
        });

        return NextResponse.json({
            results,
            pagination: {
                currentPage: page,
                hasMore,
            },
        } as SearchResponse);
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
