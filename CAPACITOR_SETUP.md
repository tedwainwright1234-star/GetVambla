# Capacitor setup for Vambla

Run all of this from the root of your Next.js repo, on your own machine —
Xcode (Mac only) is needed for the iOS build, Android Studio for Android.

## 1. Install dependencies

```bash
npm install @capacitor/core @capacitor/cli @capacitor/preferences @capacitor/push-notifications
```

`@capacitor/preferences` powers the "has this device seen the welcome
screen" check. `@capacitor/push-notifications` handles device registration
and incoming notifications.

## 2. Initialize Capacitor

```bash
npx cap init "Vambla" "com.vambla.app" --web-dir=out
```

This creates `capacitor.config.ts` — replace it with the one in this
handoff (already configured to point at `https://vambla.com` instead of a
static export, so the app always reflects your latest Vercel deploy).

## 3. Add the native projects

```bash
npx cap add ios
npx cap add android
```

This creates `ios/` and `android/` folders in your repo — these are real
Xcode / Android Studio projects, commit them to git.

## 4. Drop in the code from this handoff

Copy into your repo, adjusting import paths/aliases to match your project:

- `lib/onboarding.ts`
- `lib/pushNotifications.ts`
- `components/onboarding/WelcomeScreen.tsx`
- `components/AppShell.tsx`

Then wrap your root layout's children in `<AppShell>`, e.g. in
`app/layout.tsx`:

```tsx
import AppShell from '@/components/AppShell';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
```

`AppShell` only activates the welcome screen and push registration when
running inside the native app (`Capacitor.isNativePlatform()`) — regular
browser visitors to vambla.com are unaffected.

## 5. Sync and open the native projects

Every time you change a Capacitor config or install a Capacitor plugin:

```bash
npx cap sync
```

Then open each platform to configure icons, splash screen, and (for push)
capabilities:

```bash
npx cap open ios       # opens Xcode
npx cap open android   # opens Android Studio
```

## 6. iOS-specific setup (Xcode)

- Set your Team under **Signing & Capabilities** (needs a paid Apple
  Developer account, $99/yr, for push notifications and App Store
  submission).
- Add the **Push Notifications** capability and the **Background Modes** →
  **Remote notifications** capability.
- Set app icon and launch screen under `Assets.xcassets`.

## 7. Android-specific setup (Android Studio)

- Set `applicationId` in `android/app/build.gradle` to `com.vambla.app`
  (should already match from `cap init`).
- Set app icon via **Image Asset Studio** (right-click `res` → New → Image
  Asset).
- Generate a signing keystore for release builds (Android Studio will
  prompt you under Build → Generate Signed Bundle).

## 8. Push notifications

See `FIREBASE_PUSH_SETUP.md` — this needs a Firebase project, config files
placed into the native projects, and an Apple Push Notification key
uploaded to Firebase for iOS.

## 9. Store submission

- **iOS**: App Store Connect (developer.apple.com) — you'll need
  screenshots, a privacy policy URL, and to answer Apple's data-use
  questionnaire (relevant here: location data, since Vambla is map-based).
- **Android**: Google Play Console ($25 one-time) — similar assets, plus a
  Data Safety form.

Both stores will ask about your location and push notification usage —
since Vambla shows nearby places and could notify about new places, be
upfront in both listings.
