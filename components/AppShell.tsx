'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { hasSeenWelcome, markWelcomeSeen } from '@/lib/onboarding';
import { initPushNotifications } from '@/lib/pushNotifications';
import WelcomeScreen from '@/components/onboarding/WelcomeScreen';

// TEMPORARY: visible diagnostic banner while we track down why the
// welcome screen isn't appearing on native. Remove this once resolved.
function DebugBanner({ text }: { text: string }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        background: 'red',
        color: 'white',
        fontSize: 11,
        fontFamily: 'monospace',
        padding: '4px 8px',
        wordBreak: 'break-all',
      }}
    >
      {text}
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const [showWelcome, setShowWelcome] = useState(false);
  const [ready, setReady] = useState(false);
  const [debugText, setDebugText] = useState('debug: init not run yet');

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const isNative = Capacitor.isNativePlatform();
      const platform = Capacitor.getPlatform();
      let seen: boolean | string = 'n/a (not native)';

      if (isNative) {
        try {
          seen = await hasSeenWelcome();
          if (!cancelled) setShowWelcome(!seen);
        } catch (err) {
          seen = `ERROR: ${String(err)}`;
        }

        // TEMPORARILY DISABLED: push notifications need Firebase set up
        // first (see FIREBASE_PUSH_SETUP.md) - calling this before that's
        // done appears to crash the Capacitor bridge on launch. Re-enable
        // once google-services.json is in place and Firebase is configured.
        // initPushNotifications().catch((err) =>
        //   console.error('[push] init failed:', err)
        // );
      }

      if (!cancelled) {
        setDebugText(`native=${isNative} platform=${platform} seen=${seen}`);
        setReady(true);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFinishWelcome = async () => {
    await markWelcomeSeen();
    setShowWelcome(false);
  };

  // Avoid a flash of the app before we know whether to show onboarding.
  if (!ready) return null;

  return (
    <>
      <DebugBanner text={debugText} />
      {showWelcome && <WelcomeScreen onFinish={handleFinishWelcome} />}
      {children}
    </>
  );
}
