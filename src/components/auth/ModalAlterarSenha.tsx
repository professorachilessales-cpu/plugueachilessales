'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { KeyRound, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, X, Loader2 } from 'lucide-react';
import { formatarCPF } from '@/lib/validations';

interface ModalAlterarSenhaProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ModalAlterarSenha({ isOpen, onClose }: ModalAlterarSenhaProps) {
  const { currentUser, changePassword } = useApp();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('');
  const [mostrarSenhaAtual, setMostrarSenhaAtual] = useState(false);
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!senhaAtual.trim()) {
      setErro('Informe sua senha atual.');
      return;
    }

    if (novaSenha.length < 6) {
      setErro('A nova senha deve possuir no mínimo 6 caracteres.');
      return;
    }

    if (novaSenha !== confirmacaoSenha) {
      setErro('A confirmação de senha não coincide com a nova senha digitada.');
      return;
    }

    const cpfLimpo = (currentUser.cpf || '').replace(/\D/g, '');
    if (novaSenha === cpfLimpo) {
      setErro('A nova senha não pode ser idêntica ao seu CPF.');
      return;
    }

    setCarregando(true);

    try {
      const res = await fetch('/api/auth/alterar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: senhaAtual,
          newPassword: novaSenha,
          confirmPassword: confirmacaoSenha,
          userId: currentUser.id,
          cpf: currentUser.cpf,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao alterar senha.');
      }

      // Sincroniza localmente no contexto
      changePassword(currentUser.id, novaSenha);
      setSucesso(true);

      setTimeout(() => {
        setSucesso(false);
        setSenhaAtual('');
        setNovaSenha('');
        setConfirmacaoSenha('');
        onClose();
      }, 1400);
    } catch (err: any) {
      setErro(err.message || 'Falha ao processar a troca de senha.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in-0 duration-150">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-school-blue-50 text-school-blue-700 dark:bg-school-blue-950/60 dark:text-school-gold-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Alterar Senha de Acesso
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {currentUser.name} • CPF: {formatarCPF(currentUser.cpf || '')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {sucesso ? (
          <div className="py-8 text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
              Senha Alterada com Sucesso!
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Suas novas credenciais foram registradas de forma segura.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
            {erro && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900/60">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            {/* Senha Atual */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Senha Atual
              </label>
              <div className="relative">
                <input
                  type={mostrarSenhaAtual ? 'text' : 'password'}
                  required
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  placeholder="Digite sua senha atual ou CPF inicial"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-school-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-school-gold-400 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenhaAtual(!mostrarSenhaAtual)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {mostrarSenhaAtual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Nova Senha */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nova Senha (Mínimo de 6 caracteres)
              </label>
              <div className="relative">
                <input
                  type={mostrarNovaSenha ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Digite ao menos 6 caracteres"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-school-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-school-gold-400 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarNovaSenha(!mostrarNovaSenha)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {mostrarNovaSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirmação da Nova Senha */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirmar Nova Senha
              </label>
              <input
                type={mostrarNovaSenha ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmacaoSenha}
                onChange={(e) => setConfirmacaoSenha(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-school-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-school-gold-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={carregando}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={carregando}
                className="inline-flex items-center gap-1.5 rounded-xl bg-school-blue-800 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-school-blue-700 dark:bg-school-blue-700 dark:hover:bg-school-blue-600 transition-colors disabled:opacity-50"
              >
                {carregando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>Salvar Nova Senha</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
