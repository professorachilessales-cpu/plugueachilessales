'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useApp } from '@/context/AppContext';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { MustChangePasswordModal } from '@/components/auth/MustChangePasswordModal';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { sidebarCollapsed } = useApp();

  return (
    <div className="flex min-h-screen flex-col bg-slate-100/75 dark:bg-school-dark-bg text-slate-900 dark:text-slate-100">
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <RouteGuard>{children}</RouteGuard>
        </main>
      </div>

      {/* Modal Bloqueante de Redefinição Obrigatória de Senha */}
      <MustChangePasswordModal />
    </div>
  );
}
