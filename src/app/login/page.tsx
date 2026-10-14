'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { 
  Lock, 
  User, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff,
  Sun,
  Moon,
  KeyRound,
  Loader2,
  X
} from 'lucide-react';
import { formatarCPF, validarCPF } from '@/lib/validations';
import LoginVisualShowcase from '@/components/auth/LoginVisualShowcase';

export default function LoginPage() {
  const router = useRouter();
  const { setCurrentUser, setRole, setAuthenticatedUser, escolaConfig, theme, toggleTheme } = useApp();

  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [manterConectado, setManterConectado] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  
  // Rate limiting e segurança no frontend
  const [tentativasFalhas, setTentativasFalhas] = useState(0);
  const [bloqueadoSegundos, setBloqueadoSegundos] = useState<number | null>(null);

  // Modal institucional "Esqueci minha senha"
  const [modalEsqueciSenha, setModalEsqueciSenha] = useState(false);

  // Timer para bloqueio temporário por rate limiting
  useEffect(() => {
    if (bloqueadoSegundos === null || bloqueadoSegundos <= 0) return;

    const timer = setInterval(() => {
      setBloqueadoSegundos((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [bloqueadoSegundos]);

  // Validação em tempo real do CPF (máscara completa de 14 caracteres)
  const statusCpf = useMemo(() => {
    const limpo = cpf.replace(/\D/g, '');
    if (!limpo) return { estado: 'vazio', mensagem: '' };
    if (limpo.length < 11) {
      return { estado: 'digitando', mensagem: `Restam ${11 - limpo.length} dígitos` };
    }
    // Suporte especial para admin de desenvolvimento "00000000000" ou validação oficial
    const valido = limpo === '00000000000' || validarCPF(cpf);
    if (valido) {
      return { estado: 'valido', mensagem: 'CPF com formato e dígitos válidos' };
    }
    return { estado: 'invalido', mensagem: 'Dígitos verificadores do CPF inválidos' };
  }, [cpf]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bloqueadoSegundos) return;

    setErro(null);

    // Validação estrita de CPF antes do envio
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11 || (cpfLimpo !== '00000000000' && !validarCPF(cpf))) {
      setErro('Por favor, informe um CPF válido com todos os 11 dígitos verificadores.');
      return;
    }

    if (!password.trim()) {
      setErro('Informe sua senha de acesso.');
      return;
    }

    setCarregando(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpf: cpfLimpo,
          password: password.trim(),
          rememberMe: manterConectado,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const novasTentativas = tentativasFalhas + 1;
        setTentativasFalhas(novasTentativas);

        // Bloqueio temporário no frontend caso atinja 5 tentativas ou resposta 429
        if (res.status === 429 || novasTentativas >= 5) {
          setBloqueadoSegundos(60); // 60 segundos de bloqueio preventivo
          setTentativasFalhas(0);
          throw new Error('Muitas tentativas consecutivas inválidas. Acesso temporariamente bloqueado por 60 segundos.');
        }

        // Mensagem de erro genérica por segurança (sem detalhar se foi CPF ou senha)
        throw new Error(data.error || 'Credenciais inválidas. Verifique seu CPF e senha.');
      }

      // Sucesso na autenticação: sincroniza contexto global e redireciona
      if (data.user) {
        const precisaTrocarSenha = Boolean(
          Number(data.user.precisa_trocar_senha) === 1 ||
          data.user.precisa_trocar_senha === true ||
          data.user.precisa_trocar_senha === '1' ||
          Number(data.user.must_change_password) === 1 ||
          data.user.must_change_password === true ||
          data.user.must_change_password === '1'
        );

        if (precisaTrocarSenha && typeof window !== 'undefined') {
          try {
            localStorage.removeItem(`plugue_pwd_changed_${data.user.id}`);
          } catch {}
        }

        const fullUser = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email || '',
          role: data.user.role,
          cpf: data.user.cpf,
          password_hash: '',
          funcao_tipo: data.user.funcao_tipo || 'PROFESSOR',
          is_admin: Boolean(data.user.is_admin),
          allowed_modules: data.user.funcao_tipo === 'GERAL' ? ['FOTOGRAMA', 'CALENDARIO'] : (data.user.allowed_modules || ['PROFILE', 'FOTOGRAMA', 'CALENDARIO']),
          must_change_password: precisaTrocarSenha,
          precisa_trocar_senha: precisaTrocarSenha,
          is_active: true,
          created_at: new Date().toISOString(),
        };
        try {
          sessionStorage.setItem('plugue_auth_user', JSON.stringify(fullUser));
          sessionStorage.setItem('plugue_session_user', JSON.stringify(fullUser));
          sessionStorage.setItem('plugue_session_active', 'true');
          localStorage.setItem('plugue_auth_user', JSON.stringify(fullUser));
          localStorage.setItem('plugue_session_user', JSON.stringify(fullUser));
          localStorage.setItem('plugue_session_active', 'true');
          localStorage.setItem('school_os_current_user_id', fullUser.id);
          localStorage.setItem('school_os_role', fullUser.role);
        } catch {}
        if (typeof setAuthenticatedUser === 'function') {
          setAuthenticatedUser(fullUser);
        }
        setCurrentUser(fullUser);
        setRole(data.user.role);
      }

      // Salva preferência no storage se solicitado
      if (manterConectado) {
        try {
          localStorage.setItem('plugue_lembrar_usuario', 'true');
        } catch {
          // ignora em modo privado
        }
      }

      // Rota inicial obrigatória: GERAL vai para /fotograma, demais para /dashboard
      if (data.user?.funcao_tipo === 'GERAL') {
        router.push('/fotograma');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setErro(err.message || 'Credenciais inválidas. Verifique seu CPF e senha.');
    } finally {
      setCarregando(false);
    }
  };

  const citacaoAtual = INSPIRING_QUOTES[citacaoIndex];

  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-school-gold-500 selection:text-slate-950 overflow-x-hidden relative">
      
      {/* ========================================================================= */}
      {/* 1. PAINEL VISUAL / DESTAQUE COM ANIMAÇÕES DE IMPACTO (APENAS COMPUTADOR) */}
      {/* ========================================================================= */}
      <LoginVisualShowcase 
        nomeEscola={escolaConfig?.nome_escola} 
        theme={theme} 
      />

      {/* ========================================================================= */}
      {/* 2. PAINEL DE FORMULÁRIO DE AUTENTICAÇÃO E SEGURANÇA                       */}
      {/* ========================================================================= */}
      <section 
        className="relative w-full lg:w-[48%] xl:w-[45%] flex flex-col justify-center items-center px-4 pb-4 pt-20 sm:px-8 sm:pb-8 sm:pt-20 lg:p-12 xl:p-16 min-h-screen lg:min-h-[640px] bg-slate-100/60 dark:bg-slate-900/60 lg:bg-transparent"
        aria-label="Formulário de acesso institucional"
      >
        {/* Glow de fundo exclusivo do formulário */}
        <div className="absolute top-1/4 -right-16 h-80 w-80 rounded-full bg-school-gold-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 h-72 w-72 rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />

        {/* Seletor de Modo Claro / Escuro no Canto Superior */}
        <div className="absolute top-4 right-4 z-20 lg:relative lg:top-auto lg:right-auto lg:w-full lg:max-w-md lg:flex lg:justify-end lg:mb-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all backdrop-blur-md shadow-sm"
            aria-label={`Alternar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300" />
                <span className="text-[11px] font-medium">Modo Claro</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-blue-300" />
                <span className="text-[11px] font-medium">Modo Escuro</span>
              </>
            )}
          </button>
        </div>

        {/* Identidade Institucional Exclusiva da Versão MOBILE:
            Apenas o Título do PLUGUE e o Nome da Escola */}
        <div className="lg:hidden w-full max-w-md text-center mb-5 space-y-2.5">
          <div className="inline-flex items-center justify-center gap-3">
            <div className="relative h-12 w-12 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-school-gold-400/40 p-1.5 shadow-xl shadow-school-gold-500/10 flex items-center justify-center backdrop-blur-md">
              <Image 
                src="/logo-plugue.png" 
                alt="Logo PLUGUE" 
                width={44} 
                height={44} 
                className="object-contain drop-shadow-md rounded-xl"
                priority
              />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  PLUGUE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Plataforma Unificada de Gestão Educacional
              </p>
            </div>
          </div>

          {/* Nome da Escola */}
          <div className="pt-0.5">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white text-balance leading-snug drop-shadow-sm px-2">
              {escolaConfig?.nome_escola || 'Escola Técnica Estadual Professor Achiles Sales'}
            </h1>
          </div>
        </div>

        {/* Card Moderno com Acabamento Clean, Glassmorphism e Animação de Entrada */}
        <div className="relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-white/15 bg-white/90 dark:bg-slate-900/80 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl space-y-6 lg:animate-entrance-hero">
          
          {/* Cabeçalho do Card */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-school-gold-700 dark:text-school-gold-400 bg-school-gold-500/10 px-2.5 py-1 rounded-full border border-school-gold-400/20">
                <ShieldCheck className="h-3 w-3" /> Acesso Seguro
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                SSL / TLS 256-bit
              </span>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Entrar no Sistema
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Digite seu CPF cadastrado e sua senha institucional para acessar o painel docente ou administrativo.
            </p>
          </div>

          {/* Alerta de Bloqueio por Tentativas Excessivas (Rate Limiting Visual) */}
          {bloqueadoSegundos !== null && bloqueadoSegundos > 0 && (
            <div 
              role="alert" 
              className="flex items-start gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-700 dark:text-amber-300 animate-in fade-in"
            >
              <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block text-amber-800 dark:text-amber-200">
                  Proteção Contra Força Bruta Ativa
                </span>
                <p className="text-[11px] text-amber-700/90 dark:text-amber-300/90 leading-relaxed">
                  Muitas tentativas sem sucesso. Por segurança institucional, novas requisições estão pausadas temporariamente.
                </p>
                <div className="flex items-center gap-2 pt-1 font-mono font-bold text-amber-800 dark:text-amber-200">
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                  Liberando em: {bloqueadoSegundos}s
                </div>
              </div>
            </div>
          )}

          {/* Feedback de Erro Genérico (Sem expor se o erro é no CPF ou senha) */}
          {erro && !bloqueadoSegundos && (
            <div 
              role="alert" 
              className="flex items-start gap-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in"
            >
              <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block text-rose-800 dark:text-rose-200">Falha de Autenticação:</span>
                <p className="text-[11px] text-rose-700/90 dark:text-rose-300/90">{erro}</p>
              </div>
            </div>
          )}

          {/* Formulário de Autenticação */}
          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            
            {/* Campo Identificador: CPF */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label 
                  htmlFor="cpf" 
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                >
                  CPF do Usuário <span className="text-school-gold-700 dark:text-school-gold-400">*</span>
                </label>
                {/* Indicador de Validação do CPF */}
                {statusCpf.estado === 'valido' && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold animate-in fade-in">
                    <CheckCircle2 className="h-3 w-3" /> CPF Válido
                  </span>
                )}
                {statusCpf.estado === 'invalido' && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-semibold animate-in fade-in">
                    <AlertCircle className="h-3 w-3" /> Dígitos Inválidos
                  </span>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500 dark:text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="cpf"
                  name="cpf"
                  type="text"
                  inputMode="numeric"
                  autoComplete="username"
                  required
                  placeholder="000.000.000-00"
                  value={cpf}
                  disabled={carregando || Boolean(bloqueadoSegundos)}
                  onChange={(e) => setCpf(formatarCPF(e.target.value))}
                  maxLength={14}
                  aria-invalid={statusCpf.estado === 'invalido'}
                  aria-describedby="cpf-help"
                  className={`w-full rounded-xl border bg-slate-100 dark:bg-white/5 py-3 !pl-11 !pr-10 input-icon-left text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 transition-all ${
                    statusCpf.estado === 'valido'
                      ? 'border-emerald-500/50 focus:border-emerald-400 focus:ring-emerald-400/20'
                      : statusCpf.estado === 'invalido'
                      ? 'border-rose-500/50 focus:border-rose-400 focus:ring-rose-400/20'
                      : 'border-slate-200 dark:border-white/10 focus:border-school-gold-400 focus:ring-school-gold-400/30'
                  }`}
                />

                {/* Ícone de feedback visual no final do input */}
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  {statusCpf.estado === 'valido' && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                  )}
                  {statusCpf.estado === 'invalido' && (
                    <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  )}
                </div>
              </div>
              <p id="cpf-help" className="sr-only">
                Digite seu CPF completo com 11 dígitos para autenticação no sistema.
              </p>
            </div>

            {/* Campo Senha com Toggle de Visualização */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label 
                  htmlFor="password" 
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                >
                  Senha de Acesso <span className="text-school-gold-700 dark:text-school-gold-400">*</span>
                </label>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Docente: 11 dígitos do CPF
                </span>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500 dark:text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={mostrarSenha ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  disabled={carregando || Boolean(bloqueadoSegundos)}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 py-3 !pl-11 !pr-11 input-icon-left text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:border-school-gold-400 focus:outline-none focus:ring-2 focus:ring-school-gold-400/30 transition-all"
                />
                
                {/* Botão de Toggle da Senha */}
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  tabIndex={0}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white focus:outline-none focus:text-slate-900 dark:focus:text-white transition-colors"
                  aria-label={mostrarSenha ? "Ocultar senha digitada" : "Exibir senha digitada"}
                >
                  {mostrarSenha ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Opções: Manter Conectado & Apenas "Esqueci minha senha" */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={manterConectado}
                  onChange={(e) => setManterConectado(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-white/5 text-school-gold-500 focus:ring-school-gold-400/50 focus:ring-offset-0 focus:ring-1 cursor-pointer accent-school-gold-500"
                />
                <span>Manter conectado</span>
              </label>

              {/* Link de apoio: estritamente "Esqueci minha senha" (sem links de suporte) */}
              <button
                type="button"
                onClick={() => setModalEsqueciSenha(true)}
                className="text-xs font-semibold text-school-gold-700 dark:text-school-gold-400 hover:text-school-gold-700 dark:hover:text-school-gold-300 hover:underline focus:outline-none transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>

            {/* Botão de Submissão: Entrar no Sistema */}
            <button
              type="submit"
              disabled={carregando || Boolean(bloqueadoSegundos) || (cpf.length === 14 && statusCpf.estado === 'invalido')}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-school-gold-500 via-amber-400 to-school-gold-500 py-3.5 text-xs sm:text-sm font-black text-slate-950 uppercase tracking-wider shadow-lg shadow-school-gold-500/25 hover:from-amber-400 hover:to-school-gold-400 active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {carregando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Autenticando com segurança...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. MODAL INSTITUCIONAL: ESQUECI MINHA SENHA                              */}
      {/* ========================================================================= */}
      {modalEsqueciSenha && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-recuperacao-titulo"
        >
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-5">
            {/* Botão de Fechar */}
            <button
              type="button"
              onClick={() => setModalEsqueciSenha(false)}
              className="absolute top-5 right-5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg p-1 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
              aria-label="Fechar janela de instruções"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Cabeçalho do Modal */}
            <div className="space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-school-gold-500/20 text-school-gold-700 dark:text-school-gold-300 border border-school-gold-400/30">
                <KeyRound className="h-6 w-6" />
              </div>
              <h3 id="modal-recuperacao-titulo" className="text-xl font-bold text-slate-900 dark:text-white">
                Redefinição de Senha
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Por diretrizes de segurança institucional e conformidade com a LGPD, a redefinição de acesso é realizada mediante validação de identidade junto à gestão escolar.
              </p>
            </div>

            {/* Orientações Práticas */}
            <div className="space-y-3 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 p-4 text-xs text-slate-700 dark:text-slate-300">
              <div className="space-y-1">
                <span className="font-bold text-school-gold-700 dark:text-school-gold-300 block">
                  👨‍🏫 Professores e Docentes:
                </span>
                <p className="text-[11px] text-slate-700/90 dark:text-slate-300/90 leading-relaxed">
                  A sua senha padrão inicial corresponde aos <strong>11 dígitos do seu CPF</strong> (apenas números, sem pontos ou traço).
                </p>
              </div>

              <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-white/10">
                <span className="font-bold text-school-gold-700 dark:text-school-gold-300 block">
                  🏫 Secretaria Escolar e Coordenação:
                </span>
                <p className="text-[11px] text-slate-700/90 dark:text-slate-300/90 leading-relaxed">
                  Caso tenha alterado a senha e a tenha esquecido, dirija-se à <strong>Coordenação Pedagógica</strong> ou à <strong>Secretaria da sua Unidade Escolar</strong> para solicitar a restauração do seu acesso com confirmação documental.
                </p>
              </div>
            </div>

            {/* Ação de Conclusão */}
            <button
              type="button"
              onClick={() => setModalEsqueciSenha(false)}
              className="w-full rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 border border-slate-200 dark:border-white/15 py-3 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider transition-colors"
            >
              Compreendido, Voltar ao Login
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
