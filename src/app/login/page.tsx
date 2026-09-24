'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { 
  GraduationCap, 
  Lock, 
  User, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  ShieldAlert,
  Eye,
  EyeOff,
  School
} from 'lucide-react';
import { formatarCPF } from '@/lib/validations';

export default function LoginPage() {
  const router = useRouter();
  const { setCurrentUser, setRole, escolaConfig } = useApp();

  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [bloqueadoSegundos, setBloqueadoSegundos] = useState<number | null>(null);

  // Preenchimento rápido para demonstração / testes
  const preencherCredenciais = (tipo: 'admin' | 'direcao' | 'professor') => {
    setErro(null);
    if (tipo === 'admin') {
      setCpf('012.345.678-90');
      setPassword('plugue2026');
    } else if (tipo === 'direcao') {
      setCpf('111.111.111-11');
      setPassword('direcao123');
    } else {
      setCpf('529.481.630-45');
      setPassword('52948163045');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpf,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setBloqueadoSegundos(900); // 15 minutos de bloqueio
        }
        throw new Error(data.error || 'Credenciais inválidas. Verifique seu CPF e senha.');
      }

      // Sucesso na autenticação: sincroniza contexto global
      if (data.user) {
        setCurrentUser({
          id: data.user.id,
          nome: data.user.name,
          email: data.user.email,
          role: data.user.role,
          cpf: data.user.cpf,
        });
        setRole(data.user.role);
      }

      router.push('/');
    } catch (err: any) {
      setErro(err.message || 'Erro ao realizar login.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-school-blue-950 to-slate-950 text-slate-100">
      <div className="relative w-full max-w-md">
        {/* Glow de fundo */}
        <div className="absolute -top-12 -left-12 h-64 w-64 rounded-full bg-school-gold-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 h-64 w-64 rounded-full bg-school-blue-500/10 blur-3xl pointer-events-none" />

        {/* Card de Login */}
        <div className="relative rounded-3xl border border-white/10 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          {/* Logo e Título */}
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-school-gold-500 to-amber-300 text-slate-950 shadow-lg shadow-school-gold-500/20">
              <School className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              <span>PLUGUE</span>
              <span className="rounded-full bg-school-gold-400/20 px-2 py-0.5 text-[10px] font-extrabold text-school-gold-300 border border-school-gold-400/30">
                OS
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Plataforma Unificada de Gestão Educacional
            </p>
            <p className="text-[11px] font-semibold text-school-gold-400/90">
              {escolaConfig?.nome_escola || 'Colégio Integrado PLUGUE'}
            </p>
          </div>

          {/* Feedback de Erro ou Bloqueio Anti-Brute-Force */}
          {erro && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-rose-500/10 p-3.5 text-xs text-rose-300 border border-rose-500/30 animate-in fade-in">
              <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block">Falha de Autenticação:</span>
                <span>{erro}</span>
              </div>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            {/* Campo CPF */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                CPF do Usuário
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatarCPF(e.target.value))}
                  maxLength={14}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-xs text-white placeholder-slate-500 font-mono focus:border-school-gold-400 focus:outline-none focus:ring-1 focus:ring-school-gold-400/50 transition-all"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Senha
                </label>
                <span className="text-[10px] text-slate-400">
                  Padrão docente: 11 dígitos do CPF
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-10 text-xs text-white placeholder-slate-500 focus:border-school-gold-400 focus:outline-none focus:ring-1 focus:ring-school-gold-400/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-white"
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Botão de Entrar */}
            <button
              type="submit"
              disabled={carregando || Boolean(bloqueadoSegundos)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-school-gold-500 via-amber-400 to-school-gold-500 py-3 text-xs font-black text-slate-950 uppercase tracking-wider shadow-lg shadow-school-gold-500/20 hover:from-amber-400 hover:to-school-gold-400 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              <span>{carregando ? 'Autenticando...' : 'Entrar no Sistema'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Atalhos Rápidos para Demonstração */}
          <div className="pt-4 border-t border-white/10 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block text-center">
              Acesso Rápido de Teste (Preenchimento com 1 Clique):
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => preencherCredenciais('admin')}
                className="rounded-xl border border-white/10 bg-white/5 py-2 px-2 text-[10px] font-bold text-slate-300 hover:bg-white/10 transition-colors"
              >
                🛠️ Admin
              </button>
              <button
                type="button"
                onClick={() => preencherCredenciais('direcao')}
                className="rounded-xl border border-white/10 bg-white/5 py-2 px-2 text-[10px] font-bold text-slate-300 hover:bg-white/10 transition-colors"
              >
                🏫 Direção
              </button>
              <button
                type="button"
                onClick={() => preencherCredenciais('professor')}
                className="rounded-xl border border-white/10 bg-white/5 py-2 px-2 text-[10px] font-bold text-slate-300 hover:bg-white/10 transition-colors"
              >
                👨‍🏫 Professor
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
