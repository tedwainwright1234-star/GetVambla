'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { hasSeenWelcome, markWelcomeSeen } from '@/lib/onboarding';
import WelcomeScreen from '@/components/onboarding/WelcomeScreen';

export default function AppShell({ children }: { children: ReactNode }) {
  const [showWelcome, setShowWelcome] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (Capacitor.isNativePlatform()) {
        const seen = await hasSeenWelcome();
        if (!cancelled) setShowWelcome(!seen);

        // Push notifications aren't wired up yet - see FIREBASE_PUSH_SETUP.md.
        // Re-add @capacitor/push-notifications and this call once that's done.
      }
      if (!cancelled) setReady(true);
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
      {showWelcome && <WelcomeScreen onFinish={handleFinishWelcome} />}
      {children}
    </>
  );
}
