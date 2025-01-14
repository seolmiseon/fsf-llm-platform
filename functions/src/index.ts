import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import next from 'next';

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
