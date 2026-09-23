'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { KeyRound, ShieldAlert, CheckCircle2, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { formatarCPF } from '@/lib/validations';

export function MustChangePasswordModal() {
  const { currentUser, changePassword } = useApp();
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  // Apenas renderiza se houver usuário e ele estiver marcado para troca de senha
  if (!currentUser || !currentUser.must_change_password) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const cpfLimpo = currentUser.cpf.replace(/\D/g, '');

    if (novaSenha.length < 6) {
      setErro('A nova senha deve possuir no mínimo 6 caracteres.');
      return;
    }

    if (novaSenha === cpfLimpo) {
      setErro('A nova senha não pode ser igual ao seu CPF.');
      return;
    }

    if (novaSenha !== confirmacaoSenha) {
      setErro('A confirmação de senha não coincide com a nova senha digitada.');
      return;
    }

    // Salva nova senha e desativa flag de obrigatoriedade
    changePassword(currentUser.id, novaSenha);
    setSucesso(true);
    setTimeout(() => {
      setSucesso(false);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-school-gold-400">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-amber-900 dark:bg-amber-950 dark:text-school-gold-300">
              <ShieldAlert className="h-3 w-3" />
              Primeiro Acesso Obrigatório
            </span>
            <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              Redefinição de Senha
            </h2>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Usuário: <span className="font-bold text-slate-900 dark:text-white">{currentUser.name}</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            CPF (Login): <span className="font-mono font-medium">{formatarCPF(currentUser.cpf)}</span>
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400 font-medium">
            Por motivos de segurança e política institucional, você deve substituir a senha inicial padrão por uma senha pessoal antes de navegar na plataforma.
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
            <span>Senha atualizada com sucesso! Carregando sistema...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Nova Senha Pessoal
            </label>
            <div className="relative mt-1">
              <input
                type={mostrarSenha ? 'text' : 'password'}
                required
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
            <span className="mt-1 block text-[10px] text-slate-400">
              Não utilize o seu CPF ou sequências óbvias (ex: 123456).
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Confirmar Nova Senha
            </label>
            <input
              type={mostrarSenha ? 'text' : 'password'}
              required
              value={confirmacaoSenha}
              onChange={(e) => setConfirmacaoSenha(e.target.value)}
              placeholder="Digite a nova senha novamente"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-school-blue-600 focus:outline-none focus:ring-2 focus:ring-school-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <button
            type="submit"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-school-blue-800 px-4 py-3 text-sm font-bold text-white shadow-md shadow-school-blue-800/20 hover:bg-school-blue-700 active:scale-[0.99] transition-all dark:bg-school-blue-700 dark:hover:bg-school-blue-600"
          >
            <Lock className="h-4 w-4 text-school-gold-400" />
            <span>Salvar Nova Senha & Acessar</span>
          </button>
        </form>
      </div>
    </div>
  );
}
