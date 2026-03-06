'use client';

import { useEffect, useRef } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging } from '@/lib/firebase';
import { registerFcmToken } from '@/lib/api-client';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export function useFCM() {
    const tokenRegistered = useRef(false);

    useEffect(() => {
        if (tokenRegistered.current) return;

        if (typeof window === 'undefined' || !('Notification' in window)) return;

        const initFCM = async () => {
            try {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') return;

                let swRegistration: ServiceWorkerRegistration | undefined;
                if ('serviceWorker' in navigator) {
                    swRegistration = await navigator.serviceWorker.register(
                        '/firebase-messaging-sw.js',
                        { scope: '/' }
                    );

                    // Attendre que le SW soit actif avant d'obtenir le token
                    await new Promise<void>((resolve) => {
                        if (swRegistration!.active) {
                            resolve();
                        } else {
                            const sw = swRegistration!.installing ?? swRegistration!.waiting;
                            if (sw) {
                                sw.addEventListener('statechange', (e) => {
                                    if ((e.target as ServiceWorker).state === 'activated') {
                                        resolve();
                                    }
                                });
                            } else {
                                // Déjà en attente d'activation via navigator.serviceWorker.ready
                                navigator.serviceWorker.ready.then(() => resolve());
                            }
                        }
                    });
                }

                const messagingInstance = getFirebaseMessaging();
                if (!messagingInstance) return;

                const tokenOptions: { vapidKey?: string; serviceWorkerRegistration?: ServiceWorkerRegistration } = {};
                if (VAPID_KEY) tokenOptions.vapidKey = VAPID_KEY;
                if (swRegistration) tokenOptions.serviceWorkerRegistration = swRegistration;

                const fcmToken = await getToken(messagingInstance, tokenOptions);
                if (!fcmToken) return;

                try {
                    await registerFcmToken(fcmToken);
                    tokenRegistered.current = true;
                } catch (regErr) {
                    // Ignorer silencieusement les échecs réseau (Render sleep, hors-ligne)
                    if (!(regErr instanceof TypeError)) {
                        console.error('[FCM] Échec enregistrement token:', regErr);
                    }
                }

                // Écouter les messages en foreground
                onMessage(messagingInstance, (payload) => {
                    const title = payload.notification?.title || 'Nouvelle notification';
                    const body = payload.notification?.body || '';

                    // Notifier useNotifications pour mise à jour immédiate du badge
                    window.dispatchEvent(
                        new CustomEvent('delivery:fcm-message', {
                            detail: { title, body, data: payload.data },
                        })
                    );

                    // Notification native OS
                    if (Notification.permission === 'granted') {
                        new Notification(title, { body, icon: '/logo.png' });
                    }
                });
            } catch (error) {
                console.error('[FCM] Erreur initialisation:', error);
            }
        };

        const accessToken = localStorage.getItem('access_token');
        if (accessToken) initFCM();
    }, []);
}
