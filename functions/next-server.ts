import { https } from 'firebase-functions';
import { default as next } from 'next';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, conf: { distDir: './next' } });

const handle = app.getRequestHandler();

export const nextServer = https.onRequest((req, res) => {
    return app
        .prepare()
        .then(() => handle(req, res))
        .catch((error) => {
            console.error('Error during request:', error);
            res.status(500).send('Interval Server Error');
        });
});
