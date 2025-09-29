importScripts(
    'https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js'
);
importScripts(
    'https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js'
);

firebase.initializeApp({
    apiKey: 'AIzaSyCc2QmrzyraRAACo-HKEV72ehkb8BGAPfY',
    authDomain: 'fsfproject-fd2e6.firebaseapp.com',
    projectId: 'fsfproject-fd2e6',
    storageBucket: 'fsfproject-fd2e6.firebasestorage.app',
    messagingSenderId: '95748375795',
    appId: '1:95748375795:web:62d08430f49070023d2386',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
    console.log(
        '[firebase-messaging-sw.js] Received background message ',
        payload
    );
    const options = {
        body: payload.notification.body,
        icon: '/images/Icon.png',
        badge: '/images/badge.png',
        tag: 'notification-1',
        data: payload.data,
    };

    return self.registration.showNotification(
        payload.notification.title,
        options
    );
});

self.addEventListener('notificationclick', function (event) {
    console.log('[firebase-messaging-sw.js] Notification click Received.');

    event.notification.close();

    // This looks to see if the current is already open and focuses if it is
    event.waitUntil(
        clients
            .matchAll({
                type: 'window',
            })
            .then(function (clientList) {
                for (var i = 0; i < clientList.length; i++) {
                    var client = clientList[i];
                    if (client.url === '/' && 'focus' in client)
                        return client.focus();
                }
                if (clients.openWindow) return clients.openWindow('/');
            })
    );
});
