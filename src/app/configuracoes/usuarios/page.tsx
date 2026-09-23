'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  Users,
  ShieldCheck,
  GraduationCap,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Edit2,
  KeyRound,
  Lock,
  ArrowLeft,
  Settings,
  AlertTriangle,
  Check,
  Eye,
  Info,
  Sliders,
} from 'lucide-react';
import { SystemUser, UserRole, AllowedModule } from '@/lib/types';
import { formatarCPF, validarCPF } from '@/lib/validations';

const MODULOS_PROFESSOR: { id: AllowedModule; label: string; locked?: boolean; desc: string }[] = [
  {
    id: 'PROFILE',
    label: 'Perfil & Dados Pessoais',
    locked: true,
    desc: 'Visualização da ficha funcional e dados cadastrais (Obrigatório / Sempre ativo)',
  },
  {
    id: 'FOTOGRAMA',
    label: 'Fotograma',
    locked: false,
    desc: 'Mural visual com fotos dos alunos, alertas de saúde/AEE e WhatsApp (Padrão ativo, revogável)',
  },
  {
    id: 'CALENDARIO',
    label: 'Calendário',
    locked: false,
    desc: 'Visualização do calendário letivo, reuniões pedagógicas e feriados (Padrão ativo, revogável)',
  },
];

