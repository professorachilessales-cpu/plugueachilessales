'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  Sun, 
  Moon, 
  ShieldCheck, 
  GraduationCap, 
  School, 
  Menu,
  Sliders,
  ChevronDown,
  UserCheck
} from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
}

export function Header({ onToggleMobileSidebar }: HeaderProps) {
  const { theme, toggleTheme, role, setRole, escolaConfig, currentUser, users, setCurrentUser } = useApp();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/90 px-4 sm:px-6 backdrop-blur-md transition-colors dark:border-school-dark-border dark:bg-school-dark-surface/90 print:hidden">
      {/* Lado Esquerdo: Mobile Trigger & Brasão do Sistema (PLUGUE) */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          aria-label="Abrir Menu"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden focus:outline-none focus:ring-2 focus:ring-school-blue-500"
        >
          <Menu className="h-6 w-6" />
        </button>

        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-plugue.png"
            alt="Brasão do Sistema PLUGUE"
            className="h-10 w-10 rounded-xl object-contain bg-white dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 shadow-sm"
          />
          <div className="hidden sm:block">
            <span className="text-sm font-black tracking-tight text-school-blue-800 dark:text-white uppercase leading-tight">
              PLUGUE
            </span>
            <span className="block text-[10px] font-bold text-school-gold-600 dark:text-school-gold-400 tracking-wider">
              SISTEMA EDUCACIONAL
            </span>
          </div>
        </Link>
      </div>

      {/* Lado Direito: Brasão da Escola, Seletor de RBAC & Usuários, Configurações e Alternador de Tema */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Brasão & Identificação da Escola no Lado Direito */}
        <div className="flex items-center gap-2.5 sm:border-r border-slate-200 dark:border-slate-800 pr-3">
          <div className="text-right hidden sm:block">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 max-w-[200px]" title={escolaConfig.nome_escola}>
              {escolaConfig.nome_escola}
            </h2>
            <div className="flex items-center justify-end gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-school-blue-600 dark:text-school-gold-400">
                Ano {escolaConfig.ano_letivo_ativo}
              </span>
              <span>•</span>
              <span>INEP: {escolaConfig.codigo_inep}</span>
            </div>
          </div>
          {escolaConfig.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={escolaConfig.logo_url}
              alt={escolaConfig.nome_escola}
              title={`Brasão da Escola: ${escolaConfig.nome_escola}`}
              className="h-10 w-10 rounded-xl object-contain bg-slate-50 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 shadow-sm"
            />
          ) : (
            <div
              title={`Brasão da Escola: ${escolaConfig.nome_escola}`}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-school-blue-700 to-school-blue-900 text-school-gold-400 shadow-sm shadow-blue-500/20"
            >
              <School className="h-5 w-5" />
            </div>
          )}
        </div>

        {/* Controle RBAC Interativo (Admin vs Professor) & Simulação de Usuário */}
        <div className="relative flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-inner">
          <button
            onClick={() => setRole('admin')}
            title="Acessar com perfil de Administrador / Secretaria"
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
              role === 'admin'
                ? 'bg-school-blue-800 text-white shadow-sm ring-1 ring-school-blue-600'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-school-gold-400" />
            <span className="hidden md:inline">Administração</span>
          </button>

          <button
            onClick={() => setRole('professor')}
            title="Acessar com perfil restrito de Professor"
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
              role === 'professor'
                ? 'bg-school-blue-800 text-white shadow-sm ring-1 ring-school-blue-600'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <GraduationCap className="h-4 w-4 text-school-gold-400" />
            <span className="hidden md:inline">Professor</span>
          </button>

          {/* Botão de Alternar Contas Rápidas */}
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            title="Alternar entre contas de teste de Usuários"
            className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {/* Dropdown de Seleção de Usuário */}
          {userDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50 animate-in fade-in-0 zoom-in-95 duration-150">
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Simular Usuário Conectado
              </div>
              <div className="space-y-1">
                {users.map((u) => {
                  const isSelected = currentUser?.id === u.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        setCurrentUser(u);
                        setUserDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition-colors ${
                        isSelected
                          ? 'bg-school-blue-50 text-school-blue-900 font-bold dark:bg-school-blue-950/60 dark:text-school-blue-300'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="truncate font-semibold">{u.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {u.role === 'admin' ? '🛡️ Admin' : '👨‍🏫 Professor'} • CPF: {u.cpf}
                        </p>
                      </div>
                      {u.must_change_password && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950 dark:text-school-gold-300 flex-shrink-0">
                          1º Acesso
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Botão de Atalho para Configurações (Apenas Administrador) */}
        {role === 'admin' && (
          <Link
            href="/configuracoes"
            title="Configurações do Sistema"
            className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <Sliders className="h-3.5 w-3.5 text-school-blue-600 dark:text-school-gold-400" />
            <span>Configurações</span>
          </Link>
        )}

        {/* Botão de Tema Escuro / Claro */}
        <button
          onClick={toggleTheme}
          aria-label="Alternar Tema Claro/Escuro"
          title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-100 hover:text-school-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-school-gold-400 dark:hover:bg-slate-700"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 transition-transform rotate-0 hover:rotate-45" />
          ) : (
            <Moon className="h-4 w-4 transition-transform -rotate-12 hover:rotate-0" />
          )}
        </button>
      </div>
    </header>
  );
}
