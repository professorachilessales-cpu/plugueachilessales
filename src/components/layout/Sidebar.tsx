'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  LayoutDashboard,
  Users,
  Image as ImageIcon,
  BookOpen,
  UserCheck,
  Calendar,
  Settings,
  X,
  History,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  LogOut,
} from 'lucide-react';
import { AllowedModule } from '@/lib/types';

interface SidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ isOpenMobile, onCloseMobile }: SidebarProps) {
  const pathname = usePathname() || '';
  const { role, sidebarCollapsed, toggleSidebarCollapsed, currentUser, logout, professores } = useApp();

  // Vincula o registro oficial do professor do banco de dados para exibir o Nome Completo
  const professorVinculado = role === 'professor'
    ? professores.find((p) => {
        const cpfLimpoUser = currentUser?.cpf?.replace(/\D/g, '');
        const cpfLimpoProf = p.cpf?.replace(/\D/g, '');
        if (cpfLimpoUser && cpfLimpoProf && cpfLimpoUser === cpfLimpoProf) return true;
        if (currentUser?.id && (p.id === currentUser.id || (p as any).user_id === currentUser.id)) return true;
        if (currentUser?.email && p.email?.toLowerCase() === currentUser.email.toLowerCase()) return true;
        if (currentUser?.name && p.nome_completo?.toLowerCase() === currentUser.name.toLowerCase()) return true;
        return false;
      })
    : null;

  const nomeExibicaoUsuario = role === 'professor'
    ? (professorVinculado?.nome_completo || currentUser?.name || 'Professor')
    : (currentUser?.name || 'Administrador');

