// ═══════════════════════════════════════════════════════════════
// useNotifications Hook — Web Push & Local Notification Management
// Handles Service Worker registration + push subscription + local alerts
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react';
import { pushApi } from '../utils/api.js';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function getDeviceName() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS Device';
  if (/Android/i.test(ua)) return 'Android Device';
  if (/Windows/i.test(ua)) return 'Windows PC';
  if (/Mac/i.test(ua)) return 'Mac';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Unknown Device';
}

export function useNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState('default');
  const [subscription, setSubscription] = useState(null);
  const [devices, setDevices] = useState([]);
  const [swRegistration, setSwRegistration] = useState(null);

  // ── Helper to get active SW registration ──
  const getRegistration = useCallback(async () => {
    if (swRegistration) return swRegistration;
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        setSwRegistration(reg);
        return reg;
      } catch (e) {
        console.warn('navigator.serviceWorker.ready failed:', e);
      }
    }
    return null;
  }, [swRegistration]);

  // ── Check support & register service worker ──
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    if (!supported) return;

    // Register service worker
    navigator.serviceWorker
      .register('/sw.js')
      .then(async (registration) => {
        setSwRegistration(registration);

        // Wait until service worker is active
        await navigator.serviceWorker.ready;

        // Check existing push subscription
        const sub = await registration.pushManager.getSubscription();
        if (sub) {
          setSubscription(sub);
          setIsSubscribed(true);
        }
      })
      .catch((err) => {
        console.error('Service Worker registration failed:', err);
      });
  }, []);

  // ── Request permission & subscribe to Web Push ──
  const subscribe = useCallback(async () => {
    try {
      if (!('Notification' in window)) {
        return { success: false, error: 'Notifications not supported in this browser' };
      }

      // Request notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        return { success: false, error: 'Permission was denied by browser' };
      }

      const reg = await getRegistration();
      if (!reg) {
        return { success: false, error: 'Service worker not ready. Please refresh.' };
      }

      // Get VAPID public key from backend server
      let publicKey;
      try {
        const res = await pushApi.getVapidKey();
        publicKey = res.publicKey;
      } catch (err) {
        return { success: false, error: 'Backend server unreachable. Make sure worker is running.' };
      }

      if (!publicKey) {
        return { success: false, error: 'No VAPID public key received from server' };
      }

      // Subscribe to push manager
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      // Send subscription to server
      await pushApi.subscribe(sub.toJSON(), getDeviceName());

      setSubscription(sub);
      setIsSubscribed(true);
      await fetchDevices();
      return { success: true };
    } catch (err) {
      console.error('Push subscription failed:', err);
      return { success: false, error: err.message || 'Subscription failed' };
    }
  }, [getRegistration]);

  // ── Unsubscribe ──
  const unsubscribe = useCallback(async () => {
    try {
      const reg = await getRegistration();
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await pushApi.unsubscribe(sub.endpoint);
        }
      }
      setSubscription(null);
      setIsSubscribed(false);
      await fetchDevices();
      return { success: true };
    } catch (err) {
      console.error('Unsubscribe failed:', err);
      return { success: false, error: err.message };
    }
  }, [getRegistration]);

  // ── Trigger local direct OS notification ──
  const showLocalNotification = useCallback(async (title, options = {}) => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') {
      const p = await Notification.requestPermission();
      setPermission(p);
      if (p !== 'granted') return;
    }

    const reg = await getRegistration();
    if (reg && reg.showNotification) {
      reg.showNotification(title, {
        icon: '/icons/favicon.svg',
        badge: '/icons/favicon.svg',
        tag: 'local-test',
        body: options.body || 'Lee To-Do notification is working!',
        ...options,
      });
    } else {
      new Notification(title, {
        icon: '/icons/favicon.svg',
        body: options.body || 'Lee To-Do notification is working!',
        ...options,
      });
    }
  }, [getRegistration]);

  // ── Send server test push notification ──
  const testNotification = useCallback(async () => {
    try {
      const result = await pushApi.testNotification();
      return result;
    } catch (err) {
      console.error('Test notification failed:', err);
      throw err;
    }
  }, []);

  // ── Trigger real scheduled notifications daemon on-demand ──
  const triggerCronSchedule = useCallback(async () => {
    try {
      const result = await pushApi.triggerCronSchedule();
      return result;
    } catch (err) {
      console.error('Trigger schedule failed:', err);
      throw err;
    }
  }, []);

  // ── Fetch registered devices ──
  const fetchDevices = useCallback(async () => {
    try {
      const data = await pushApi.listSubscriptions();
      setDevices(data.subscriptions || []);
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    }
  }, []);

  return {
    isSupported,
    isSubscribed,
    permission,
    devices,
    subscribe,
    unsubscribe,
    testNotification,
    triggerCronSchedule,
    showLocalNotification,
    fetchDevices,
  };
}
