/* 52:48 — 웹 푸시 서비스워커 (레포 루트에 index.html과 같은 위치에 둘 것) */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// index.html의 FIREBASE_CONFIG와 동일한 값 (공개돼도 되는 식별자)
firebase.initializeApp({
  apiKey: "AIzaSyAKwZ96ZJOmiefP5meu3oHS4RTjjqxFqas",
  authDomain: "todo-8e144.firebaseapp.com",
  projectId: "todo-8e144",
  storageBucket: "todo-8e144.firebasestorage.app",
  messagingSenderId: "290610463702",
  appId: "1:290610463702:web:ac1412f24fd831ff999a77",
});

const messaging = firebase.messaging();

// 앱이 닫혀 있을 때(백그라운드) 들어온 data 메시지를 알림으로 표시
messaging.onBackgroundMessage((payload) => {
  const d = payload.data || {};
  self.registration.showNotification(d.title || '52:48 💗', {
    body: d.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    data: { url: d.url || '/' },
  });
});

// 알림 탭하면 앱 열기
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(clients.openWindow(url));
});
