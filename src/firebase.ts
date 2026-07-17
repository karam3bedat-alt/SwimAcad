import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// الحصول على نسخة قاعدة البيانات بالشكل القياسي والآمن لتجنب أخطاء إعادة التهيئة المتكررة
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// تفعيل التخزين المؤقت المحلي المستمر (IndexedDB Persistence) بشكل غير متزامن وآمن
// بحيث إذا كان التطبيق يعمل داخل إطار (iframe) أو كان المتصفح يمنع التخزين، يعمل التطبيق بسلاسة بالاعتماد على التخزين المؤقت في الذاكرة
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      // تم تفعيل التخزين المؤقت في تبويب آخر بالفعل
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      // المتصفح الحالي لا يدعم التخزين المؤقت المستمر
      console.warn('Firestore persistence is not supported by this browser');
    } else {
      console.warn('Firestore persistence could not be enabled:', err);
    }
  });
}

export const storage = getStorage(app);

// تهيئة الإشعارات بشكل آمن لتفادي الانهيار داخل الـ iframe أو البيئات التي لا تدعمها
let messagingInstance = null;
if (typeof window !== 'undefined') {
  try {
    messagingInstance = getMessaging(app);
  } catch (error) {
    console.warn('Firebase Messaging is not supported or failed to initialize in this environment:', error);
  }
}
export const messaging = messagingInstance;

// طلب إذن الإشعارات
export async function requestNotificationPermission() {
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      });
      console.log('FCM Token:', token);
      return token;
    } else {
      console.log('Permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
}

// استقبال الإشعارات أثناء استخدام التطبيق
export function onMessageListener() {
  if (!messaging) return null;
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log('Message received:', payload);
      resolve(payload);
    });
  });
}
