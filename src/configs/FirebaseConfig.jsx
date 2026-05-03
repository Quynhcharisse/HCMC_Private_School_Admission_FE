import {initializeApp} from "firebase/app";
import {getMessaging, getToken} from "firebase/messaging";

const firebaseConfig = {
    apiKey: "AIzaSyBOwSWQhP1QMTVjc397oA-ufK1I2FEBrO4",
    authDomain: "edubridgehcm-1fa86.firebaseapp.com",
    projectId: "edubridgehcm-1fa86",
    storageBucket: "edubridgehcm-1fa86.firebasestorage.app",
    messagingSenderId: "552134784046",
    appId: "1:552134784046:web:6341327e597bb30c3edbbf",
    measurementId: "G-K5FPMN235P"
};

const app = initializeApp(firebaseConfig);
// Khởi tạo Messaging
export const messaging = getMessaging(app);

// Hàm xin quyền và lấy Token
export const requestForToken = async () => {
    try {
        const currentToken = await getToken(messaging, {
            vapidKey: 'BJFh9KUZ2qNbXGaVPfGR93f1qzuMY5iMOtz2BFKQ5DlTBbl8-AHth8da_juE5MYdSzQQB4uKa5o57iJsri8Q8qo'
        });
        if (currentToken) {
            console.log('Token của bạn:', currentToken);
            return currentToken;
        } else {
            console.log('Người dùng chặn thông báo hoặc có lỗi.');
            return null;
        }
    } catch (err) {
        console.log('Lỗi lấy token:', err);
        return null;
    }
};

