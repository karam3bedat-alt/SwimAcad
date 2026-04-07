import React, { useEffect, useState } from 'react';
import { requestNotificationPermission, onMessageListener } from '../firebase';
import { Bell, BellOff } from 'lucide-react';
import toast from 'react-hot-toast';

const NotificationManager: React.FC = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // التحقق من الإذن الحالي
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    
    // استقبال الإشعارات أثناء استخدام التطبيق
    const setupListener = async () => {
      const listener = onMessageListener();
      if (listener) {
        const payload: any = await listener;
        if (payload && payload.notification) {
          toast.success(`🔔 ${payload.notification.title}: ${payload.notification.body}`, {
            duration: 5000,
            position: 'top-right'
          });
        }
      }
    };
    
    setupListener();
  }, []);

  const enableNotifications = async () => {
    const fcmToken = await requestNotificationPermission();
    if (fcmToken) {
      setToken(fcmToken);
      setPermission('granted');
      toast.success('✅ تم تفعيل الإشعارات بنجاح!');
      
      // هنا ترسل الـ token للـ Backend لحفظه
      // await saveTokenToDatabase(fcmToken);
    } else {
      toast.error('❌ لم يتم منح الإذن أو حدث خطأ');
    }
  };

  if (!('Notification' in window)) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {permission === 'granted' ? (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold border border-emerald-100 dark:border-emerald-800 transition-colors">
          <Bell size={16} />
          <span>الإشعارات مفعلة</span>
        </div>
      ) : (
        <button
          onClick={enableNotifications}
          className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-blue-700 transition-all shadow-sm shadow-blue-100 dark:shadow-none font-bold"
        >
          <BellOff size={16} />
          <span>تفعيل الإشعارات</span>
        </button>
      )}
    </div>
  );
};

export default NotificationManager;
