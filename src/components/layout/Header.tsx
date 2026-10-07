'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  Sun, 
  Moon, 
  ShieldCheck, 
  GraduationCap, 
  School, 
  Menu,
  ChevronDown,
  UserCheck,
  Bell,
  CheckCheck,
  FileText,
  Clock,
  Sparkles,
  LogOut,
  Lock,
  KeyRound
} from 'lucide-react';
import Link from 'next/link';
import { ModalAlterarSenha } from '@/components/auth/ModalAlterarSenha';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
}

export function Header({ onToggleMobileSidebar }: HeaderProps) {
  const { 
    theme, 
    toggleTheme, 
    role, 
    setRole, 
    escolaConfig, 
    currentUser, 
    authenticatedUser,
    users, 
    setCurrentUser,
    notificacoesAdmin,
    marcarNotificacaoLida,
    marcarTodasNotificacoesLidas,
    logout,
    isAdminSession,
    professores,
  } = useApp();
  const [modalSenhaAberto, setModalSenhaAberto] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // Usuário efetivamente logado no sistema (prioriza o usuário autenticado da sessão)
  const usuarioLogado = authenticatedUser || currentUser;

  // Vincula o registro oficial do professor do banco de dados para exibir o Nome Completo
  const professorVinculado = (role === 'professor' || usuarioLogado?.role === 'professor')
    ? professores.find((p) => {
        const cpfLimpoUser = usuarioLogado?.cpf?.replace(/\D/g, '');
        const cpfLimpoProf = p.cpf?.replace(/\D/g, '');
        if (cpfLimpoUser && cpfLimpoProf && cpfLimpoUser === cpfLimpoProf) return true;
        if (usuarioLogado?.id && (p.id === usuarioLogado.id || (p as any).user_id === usuarioLogado.id)) return true;
        if (usuarioLogado?.email && p.email && usuarioLogado.email.toLowerCase() === p.email.toLowerCase()) return true;
        if (usuarioLogado?.name && p.nome_completo && usuarioLogado.name.toLowerCase() === p.nome_completo.toLowerCase()) return true;
        return false;
      })
    : null;

  const nomeExibicaoUsuario = 
    professorVinculado?.nome_completo || 
    usuarioLogado?.name || 
    (role === 'professor' ? 'Professor' : 'Administrador');

  const fotoUsuario = 
    professorVinculado?.foto_url || 
    usuarioLogado?.avatar_url || 
    (usuarioLogado as any)?.foto_url;

  // Fecha o dropdown de notificações ao clicar fora (Click Outside) ou ao pressionar a tecla Esc
  useEffect(() => {
    if (!notifDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(target)) {
        setNotifDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotifDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [notifDropdownOpen]);

  const naoLidas = notificacoesAdmin.filter(n => !n.lido);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/90 bg-white/95 px-4 sm:px-6 shadow-xs backdrop-blur-md transition-colors dark:border-school-dark-border dark:bg-school-dark-surface/90 print:hidden">
      {/* Lado Esquerdo: Mobile Trigger + Identificação Completa da Escola */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          aria-label="Abrir Menu"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden focus:outline-none focus:ring-2 focus:ring-school-blue-500"
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* [Símbolo/Logo da Escola] [Nome da Escola] | Ano Letivo | INEP: XXXXXXXX */}
        <div className="flex items-center gap-2.5">
          {escolaConfig.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={escolaConfig.logo_url}
              alt={escolaConfig.nome_escola}
              title={`Brasão da Escola: ${escolaConfig.nome_escola}`}
              className="h-9 w-9 rounded-xl object-contain bg-slate-50 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 shadow-sm shrink-0"
            />
          ) : (
            <div
              title={`Brasão da Escola: ${escolaConfig.nome_escola}`}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-school-blue-700 to-school-blue-900 text-school-gold-400 shadow-sm shadow-blue-500/20 shrink-0"
            >
              <School className="h-4.5 w-4.5" />
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white line-clamp-1" title={escolaConfig.nome_escola}>
              {escolaConfig.nome_escola}
            </h2>
            <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">|</span>
            <span className="text-[11px] font-bold text-school-blue-600 dark:text-school-gold-400 hidden sm:inline">
              Ano Letivo {escolaConfig.ano_letivo_ativo}
            </span>
            <span className="text-slate-300 dark:text-slate-600 hidden md:inline">|</span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hidden md:inline font-mono">
              INEP: {escolaConfig.codigo_inep}
            </span>
          </div>
        </div>
      </div>

      {/* Lado Direito: Identificação do Usuário, Notificações, Alterar Senha, Tema e Sair */}
      <div className="flex items-center gap-2 sm:gap-4">

        {/* Identificação do Usuário Conectado (Sem rótulo 'Docente' no perfil de professor) */}
        {role === 'admin' ? (
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 px-3 py-1.5 text-xs font-semibold border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 shadow-inner">
            <ShieldCheck className="h-4 w-4 text-school-gold-500 shrink-0" />
            <span className="hidden md:inline font-bold">Administrador</span>
          </div>
        ) : (
          <div 
            className="flex items-center gap-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 pl-1.5 pr-3 py-1 border border-slate-200/80 dark:border-slate-700/80 shadow-xs"
            title={`Professor conectado: ${nomeExibicaoUsuario}`}
          >
            {fotoUsuario ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fotoUsuario}
                alt={nomeExibicaoUsuario}
                className="h-7 w-7 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-school-blue-800 text-school-gold-300 text-[11px] font-black shrink-0">
                {nomeExibicaoUsuario.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px] sm:max-w-[220px]">
              {nomeExibicaoUsuario}
            </span>
          </div>
        )}

        {/* Botão Alterar Senha */}
        <button
          onClick={() => setModalSenhaAberto(true)}
          title="Alterar Minha Senha de Acesso"
          aria-label="Alterar Senha"
          className="relative flex items-center gap-1.5 h-9 min-h-[36px] rounded-xl border border-slate-200 bg-white px-2.5 sm:px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 shadow-xs transition-all active:scale-95"
        >
          <KeyRound className="h-4 w-4 text-school-blue-600 dark:text-school-gold-400 shrink-0" />
          <span className="hidden sm:inline">Alterar Senha</span>
        </button>


        {/* Notificações de Pareceres Entregues para Admin / Direção */}
        {(role === 'admin' || role === 'direcao') && (
          <div ref={notifDropdownRef} className="relative">
            <button
              onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
              title="Notificações de Pareceres Docentes"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-100 hover:text-school-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Bell className="h-4 w-4" />
              {naoLidas.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white ring-2 ring-white dark:ring-slate-900 animate-pulse">
                  {naoLidas.length}
                </span>
              )}
            </button>

            {notifDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-50 animate-in fade-in-0 zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Bell className="h-4 w-4 text-school-blue-600 dark:text-school-gold-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Pareceres Enviados ({naoLidas.length} novos)
                    </span>
                  </div>
                  {naoLidas.length > 0 && (
                    <button
                      onClick={marcarTodasNotificacoesLidas}
                      className="text-[10px] font-semibold text-school-blue-600 hover:underline dark:text-school-gold-400"
                    >
                      Marcar todos como lidos
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2">
                  {notificacoesAdmin.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-400">
                      Nenhuma notificação no momento.
                    </p>
                  ) : (
                    notificacoesAdmin.map((n) => (
                      <div
                        key={n.id}
                        className={`rounded-xl p-2.5 transition-all border ${
                          n.lido
                            ? 'bg-slate-50 border-slate-100 dark:bg-slate-800/40 dark:border-slate-800 text-slate-500'
                            : 'bg-blue-50/70 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900/60 text-slate-900 dark:text-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-school-blue-700 dark:text-school-gold-400 uppercase tracking-wider block">
                              Novo Parecer Docente
                            </span>
                            <p className="text-xs font-semibold leading-snug mt-0.5">
                              {n.professor_nome} entregou o parecer de {n.aluno_nome}.
                            </p>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3" />
                              {new Date(n.data_criacao).toLocaleString('pt-BR')}
                            </span>
                          </div>

                          <div className="flex flex-col gap-1 items-end">
                            <Link
                              href="/estudantes"
                              onClick={() => {
                                setNotifDropdownOpen(false);
                                marcarNotificacaoLida(n.id);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-school-blue-800 px-2 py-1 text-[10px] font-bold text-white shadow-sm hover:bg-school-blue-700 transition-colors"
                            >
                              Ver
                            </Link>
                            {!n.lido && (
                              <button
                                onClick={() => marcarNotificacaoLida(n.id)}
                                title="Marcar como lido"
                                className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              >
                                Dispensar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Botão de Tema Escuro / Claro */}
        <button
          onClick={toggleTheme}
          aria-label="Alternar Tema Claro/Escuro"
          title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
          className="relative flex h-10 w-10 min-w-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-100 hover:text-school-blue-700 dark:border-school-dark-border dark:bg-school-dark-surface dark:text-school-gold-400 dark:hover:bg-school-dark-hover"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 transition-transform duration-200 rotate-0 hover:rotate-45" />
          ) : (
            <Moon className="h-4 w-4 transition-transform duration-200 -rotate-12 hover:rotate-0" />
          )}
        </button>

        {/* Botão de Sair / Deslogar do Sistema */}
        <button
          onClick={logout}
          aria-label="Sair do Sistema"
          title="Encerrar Sessão e Sair do Sistema"
          className="relative flex items-center gap-1.5 h-10 min-h-[40px] rounded-xl border border-rose-200/80 bg-rose-50/80 px-2.5 sm:px-3 text-xs font-bold text-rose-700 hover:bg-rose-100 hover:border-rose-300 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 shadow-sm transition-all active:scale-95"
        >
          <LogOut className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>

      {/* Modal de Alteração de Senha */}
      <ModalAlterarSenha
        isOpen={modalSenhaAberto}
        onClose={() => setModalSenhaAberto(false)}
      />
    </header>
  );
}