export default function UsuariosPermissoesPage() {
  const {
    role,
    users,
    addUser,
    updateUser,
    resetUserPassword,
    setCurrentUser,
    currentUser,
  } = useApp();

  const [busca, setBusca] = useState('');
  const [filtroRole, setFiltroRole] = useState<'todos' | 'admin' | 'professor'>('todos');
  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<SystemUser | null>(null);

  // Estados do Formulário de Usuário
  const [formNome, setFormNome] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCpf, setFormCpf] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('professor');
  const [formModulos, setFormModulos] = useState<AllowedModule[]>(['PROFILE', 'FOTOGRAMA', 'CALENDARIO']);
  const [formAtivo, setFormAtivo] = useState(true);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  // Apenas Administradores podem acessar esta página
  if (role !== 'admin') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
          <Lock className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
          Acesso Restrito à Administração
        </h1>
        <p className="mt-1 text-xs text-slate-500 max-w-sm">
          Apenas administradores possuem autorização para gerenciar as credenciais e matriz de permissões.
        </p>
        <Link
          href="/"
          className="mt-4 rounded-xl bg-school-blue-800 px-4 py-2 text-xs font-bold text-white hover:bg-school-blue-700"
        >
          Voltar ao Início
        </Link>
      </div>
    );
  }

  // Filtragem da lista de usuários
  const usuariosFiltrados = users.filter((u) => {
    const q = busca.toLowerCase();
    const matchBusca =
      u.name.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      u.cpf.includes(q.replace(/\D/g, ''));

    const matchRole = filtroRole === 'todos' || u.role === filtroRole;
    return matchBusca && matchRole;
  });

  const abrirCriacao = () => {
    setUsuarioEditando(null);
    setFormNome('');
    setFormEmail('');
    setFormCpf('');
    setFormRole('professor');
    setFormModulos(['PROFILE', 'FOTOGRAMA', 'CALENDARIO']); // Padrão ativos
    setFormAtivo(true);
    setErroForm(null);
    setModalAberto(true);
  };

  const abrirEdicao = (u: SystemUser) => {
    setUsuarioEditando(u);
    setFormNome(u.name);
    setFormEmail(u.email || '');
    setFormCpf(formatarCPF(u.cpf));
    setFormRole(u.role);
    
    const modulosValidos: AllowedModule[] = ['PROFILE', 'FOTOGRAMA', 'CALENDARIO'];
    let mods = (u.allowed_modules || []).filter((m): m is AllowedModule => modulosValidos.includes(m as AllowedModule));
    if (!mods.includes('PROFILE')) {
      mods.unshift('PROFILE');
    }
    // Se o professor não tinha os novos módulos configurados (migração de legados), inicializar com padrões ativos
    if (u.role === 'professor' && !mods.includes('FOTOGRAMA') && !mods.includes('CALENDARIO') && mods.length === 1) {
      mods = ['PROFILE', 'FOTOGRAMA', 'CALENDARIO'];
    }
    setFormModulos(mods);
    setFormAtivo(u.is_active);
    setErroForm(null);
    setModalAberto(true);
  };

  const alternarModulo = (modId: AllowedModule) => {
    if (modId === 'PROFILE') return; // Bloqueado, sempre ativo (Obrigatório)
    setFormModulos((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  const salvarUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    setErroForm(null);

    const cpfLimpo = formCpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      setErroForm('O CPF deve conter exatamente 11 dígitos numéricos.');
      return;
    }

    if (!validarCPF(cpfLimpo)) {
      setErroForm('O CPF informado não é válido. Verifique os dígitos verificadores.');
      return;
    }

    // Verifica duplicação de CPF
    const cpfDuplicado = users.some(
      (u) => u.cpf === cpfLimpo && (!usuarioEditando || u.id !== usuarioEditando.id)
    );
    if (cpfDuplicado) {
      setErroForm('Já existe um usuário cadastrado com este mesmo CPF.');
      return;
    }

    if (usuarioEditando) {
      updateUser(usuarioEditando.id, {
        name: formNome,
        email: formEmail,
        cpf: cpfLimpo,
        role: formRole,
        allowed_modules: formRole === 'admin' ? ['PROFILE', 'FOTOGRAMA', 'CALENDARIO'] : formModulos,
        is_active: formAtivo,
      });
      setMensagemSucesso('Usuário e permissões atualizados com sucesso!');
    } else {
      addUser({
        name: formNome,
        email: formEmail,
        cpf: cpfLimpo,
        role: formRole,
        allowed_modules: formRole === 'admin' ? ['PROFILE', 'FOTOGRAMA', 'CALENDARIO'] : formModulos,
        is_active: formAtivo,
      });
      setMensagemSucesso(
        `Usuário cadastrado com sucesso! Login: ${cpfLimpo} | Senha inicial: ${cpfLimpo}`
      );
    }

    setModalAberto(false);
    setTimeout(() => setMensagemSucesso(null), 4000);
  };

  const handleResetarSenha = (u: SystemUser) => {
    if (
      window.confirm(
        `Deseja redefinir a senha do usuário ${u.name}? A senha será restaurada para o CPF padrão (${u.cpf}) e será exigida a troca de senha no primeiro login.`
      )
    ) {
      resetUserPassword(u.id);
      setMensagemSucesso(`Senha de ${u.name} restaurada para o CPF padrão com sucesso.`);
      setTimeout(() => setMensagemSucesso(null), 4000);
    }
  };

  const handleToggleAtivo = (u: SystemUser) => {
    updateUser(u.id, { is_active: !u.is_active });
  };

  return (
    <div className="space-y-6">
      {/* Top Header com Migalha de Pão */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/configuracoes"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-school-blue-600 dark:text-slate-400 dark:hover:text-school-gold-400 transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Configurações</span>
            </Link>
            <span className="text-slate-400">/</span>
            <span className="text-xs font-bold text-school-blue-700 dark:text-school-gold-400">
              Usuários & Permissões
            </span>
          </div>

          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl flex items-center gap-2.5">
            <ShieldCheck className="h-7 w-7 text-school-blue-600 dark:text-school-gold-400" />
            Gestão de Usuários e Permissões
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Controle de perfis, credenciais via CPF, primeiro acesso obrigatório e matriz de liberação de módulos.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/configuracoes"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all"
          >
            <Sliders className="h-4 w-4" />
            <span>Configurações Gerais</span>
          </Link>

          <button
            onClick={abrirCriacao}
            className="inline-flex items-center gap-2 rounded-xl bg-school-blue-800 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-school-blue-800/20 hover:bg-school-blue-700 active:scale-95 transition-all dark:bg-school-blue-700 dark:hover:bg-school-blue-600"
          >
            <Plus className="h-4 w-4 text-school-gold-400" />
            <span>Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* Alerta de Sucesso */}
      {mensagemSucesso && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 animate-in fade-in-0 duration-200">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{mensagemSucesso}</span>
        </div>
      )}

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Total de Usuários</span>
            <Users className="h-5 w-5 text-school-blue-600 dark:text-school-gold-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {users.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Administradores</span>
            <ShieldCheck className="h-5 w-5 text-school-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {users.filter((u) => u.role === 'admin').length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Professores</span>
            <GraduationCap className="h-5 w-5 text-amber-600 dark:text-school-gold-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {users.filter((u) => u.role === 'professor').length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">1º Acesso Pendente</span>
            <KeyRound className="h-5 w-5 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
            {users.filter((u) => u.must_change_password).length}
          </p>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou e-mail..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-school-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Perfil:</span>
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => setFiltroRole('todos')}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                filtroRole === 'todos'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltroRole('admin')}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                filtroRole === 'admin'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => setFiltroRole('professor')}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                filtroRole === 'professor'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Professores
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Usuário / Credencial</th>
                <th className="px-4 py-3.5">Perfil (Role)</th>
                <th className="px-4 py-3.5">Módulos Concedidos</th>
                <th className="px-4 py-3.5">Primeiro Acesso</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    Nenhum usuário encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl font-black text-sm ${
                              u.role === 'admin'
                                ? 'bg-school-blue-100 text-school-blue-800 dark:bg-school-blue-950 dark:text-school-blue-300'
                                : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-school-gold-300'
                            }`}
                          >
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {u.name}
                              </span>
                              {isCurrent && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  Você
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                              <span>CPF: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatarCPF(u.cpf)}</strong></span>
                              {u.email && (
                                <>
                                  <span>•</span>
                                  <span>{u.email}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            u.role === 'admin'
                              ? 'bg-school-blue-100 text-school-blue-800 dark:bg-school-blue-950 dark:text-school-blue-300'
                              : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-school-gold-300'
                          }`}
                        >
                          {u.role === 'admin' ? (
                            <>
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>Administrador</span>
                            </>
                          ) : (
                            <>
                              <GraduationCap className="h-3.5 w-3.5" />
                              <span>Professor</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            Acesso Total (Irrestrito)
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {u.allowed_modules?.map((mod) => {
                              const item = MODULOS_PROFESSOR.find((m) => m.id === mod);
                              if (!item) return null;
                              return (
                                <span
                                  key={mod}
                                  className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                                    mod === 'PROFILE'
                                      ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                      : 'bg-school-blue-50 text-school-blue-800 border border-school-blue-200/60 dark:bg-school-blue-950/50 dark:text-school-blue-300 dark:border-school-blue-900/40'
                                  }`}
                                >
                                  {mod === 'PROFILE' ? 'Perfil' : item.label}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        {u.must_change_password ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-extrabold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            <KeyRound className="h-3 w-3" />
                            Pendente (Senha = CPF)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <Check className="h-3 w-3" />
                            Senha Redefinida
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleAtivo(u)}
                          title="Clique para alternar o status do usuário"
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold transition-all ${
                            u.is_active
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              u.is_active ? 'bg-emerald-600' : 'bg-slate-400'
                            }`}
                          />
                          {u.is_active ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>

                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setCurrentUser(u)}
                            title="Simular login como este usuário para testar acesso"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-school-blue-700 dark:text-slate-400 dark:hover:bg-slate-800"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleResetarSenha(u)}
                            title="Resetar senha para o CPF padrão (exige novo primeiro acesso)"
                            className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/60"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => abrirEdicao(u)}
                            title="Editar usuário e permissões"
                            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cadastro / Edição de Usuário & Matriz de Permissões */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-school-blue-100 text-school-blue-800 dark:bg-school-blue-950 dark:text-school-blue-300">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {usuarioEditando ? 'Editar Usuário & Permissões' : 'Cadastrar Novo Usuário'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Definição de credencial de acesso e módulos concedidos.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalAberto(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {erroForm && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{erroForm}</span>
              </div>
            )}

            <form onSubmit={salvarUsuario} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo de Oliveira"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-school-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    CPF (Login de Acesso) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={14}
                    placeholder="000.000.000-00"
                    value={formCpf}
                    onChange={(e) => setFormCpf(formatarCPF(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:border-school-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <span className="mt-0.5 block text-[10px] text-slate-400">
                    Apenas dígitos (11 números)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    E-mail Institucional
                  </label>
                  <input
                    type="email"
                    placeholder="usuario@plugue.edu.br"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-school-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Perfil de Acesso (Role) *
                </label>
                <div className="mt-1.5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFormRole('professor');
                      setFormModulos((prev) => {
                        const valid: AllowedModule[] = ['PROFILE', 'FOTOGRAMA', 'CALENDARIO'];
                        const filtered = prev.filter(m => valid.includes(m));
                        if (!filtered.includes('PROFILE')) filtered.unshift('PROFILE');
                        if (!filtered.includes('FOTOGRAMA') && !filtered.includes('CALENDARIO') && filtered.length <= 1) {
                          return ['PROFILE', 'FOTOGRAMA', 'CALENDARIO'];
                        }
                        return filtered;
                      });
                    }}
                    className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                      formRole === 'professor'
                        ? 'border-amber-400 bg-amber-50 text-amber-950 ring-2 ring-amber-400/30 dark:border-amber-700 dark:bg-amber-950/40 dark:text-school-gold-300'
                        : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    <GraduationCap className="h-5 w-5 flex-shrink-0 text-amber-600" />
                    <div>
                      <p className="text-xs font-bold">Professor</p>
                      <p className="text-[10px] opacity-75">Acesso restrito e modular</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormRole('admin')}
                    className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                      formRole === 'admin'
                        ? 'border-school-blue-500 bg-school-blue-50 text-school-blue-950 ring-2 ring-school-blue-500/30 dark:border-school-blue-700 dark:bg-school-blue-950/40 dark:text-school-blue-300'
                        : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    <ShieldCheck className="h-5 w-5 flex-shrink-0 text-school-blue-600" />
                    <div>
                      <p className="text-xs font-bold">Administrador</p>
                      <p className="text-[10px] opacity-75">Acesso total e irrestrito</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Matriz de Permissões para Professor */}
              {formRole === 'professor' && (
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase">
                        Matriz de Permissões do Docente
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Marque os módulos que este professor poderá acessar no sistema:
                      </p>
                    </div>
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950 dark:text-school-gold-300">
                      Acesso Restrito
                    </span>
                  </div>

                  <div className="mt-3 space-y-2.5">
                    {MODULOS_PROFESSOR.map((mod) => {
                      const ativo = formModulos.includes(mod.id);
                      return (
                        <label
                          key={mod.id}
                          className={`flex items-start gap-3 rounded-xl border p-2.5 transition-all ${
                            ativo
                              ? 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800'
                              : 'border-slate-200/70 bg-transparent opacity-60'
                          } ${mod.locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <input
                            type="checkbox"
                            disabled={mod.locked}
                            checked={ativo}
                            onChange={() => alternarModulo(mod.id)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-school-blue-600 focus:ring-school-blue-500"
                          />
                          <div className="flex-1 text-xs">
                            <p className="font-bold text-slate-900 dark:text-white">
                              {mod.label}
                              {mod.locked && (
                                <span className="ml-2 text-[10px] font-semibold text-slate-400">
                                  (Obrigatório)
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              {mod.desc}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-200/60 p-2.5 text-[10px] text-slate-600 dark:bg-slate-900/60 dark:text-slate-400">
                    <Info className="h-4 w-4 flex-shrink-0 text-slate-500 mt-0.5" />
                    <span>
                      <strong>Nota de Governança:</strong> Os módulos <em>Estudantes</em>, <em>Turmas & Horários</em>, <em>Ficha Funcional & Faltas</em>, <em>Registro de Atividades (Auditoria)</em> e <em>Configurações</em> são exclusivos da administração escolar.
                    </span>
                  </div>
                </div>
              )}

              {/* Informação sobre Senha Inicial */}
              {!usuarioEditando && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
                  <p className="font-bold flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5" />
                    Regra de Credencial Inicial:
                  </p>
                  <p className="text-[11px] mt-0.5">
                    A senha padrão inicial é o próprio CPF (apenas números). Ao logar pela primeira vez, o professor será obrigado a cadastrar uma nova senha pessoal para desbloquear a navegação.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-school-blue-800 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-school-blue-800/20 hover:bg-school-blue-700 transition-all dark:bg-school-blue-700 dark:hover:bg-school-blue-600"
                >
                  {usuarioEditando ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
