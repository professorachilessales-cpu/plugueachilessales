'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Detecta se já está rodando como PWA instalado (Standalone)
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(Boolean(isStandaloneMode));
    };

    checkStandalone();

    // 2. Registro do Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            // Verifica atualizações do Service Worker periodicamente
            registration.onupdatefound = () => {
              const installingWorker = registration.installing;
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // Novo conteúdo disponível; ativa silenciosamente
                    installingWorker.postMessage({ type: 'SKIP_WAITING' });
                  }
                };
              }
            };
          })
          .catch((error) => {
            console.warn('[PWA] Falha ao registrar Service Worker:', error);
          });
      });
    }

    // 3. Captura o evento de instalação do PWA pelo navegador
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      // Exibe o banner apenas se o usuário ainda não tiver dispensado nesta sessão
      const dismissed = sessionStorage.getItem('pwa_prompt_dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Detecta quando o app foi instalado com sucesso
    window.addEventListener('appinstalled', () => {
      setShowBanner(false);
      setInstallPrompt(null);
      setIsStandalone(true);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setShowBanner(false);
      }
    } catch (err) {
      console.warn('[PWA] Erro ao disparar prompt de instalação:', err);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (!showBanner || isStandalone || !installPrompt) {
    return null;
  }

  return (
    <aside 
      aria-label="Instalação do Aplicativo PLUGUE"
      className="fixed bottom-4 right-4 z-50 max-w-sm rounded-2xl border border-blue-200/90 bg-white p-4 shadow-2xl dark:border-blue-900/60 dark:bg-slate-900 animate-in slide-in-from-bottom-4 duration-300 print:hidden"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-school-blue-700 text-white shadow-md shadow-blue-600/30">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-black text-slate-900 dark:text-white">
            Instalar Aplicativo PLUGUE
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
            Acesse direto da sua área de trabalho ou celular, com funcionamento rápido e suporte offline.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="inline-flex items-center gap-1.5 rounded-xl bg-school-blue-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-school-blue-800 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Instalar</span>
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Agora não
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Fechar banner"
          className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
