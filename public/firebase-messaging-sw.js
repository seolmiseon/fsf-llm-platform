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
    messagingSenderId: '95748375795',
    appId: '1:95748375795:web:62d08430f49070023d2386',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
    const options = {
        body: payload.notification.body,
        icon: '/images/Icon.png',
    };

    self.registration.showNotification(payload.notification.title, options);
});
