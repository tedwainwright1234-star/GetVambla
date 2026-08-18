'use client';

import { useEffect, useState } from 'react';

// Pulled directly from :root in app/globals.css.
const INK = '#182C21';

// How long the logo sits on screen before auto-continuing to the app.
// Tap/click also skips it immediately.
const AUTO_DISMISS_MS = 1600;

export default function WelcomeScreen({ onFinish }: { onFinish: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onFinish();
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onFinish]);

  const handleSkip = () => {
    setVisible(false);
    onFinish();
  };

  if (!visible) return null;

  return (
    <div
      onClick={handleSkip}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: INK,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      <img
        src="/vambla-icon.png"
        alt="Vambla"
        style={{
          width: 140,
          height: 'auto',
          animation: 'vambla-splash-fade-in 0.5s ease-out',
        }}
      />
      <style>{`
        @keyframes vambla-splash-fade-in {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