  const allNavItems = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'direcao', 'professor'],
    },
    {
      title: 'Estudantes & Relatórios',
      href: '/estudantes',
      icon: Users,
      roles: ['admin', 'direcao'],
    },
    {
      title: 'Fotograma da Turma',
      href: '/fotograma',
      icon: ImageIcon,
      roles: ['admin', 'direcao', 'professor'],
      module: 'FOTOGRAMA' as AllowedModule,
      highlight: true,
    },
    {
      title: 'Turmas & Horários',
      href: '/turmas',
      icon: BookOpen,
      roles: ['admin', 'direcao'],
    },
    {
      title: 'Ficha Funcional & Faltas',
      href: '/professores',
      icon: UserCheck,
      roles: ['admin', 'direcao'],
    },
    {
      title: 'Calendário & Eventos',
      href: '/calendario',
      icon: Calendar,
      roles: ['admin', 'direcao', 'professor'],
      module: 'CALENDARIO' as AllowedModule,
    },
    {
      title: 'Auditoria',
      href: '/auditoria',
      icon: History,
      roles: ['admin', 'direcao'],
    },
    {
      title: 'Configurações',
      href: '/configuracoes',
      icon: Settings,
      roles: ['admin', 'direcao'],
    },
  ];

  // Regra crítica de RBAC: Quando em modo Professor, os módulos de administração são
  // omitidos e os módulos modulares (Fotograma, Calendário) respeitam a Matriz de Permissões
  const visibleNavItems = allNavItems.filter((item) => {
    if (!item.roles.includes(role)) return false;
    if (role === 'professor' && 'module' in item && item.module) {
      const allowed = currentUser?.allowed_modules || ['PROFILE', 'FOTOGRAMA', 'CALENDARIO'];
      return allowed.includes(item.module as AllowedModule);
    }
    return true;
  });

  return (
    <>
      {/* Overlay Mobile */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container: w-64 (~256px) expandida, w-[72px] contraída */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white dark:border-school-dark-border dark:bg-school-dark-surface transition-all duration-300 ease-in-out lg:translate-x-0 print:hidden ${
          isOpenMobile ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${sidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-64'}`}
      >
        {/* Cabeçalho da Sidebar */}
        <div
          className={`flex h-16 items-center border-b border-slate-200 dark:border-school-dark-border transition-all ${
            sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'
          }`}
        >
          <Link
            href="/"
            className="flex items-center gap-2.5 overflow-hidden"
            title="PLUGUE - Gestão Educacional"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-plugue.png"
              alt="Brasão do Sistema PLUGUE"
              className="h-9 w-9 min-w-[36px] rounded-xl object-contain bg-white dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 shadow-sm"
            />
            {!sidebarCollapsed && (
              <div className="flex flex-col whitespace-nowrap overflow-hidden transition-all duration-200">
                <span className="text-base font-black tracking-tight text-school-blue-800 dark:text-white uppercase leading-tight">
                  PLUGUE
                </span>
                <span className="text-[10px] font-bold text-school-gold-600 dark:text-school-gold-400 tracking-wider">
                  GESTÃO EDUCACIONAL
                </span>
              </div>
            )}
          </Link>

          {/* Botão de Fechar no Mobile */}
          <button
            onClick={onCloseMobile}
            aria-label="Fechar Menu"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Botão de Alternância Retrátil (Desktop) */}
          <button
            onClick={toggleSidebarCollapsed}
            aria-label={sidebarCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
            title={sidebarCollapsed ? 'Expandir Menu Lateral (256px)' : 'Recolher Menu Lateral (72px)'}
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-all"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Indicador do Nível de Acesso Ativo (RBAC) */}
        {!sidebarCollapsed ? (
          <div className="mx-3 mt-3 rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900/60 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Perfil Ativo
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  role === 'admin'
                    ? 'bg-school-blue-100 text-school-blue-800 dark:bg-school-blue-950 dark:text-school-blue-300'
                    : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-school-gold-300'
                }`}
              >
                {role === 'admin' ? (
                  <>
                    <ShieldCheck className="h-3 w-3" />
                    <span>Secretaria / Admin</span>
                  </>
                ) : (
                  <>
                    <GraduationCap className="h-3 w-3" />
                    <span>Professor</span>
                  </>
                )}
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={nomeExibicaoUsuario}>
              {nomeExibicaoUsuario}
            </p>
          </div>
        ) : (
          <div className="mx-auto mt-3 group relative flex items-center justify-center">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                role === 'admin'
                  ? 'border-school-blue-200 bg-school-blue-50 text-school-blue-700 dark:border-school-blue-900 dark:bg-school-blue-950/60 dark:text-school-blue-300'
                  : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/60 dark:text-school-gold-300'
              }`}
            >
              {role === 'admin' ? (
                <ShieldCheck className="h-4 w-4" />
              ) : (
                <GraduationCap className="h-4 w-4" />
              )}
            </div>

            {/* Tooltip flutuante do perfil */}
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 hidden group-hover:flex items-center pointer-events-none">
              <div className="whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xl dark:bg-slate-800 dark:border dark:border-slate-700">
                <span className="block font-bold">
                  {role === 'admin' ? 'Perfil: Administrador' : 'Perfil: Professor'}
                </span>
                <span className="text-[10px] text-slate-300">
                  {nomeExibicaoUsuario}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Lista de Navegação Principal */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-2.5 py-4 scrollbar-thin">
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href === '/dashboard' && pathname === '/') || (item.href !== '/' && item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <div key={item.href} className="group relative">
                <Link
                  href={item.href}
                  onClick={onCloseMobile}
                  className={`flex w-full min-h-[48px] items-center rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-200 ${
                    sidebarCollapsed ? 'justify-center' : 'justify-between'
                  } ${
                    isActive
                      ? 'bg-slate-200/90 text-school-blue-950 font-bold border-l-4 border-school-blue-800 shadow-sm dark:bg-slate-800 dark:text-white dark:border-school-gold-400'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/90 dark:hover:text-slate-100'
                  }`}
                >
                  <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3 min-w-0'}`}>
                    <Icon
                      className={`h-5 w-5 flex-shrink-0 transition-colors ${
                        isActive
                          ? 'text-school-blue-700 dark:text-school-gold-400'
                          : 'text-slate-500 group-hover:text-school-blue-600 dark:text-slate-400 dark:group-hover:text-school-gold-400'
                      }`}
                    />
                    {!sidebarCollapsed && (
                      <span className="truncate">{item.title}</span>
                    )}
                  </div>

                  {!sidebarCollapsed && item.badge && (
                    <span
                      className={`ml-2 flex-shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                        isActive
                          ? 'bg-school-blue-800 text-white dark:bg-school-gold-500 dark:text-slate-950'
                          : item.highlight
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>

                {/* Tooltip Flutuante no Modo Contraído (sidebarCollapsed = true) */}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 hidden group-hover:flex items-center pointer-events-none">
                    <div className="flex items-center gap-2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-xl dark:bg-slate-800 dark:border dark:border-slate-700 animate-in fade-in-0 zoom-in-95 duration-150">
                      <span>{item.title}</span>
                      {item.badge && (
                        <span className="rounded bg-school-blue-600/50 text-school-blue-200 px-1.5 py-0.5 text-[10px] font-bold">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Rodapé da Sidebar */}
        <div className="border-t border-slate-200 p-3 dark:border-school-dark-border space-y-2">
          {sidebarCollapsed && (
            <div className="flex justify-center">
              <button
                onClick={toggleSidebarCollapsed}
                title="Expandir Menu Lateral"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Botão de Sair / Deslogar no Rodapé da Barra Lateral */}
          <button
            onClick={logout}
            title="Encerrar Sessão e Sair do Sistema"
            className={`w-full flex items-center rounded-xl p-2.5 text-xs font-bold transition-all ${
              sidebarCollapsed
                ? 'justify-center text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/60'
                : 'gap-2.5 bg-rose-50/70 text-rose-700 hover:bg-rose-100 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50 dark:hover:bg-rose-900/60 shadow-sm'
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            {!sidebarCollapsed && <span>Sair do Sistema</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
