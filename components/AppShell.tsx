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

  // When the on-screen keyboard opens, the visible page area shrinks -
  // fixed-position bottom bars (.vambla-bottom-nav, .mobile-toggle) get
  // recalculated relative to that new shorter height and end up shoved
  // up into the middle of the screen, right under whatever input is
  // focused, instead of staying at the bottom edge. Simplest reliable
  // fix: just hide them while typing, same as most mobile apps do while
  // a keyboard is open, and restore them once you're done.
  useEffect(() => {
    function isTextInput(el: EventTarget | null) {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
    }

    function handleFocusIn(e: FocusEvent) {
      if (isTextInput(e.target)) {
        document.body.classList.add('vambla-input-focused');
      }
    }
    function handleFocusOut(e: FocusEvent) {
      if (isTextInput(e.target)) {
        document.body.classList.remove('vambla-input-focused');
      }
    }

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);
    return () => {
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Avoid a flash of the app before we know whether to show onboarding.
  if (!ready) return null;

  return (
    <>
      {showWelcome && <WelcomeScreen onFinish={handleFinishWelcome} />}
      {children}
    </>
  );
}
