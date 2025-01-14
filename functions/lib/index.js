"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextServer = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const next_1 = require("next");
// Firebase 초기화
admin.initializeApp();
const dev = process.env.NODE_ENV !== 'production';
const app = (0, next_1.default)({
    dev,
    conf: {
        distDir: '../.next',
    },
});
const handle = app.getRequestHandler();
exports.nextServer = functions.https.onRequest((req, res) => {
    return app
        .prepare()
        .then(() => handle(req, res))
        .catch((error) => {
        console.error('Error during request:', error);
        res.status(500).send('Internal Server Error');
    });
});
//# sourceMappingURL=index.js.map