import { FieldValue, Timestamp } from 'firebase/firestore';

// 게시글 타입
export interface Post {
    id?: string;
    title: string;
    content: string;
    authorId: string;
    authorName: string | null;
    createdAt: Timestamp | FieldValue;
    updatedAt: Timestamp | FieldValue;
    likes: number;
    views: number;
    commentCount: number;
}

// 댓글 타입
export interface Comment {
    id?: string;
    postId: string;
    content: string;
    authorId: string;
    authorName: string | null;
    createdAt: Timestamp | FieldValue;
    updatedAt: Timestamp | FieldValue;
    likes: number;
}

// Firebase 쿼리 응답 타입
export interface FirebaseResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
