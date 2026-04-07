importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBXusgZgnCby1D67BGGZwY6NLPlfc2xDEQ',
  messagingSenderId: '486022673740'
});

const messaging = firebase.messaging();

// إظهار الإشعار عند استقباله في الخلفية
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: payload.data?.tag || 'default',
    requireInteraction: true
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
