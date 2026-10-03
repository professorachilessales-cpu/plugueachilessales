'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useApp } from '@/context/AppContext';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { MustChangePasswordModal } from '@/components/auth/MustChangePasswordModal';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { sidebarCollapsed, isAuthenticated, isInitialized } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  // Toda vez que iniciar o sistema tem que solicitar o login:
  // Redireciona imediatamente para /login caso não haja sessão ativa
  useEffect(() => {
    if (isInitialized && !isAuthenticated && pathname !== '/login') {
      router.replace('/login');
    }
  }, [isInitialized, isAuthenticated, pathname, router]);

  // Rotas de autenticação (como /login) ocupam a tela inteira com layout imersivo
  if (pathname === '/login') {
    return <main className="w-full min-h-screen">{children}</main>;
  }

  // Se ainda estiver inicializando ou não autenticado em rota protegida, exibe transição suave
  if (!isInitialized || !isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-school-gold-400 border-t-transparent shadow-lg shadow-school-gold-500/20" />
          <span className="text-xs text-slate-400 font-medium tracking-wide">
            Verificando credenciais de acesso ao PLUGUE OS...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#8FAFCF] dark:bg-school-dark-bg text-slate-900 dark:text-slate-100 overflow-x-hidden">
      <Sidebar
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div
        className={`flex flex-1 flex-col transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
        }`}
      >
        <Header onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)} />
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-full overflow-x-hidden">
          <RouteGuard>{children}</RouteGuard>
        </main>
      </div>

      {/* Modal Bloqueante de Redefinição Obrigatória de Senha */}
      <MustChangePasswordModal />
    </div>
  );
}
