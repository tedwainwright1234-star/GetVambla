# Firebase setup for Vambla push notifications

Capacitor's push plugin uses Firebase Cloud Messaging (FCM) as the delivery
layer for both Android and iOS (FCM relays to Apple's APNs under the hood
for iOS, so you still need an Apple key — see step 5).

## 1. Create the Firebase project

1. Go to https://console.firebase.google.com and create a project called
   "Vambla".
2. Google Analytics is optional — skip it unless you want it.

## 2. Register the Android app

1. In the Firebase project, click **Add app → Android**.
2. Package name: `com.vambla.app` (must match `applicationId` in
   `android/app/build.gradle` exactly).
3. Download `google-services.json` and place it at
   `android/app/google-services.json` in your repo.
4. Follow Firebase's prompt to add the Google Services Gradle plugin —
   it'll ask you to edit `android/build.gradle` (project-level) and
   `android/app/build.gradle` (app-level). Follow the exact snippet
   Firebase shows you, since plugin version numbers change.

## 3. Register the iOS app

1. In the same Firebase project, click **Add app → iOS**.
2. Bundle ID: `com.vambla.app` (must match the bundle identifier in Xcode
   exactly).
3. Download `GoogleService-Info.plist`.
4. In Xcode, drag it into the `App/App` folder of your iOS project (check
   "Copy items if needed" and add it to the App target).

## 4. Enable Cloud Messaging

In Firebase Console → Project Settings → Cloud Messaging, confirm the
Cloud Messaging API is enabled (it usually is by default on new projects).

## 5. Apple Push Notification key (needed for iOS delivery)

FCM needs your APNs credentials to actually deliver to iOS devices:

1. In your Apple Developer account (developer.apple.com/account) go to
   **Certificates, Identifiers & Profiles → Keys**.
2. Create a new key with **Apple Push Notifications service (APNs)**
   enabled. Download the `.p8` file — Apple only lets you download it
   once, keep it safe.
3. In Firebase Console → Project Settings → Cloud Messaging → Apple app
   configuration, upload the `.p8` file along with your Key ID and Team
   ID (both shown on the Apple key page).

## 6. Sync and rebuild

```bash
npx cap sync
npx cap open ios
npx cap open android
```

Rebuild both native projects after adding the config files — the plugin
won't pick them up otherwise.

## 7. Where tokens go once registered

The `pushNotifications.ts` file in this handoff logs the device token on
registration. To actually send notifications later, you'll want:

- A Supabase table, e.g. `device_push_tokens (id, user_id nullable, token,
  platform, created_at)`, to store tokens as devices register.
- A small backend piece (Supabase Edge Function is the natural fit given
  your stack) that calls the Firebase Admin SDK to send messages to
  stored tokens — e.g. "3 new castles added near you."

That sending side isn't built yet — happy to put it together once you've
got the Firebase project live and tokens flowing in, since it's easier to
test against real registered devices.
