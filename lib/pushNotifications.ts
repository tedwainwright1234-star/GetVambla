import { Capacitor } from '@capacitor/core';
import { PushNotifications, type Token, type PushNotificationSchema, type ActionPerformed } from '@capacitor/push-notifications';

/**
 * Requests permission, registers this device with FCM/APNs, and wires up
 * listeners. Call once, e.g. from AppShell on native launch.
 */
export async function initPushNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  let permStatus = await PushNotifications.checkPermissions();

  if (permStatus.receive === 'prompt') {
    permStatus = await PushNotifications.requestPermissions();
  }

  if (permStatus.receive !== 'granted') {
    console.log('[push] permission not granted:', permStatus.receive);
    return;
  }

  await PushNotifications.register();

  PushNotifications.addListener('registration', (token: Token) => {
    console.log('[push] registered, token:', token.value);
    // TODO: send token.value + Capacitor.getPlatform() to Supabase so you
    // can target this device from a sending function later. Something like:
    // await supabase.from('device_push_tokens').upsert({
    //   token: token.value,
    //   platform: Capacitor.getPlatform(),
    // });
  });

  PushNotifications.addListener('registrationError', (err) => {
    console.error('[push] registration error:', err);
  });

  // Notification arrives while the app is open/foregrounded
  PushNotifications.addListener(
    'pushNotificationReceived',
    (notification: PushNotificationSchema) => {
      console.log('[push] received in foreground:', notification);
    }
  );

  // User tapped a notification (app was backgrounded or closed)
  PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (action: ActionPerformed) => {
      console.log('[push] tapped:', action.notification);
      // TODO: route to a specific place page using custom data, e.g.
      // if (action.notification.data?.placeSlug) {
      //   router.push(`/places/${action.notification.data.placeSlug}`);
      // }
    }
  );
}
