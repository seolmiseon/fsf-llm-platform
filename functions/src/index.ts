import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import next from 'next';
import {
    onDocumentCreated,
    onDocumentUpdated,
} from 'firebase-functions/v2/firestore';
import {
    FirestoreEvent,
    QueryDocumentSnapshot,
    Change,
} from 'firebase-functions/v2/firestore';
import { generateSearchKeywords } from './utils/search';

// Firebase 초기화
admin.initializeApp();

const dev = process.env.NODE_ENV !== 'production';
const app = next({
    dev,
    conf: {
        distDir: '../.next',
    },
});

const handle = app.getRequestHandler();

export const nextServer = functions.https.onRequest((req, res) => {
    return app
        .prepare()
        .then(() => handle(req, res))
        .catch((error) => {
            console.error('Error during request:', error);
            res.status(500).send('Internal Server Error');
        });
});

export const onPostCreate = onDocumentCreated(
    'posts/{postId}',
    async (
        event: FirestoreEvent<
            QueryDocumentSnapshot | undefined,
            { postId: string }
        >
    ) => {
        const snapshot = event.data;
        if (!snapshot) {
            console.log('No data associated with the event');
            return;
        }

        const postData = snapshot.data();

        if (!postData.searchKeywords && postData.title) {
            const searchKeywords = generateSearchKeywords(postData.title);

            try {
                await snapshot.ref.update({
                    searchKeywords: searchKeywords,
                });
                console.log(
                    `Successfully updated searchKeywords for post ${event.params.postId}`
                );
            } catch (error) {
                console.error(
                    `Error updating searchKeywords for post ${event.params.postId}:`,
                    error
                );
            }
        }
    }
);

export const onPostUpdate = onDocumentUpdated(
    'posts/{postId}',
    async (
        event: FirestoreEvent<
            Change<QueryDocumentSnapshot> | undefined,
            { postId: string }
        >
    ) => {
        if (!event.data) {
            console.log('No data associated with the event');
            return;
        }

        const beforeData = event.data.before.data();
        const afterData = event.data.after.data();

        // 제목이 변경된 경우에만 검색 키워드 업데이트
        if (afterData.title !== beforeData.title) {
            const searchKeywords = generateSearchKeywords(afterData.title);

            try {
                await event.data.after.ref.update({
                    searchKeywords: searchKeywords,
                });
                console.log(
                    `Successfully updated searchKeywords for post ${event.params.postId}`
                );
            } catch (error) {
                console.error(
                    `Error updating searchKeywords for post ${event.params.postId}:`,

                    error
                );
            }
        }
    }
);
