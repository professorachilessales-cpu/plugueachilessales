'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { KeyRound, ShieldAlert, CheckCircle2, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { formatarCPF, validarNovaSenha } from '@/lib/validations';

export function MustChangePasswordModal() {
  const router = useRouter();
  const { 
    currentUser, 
    professores, 
    changePassword, 
    updateProfessor, 
    setCurrentUser,
    setAuthenticatedUser,
    isAuthenticated, 
    isInitialized 
  } = useApp();

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [fechado, setFechado] = useState(false);

  // Localiza o cadastro do professor correspondente se houver
  const profCadastrado = useMemo(() => {
    if (!currentUser) return null;
    return professores.find(p => {
      if (!p) return false;
      if (currentUser.id && p.id === currentUser.id) return true;
      const c1 = currentUser.cpf?.replace(/\D/g, '');
      const c2 = p.cpf?.replace(/\D/g, '');
      return Boolean(c1 && c2 && c1 === c2);
    });
  }, [professores, currentUser]);

  // Gatilho de Bloqueio Estrito:
  // Se precisa_trocar_senha = true no cadastro de professores ou no usuário autenticado
  const precisaTrocarSenha = useMemo(() => {
    if (!isInitialized || !isAuthenticated || !currentUser || fechado) {
      return false;
    }

    const flagUser = Boolean(
      currentUser.precisa_trocar_senha === true ||
      (currentUser as any).precisa_trocar_senha === 1 ||
      (currentUser as any).precisa_trocar_senha === '1' ||
      currentUser.must_change_password === true ||
      (currentUser as any).must_change_password === 1 ||
      (currentUser as any).must_change_password === '1'
    );

    const flagProf = Boolean(
      profCadastrado?.precisa_trocar_senha === true ||
      (profCadastrado as any)?.precisa_trocar_senha === 1 ||
      (profCadastrado as any)?.precisa_trocar_senha === '1'
    );

    return flagUser || flagProf;
  }, [isInitialized, isAuthenticated, currentUser, profCadastrado, fechado]);

  // Intercepta e desabilita tecla Escape
  useEffect(() => {
    if (!precisaTrocarSenha) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [precisaTrocarSenha]);

  // Bloqueio Total: se não precisa trocar, não renderiza nada
  if (!precisaTrocarSenha || !currentUser) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    // 1. Regras Estritas de Validação da Nova Senha
    const validacao = validarNovaSenha(novaSenha, currentUser.cpf);
    if (!validacao.valida) {
      setErro(validacao.erro || 'A nova senha não atende aos requisitos mínimos.');
      return;
    }

    // Validação de confirmação
    if (novaSenha !== confirmacaoSenha) {
      setErro('A confirmação de senha não coincide com a nova senha digitada.');
      return;
    }

    setSalvando(true);

    try {
      // 2. Envio ao backend com criptografia (bcrypt/pbkdf2) e atualização no banco
      const res = await fetch('/api/auth/alterar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          cpf: currentUser.cpf,
          newPassword: novaSenha,
          confirmPassword: confirmacaoSenha,
          isFirstAccess: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao salvar a nova senha no servidor.');
      }

      // 3. Atualiza estado global e limpa flags de troca de senha
      changePassword(currentUser.id, novaSenha);

      const userAtualizado = {
        ...currentUser,
        must_change_password: false,
        precisa_trocar_senha: false,
      };

      setCurrentUser(userAtualizado);
      if (typeof setAuthenticatedUser === 'function') {
        setAuthenticatedUser(userAtualizado);
      }

      if (profCadastrado?.id) {
        updateProfessor(profCadastrado.id, {
          precisa_trocar_senha: false,
        });
      }

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`plugue_pwd_changed_${currentUser.id}`, 'true');
          const sessAuth = sessionStorage.getItem('plugue_auth_user');
          if (sessAuth) {
            const p = JSON.parse(sessAuth);
            sessionStorage.setItem('plugue_auth_user', JSON.stringify({ ...p, must_change_password: false, precisa_trocar_senha: false }));
          }
          const sessUser = sessionStorage.getItem('plugue_session_user');
          if (sessUser) {
            const p = JSON.parse(sessUser);
            sessionStorage.setItem('plugue_session_user', JSON.stringify({ ...p, must_change_password: false, precisa_trocar_senha: false }));
          }
        } catch {}
      }

      setSucesso(true);

      // Desbloqueia a interface e redireciona para o Dashboard do usuário
      setTimeout(() => {
        setSucesso(false);
        setFechado(true);
        const destino = currentUser.funcao_tipo === 'GERAL' ? '/fotograma' : '/dashboard';
        router.replace(destino);
      }, 1200);
    } catch (err: any) {
      setErro(err.message || 'Erro ao redefinir a senha.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md select-none"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="w-full max-w-md rounded-3xl border border-slate-700/80 bg-white p-6 sm:p-7 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-0 zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-school-gold-400">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-amber-900 dark:bg-amber-950 dark:text-school-gold-300">
              <ShieldAlert className="h-3 w-3" />
              Primeiro Acesso Obrigatório
            </span>
            <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              Troca Obrigatória de Senha
            </h2>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Docente/Colaborador: <span className="font-bold text-slate-900 dark:text-white">{currentUser.name}</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            CPF (Login): <span className="font-mono font-medium">{formatarCPF(currentUser.cpf)}</span>
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300 font-medium">
            Por política institucional de segurança, seu acesso inicial está bloqueado até a substituição da senha padrão por uma senha pessoal segura.
          </p>
        </div>

        {erro && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {sucesso && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span>Senha atualizada com sucesso! Redirecionando para o Dashboard...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Nova Senha Pessoal *
            </label>
            <div className="relative mt-1">
              <input
                type={mostrarSenha ? 'text' : 'password'}
                required
                disabled={salvando}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-school-blue-600 focus:outline-none focus:ring-2 focus:ring-school-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <ul className="mt-1.5 space-y-0.5 text-[10px] text-slate-500 dark:text-slate-400">
              <li>• Mínimo de 6 dígitos/caracteres</li>
              <li>• Não pode ser o seu CPF</li>
              <li>• Não pode conter 3 dígitos repetidos (ex: 111) ou em sequência (ex: 123, 321)</li>
            </ul>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Confirmar Nova Senha *
            </label>
            <input
              type={mostrarSenha ? 'text' : 'password'}
              required
              disabled={salvando}
              value={confirmacaoSenha}
              onChange={(e) => setConfirmacaoSenha(e.target.value)}
              placeholder="Digite a nova senha novamente"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-school-blue-600 focus:outline-none focus:ring-2 focus:ring-school-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={salvando || !novaSenha || !confirmacaoSenha}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-school-blue-800 px-4 py-3 text-sm font-bold text-white shadow-md shadow-school-blue-800/20 hover:bg-school-blue-700 active:scale-[0.99] disabled:opacity-50 transition-all dark:bg-school-blue-700 dark:hover:bg-school-blue-600"
          >
            {salvando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-school-gold-400" />
                <span>Criptografando & Salvando...</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 text-school-gold-400" />
                <span>Salvar Nova Senha & Acessar</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

