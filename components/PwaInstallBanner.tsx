import React, { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export const PwaInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setDeferredPrompt(null);
      setHidden(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!deferredPrompt || hidden) {
    return null;
  }

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null);
      setHidden(true);
    }
  };

  return (
    <div className="fixed bottom-5 left-1/2 z-[90] w-[92%] max-w-xl -translate-x-1/2 rounded-2xl border border-indigo-200 bg-white/95 p-3 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="text-right">
          <p className="text-sm font-bold text-indigo-900">ثبت التطبيق على جهازك</p>
          <p className="text-xs text-gray-600">استخدام أسرع وإمكانية قراءة آخر الصفحات حتى مع ضعف الشبكة.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setHidden(true)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600"
          >
            لاحقًا
          </button>
          <button
            onClick={handleInstall}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white"
          >
            تثبيت
          </button>
        </div>
      </div>
    </div>
  );
};

