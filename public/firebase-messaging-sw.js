importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyBoWSWQhP1QMTVjc397oA-ufK1I2FEBr04",
    projectId: "edubridgehcm-1fa86",
    messagingSenderId: "552134784046",
    appId: "1:552134784046:web:6341327e597bb30c3edbbf",
});

// Lắng nghe thông báo khi app chạy ngầm hoặc đóng tab
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Nhận thông báo ngầm:', payload);

    const notificationTitle = payload?.notification?.title || "Thông báo từ EduBridge";
    const notificationBody = payload?.notification?.body || "Bạn có nội dung mới.";
    const targetPath = payload?.data?.route || payload?.data?.path || payload?.fcmOptions?.link || "/";
    const notificationOptions = {
        body: notificationBody,
        icon: '/logo.png', // Thay bằng đường dẫn icon của bạn trong thư mục public
        badge: '/logo.png', // Icon nhỏ hiện trên thanh trạng thái Android
        data: {
            ...(payload?.data || {}),
            route: targetPath,
        }    // Lưu trữ dữ liệu thêm nếu cần xử lý khi click
    };

    // Hiển thị thông báo ra màn hình
    self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const route = event?.notification?.data?.route || '/';
    event.waitUntil((async () => {
        const allClients = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
        for (const client of allClients) {
            if ('focus' in client) {
                await client.focus();
                if ('navigate' in client && route.startsWith('/')) {
                    await client.navigate(route);
                }
                return;
            }
        }
        await self.clients.openWindow(route.startsWith('/') ? route : '/');
    })());
});