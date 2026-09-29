'use client';

import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw, 
  Unlink, 
  FolderTree, 
  Folder, 
  FolderOpen, 
  FileImage, 
  FileText, 
  ShieldCheck, 
  Key, 
  Sparkles, 
  Copy, 
  Check, 
  HelpCircle,
  Laptop
} from 'lucide-react';

interface DriveStatus {
  is_connected: boolean;
  connected_email: string | null;
  root_folder_id: string | null;
  root_folder_name: string;
  auth_type: string;
  is_oauth: boolean;
  is_service_account: boolean;
  is_simulated: boolean;
  has_client_credentials: boolean;
  client_id_preview?: string | null;
  updated_at: string | null;
}

export function PainelGoogleDriveConfig() {
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [processando, setProcessando] = useState<boolean>(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [modalConfigAberto, setModalConfigAberto] = useState<boolean>(false);
  const [clientIdInput, setClientIdInput] = useState<string>('');
  const [clientSecretInput, setClientSecretInput] = useState<string>('');
  const [copiadoId, setCopiadoId] = useState<boolean>(false);

  // Carregar status da conexão
  const carregarStatus = async () => {
    setCarregando(true);
    setMensagemErro(null);
    try {
      const res = await fetch('/api/auth/google-drive/status');
      const data = await res.json();
      if (res.ok) {
        setStatus(data);
      } else {
        setMensagemErro(data.error || 'Falha ao carregar status do Google Drive.');
      }
    } catch (err: any) {
      setMensagemErro('Erro ao consultar servidor para status do Drive.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarStatus();

    // Verifica parâmetros de URL caso tenha retornado de redirecionamento OAuth
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const statusParam = urlParams.get('status');
      const errorParam = urlParams.get('error');
      const emailParam = urlParams.get('email');

      if (statusParam === 'google_connected') {
        setMensagemSucesso(
          `Conta Google conectada com sucesso${emailParam ? ` como ${emailParam}` : ''}! Pasta raiz 'FICHA DOS ESTUDANTES' inicializada.`
        );
      } else if (errorParam) {
        if (errorParam === 'missing_credentials') {
          setMensagemErro(
            'Credenciais OAuth não configuradas. Insira o Client ID e Client Secret do Google Cloud Console no formulário abaixo.'
          );
          setModalConfigAberto(true);
        } else {
          setMensagemErro(`Aviso ao conectar Google Drive: ${decodeURIComponent(errorParam)}`);
        }
      }
    }
  }, []);

  // 1. Iniciar fluxo OAuth 2.0 do Google Drive
  const handleConectarGoogle = () => {
    setProcessando(true);
    // Redireciona para o endpoint de login OAuth
    window.location.href = '/api/auth/google-drive';
  };

  // 2. Desconectar conta
  const handleDesconectar = async () => {
    if (!window.confirm('Tem certeza de que deseja desconectar esta conta do Google Drive?')) {
      return;
    }

    setProcessando(true);
    setMensagemErro(null);
    setMensagemSucesso(null);

    try {
      const res = await fetch('/api/auth/google-drive/disconnect', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMensagemSucesso('Conta do Google Drive desconectada com sucesso.');
        setStatus((prev) => prev ? {
          ...prev,
          is_connected: false,
          connected_email: null,
          root_folder_id: null,
          is_oauth: false,
          is_service_account: false,
          is_simulated: true,
          auth_type: 'disconnected',
        } : null);
        await carregarStatus();
      } else {
        setMensagemErro(data.error || 'Falha ao desconectar.');
      }
    } catch (err: any) {
      setMensagemErro(err?.message || 'Erro de conexão ao desconectar conta.');
    } finally {
      setProcessando(false);
    }
  };

  // 3. Salvar Client ID e Client Secret manualmente
  const handleSalvarCredenciais = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessando(true);
    try {
      const res = await fetch('/api/auth/google-drive/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientIdInput.trim() || undefined,
          client_secret: clientSecretInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMensagemSucesso('Credenciais salvas com sucesso no banco de dados!');
        setModalConfigAberto(false);
        await carregarStatus();
      } else {
        setMensagemErro(data.error || 'Erro ao salvar credenciais.');
      }
    } catch (err) {
      setMensagemErro('Falha ao comunicar com o servidor.');
    } finally {
      setProcessando(false);
    }
  };

  // 4. Conectar em Modo Demonstração Rápido
  const handleConexaoRapidaDemo = async () => {
    setProcessando(true);
    try {
      const res = await fetch('/api/auth/google-drive/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simular_conexao: true,
          email_simulado: 'secretaria.plugue@educacao.pe.gov.br',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMensagemSucesso('Modo de demonstração de Armazenamento ativado com sucesso!');
        await carregarStatus();
      }
    } catch (e) {
      setMensagemErro('Erro ao ativar demonstração.');
    } finally {
      setProcessando(false);
    }
  };

  const copiarFolderId = () => {
    if (status?.root_folder_id) {
      navigator.clipboard.writeText(status.root_folder_id);
      setCopiadoId(true);
      setTimeout(() => setCopiadoId(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* CARD PRINCIPAL: Armazenamento & Google Drive */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface">
        {/* Cabeçalho do Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 shadow-sm">
              <Cloud className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Armazenamento & Google Drive
                </h2>
                <span className="rounded-full bg-school-blue-100 px-2 py-0.5 text-[10px] font-black uppercase text-school-blue-700 dark:bg-school-blue-950 dark:text-school-blue-300">
                  Storage API
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Armazenamento em nuvem oficial para Fotos 3x4, Laudos, Certidões e Documentos
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {carregando ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Verificando...
              </span>
            ) : status?.is_connected ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Conectado como: {status.connected_email}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                <AlertCircle className="h-4 w-4 text-slate-400" />
                Não Conectado
              </span>
            )}
          </div>
        </div>

        {/* Mensagens de Feedback */}
        {mensagemSucesso && (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{mensagemSucesso}</span>
          </div>
        )}

        {mensagemErro && (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{mensagemErro}</span>
          </div>
        )}

        {/* Detalhes da Conexão & Ações */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1 & 2: Informações de Conexão */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40 space-y-3 text-xs">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-1 border-b border-slate-200/60 dark:border-slate-800 gap-1">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Conta Vinculada:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {status?.connected_email || 'Nenhuma conta Google conectada'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-1 border-b border-slate-200/60 dark:border-slate-800 gap-1">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Pasta Raiz Automatizada:</span>
                <div className="flex items-center gap-1.5 font-mono font-bold text-school-blue-700 dark:text-school-blue-300">
                  <Folder className="h-3.5 w-3.5" />
                  <span>{status?.root_folder_name || 'FICHA DOS ESTUDANTES'}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-1 border-b border-slate-200/60 dark:border-slate-800 gap-1">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Root Folder ID:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate max-w-[220px]">
                    {status?.root_folder_id || 'Automático após conexão'}
                  </span>
                  {status?.root_folder_id && (
                    <button
                      type="button"
                      onClick={copiarFolderId}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
                      title="Copiar ID da pasta"
                    >
                      {copiadoId ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-1 gap-1">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Método de Autenticação:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {status?.is_oauth
                    ? 'OAuth 2.0 com Renovação Automática (Offline)'
                    : status?.is_service_account
                    ? 'Service Account (Credenciais de Servidor)'
                    : 'Aguardando Conexão Oficial'}
                </span>
              </div>
            </div>

            {/* Botões de Ação Principal */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {!status?.is_connected ? (
                <>
                  <button
                    type="button"
                    onClick={handleConectarGoogle}
                    disabled={processando}
                    className="flex items-center gap-2 rounded-xl bg-school-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-school-blue-700 transition disabled:opacity-50"
                  >
                    <Cloud className="h-4 w-4" />
                    <span>Conectar Conta Google</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleConexaoRapidaDemo}
                    disabled={processando}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
                  >
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span>Conexão Rápida (Demonstração)</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleDesconectar}
                    disabled={processando}
                    className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 transition disabled:opacity-50"
                  >
                    <Unlink className="h-4 w-4" />
                    <span>Desconectar / Trocar Conta</span>
                  </button>

                  {status.root_folder_id && (
                    <a
                      href={`https://drive.google.com/drive/folders/${status.root_folder_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-school-blue-600" />
                      <span>Abrir Pasta Raiz no Drive</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={handleConectarGoogle}
                    disabled={processando}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400"
                    title="Reautenticar ou atualizar escopos"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Reautenticar</span>
                  </button>
                </>
              )}

              {/* Botão de Chaves Avançadas */}
              <button
                type="button"
                onClick={() => setModalConfigAberto(true)}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
                title="Configurar Client ID / Client Secret"
              >
                <Key className="h-3.5 w-3.5" />
                <span>Credenciais OAuth</span>
              </button>
            </div>
          </div>

          {/* Coluna 3: Visualizador da Árvore de Diretórios Padronizada por Inicial */}
          <div className="rounded-xl border border-school-blue-100 bg-school-blue-50/30 p-4 dark:border-school-blue-900/40 dark:bg-school-blue-950/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FolderTree className="h-4 w-4 text-school-blue-600 dark:text-school-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Árvore de Diretórios por Inicial
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                Estrutura recursiva padronizada criada automaticamente pelo sistema no Drive:
              </p>

              {/* Diagrama Visual da Estrutura */}
              <div className="rounded-xl bg-slate-900 p-3 font-mono text-[11px] text-slate-200 shadow-inner overflow-x-auto space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <FolderOpen className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>FICHA DOS ESTUDANTES/</span>
                </div>
                <div className="flex items-center gap-1.5 pl-3 text-emerald-400 font-semibold">
                  <span className="text-slate-500">└──</span>
                  <Folder className="h-3 w-3 text-emerald-400 shrink-0" />
                  <span>[Letra Inicial Maiúscula]/</span>
                </div>
                <div className="flex items-center gap-1.5 pl-7 text-sky-300">
                  <span className="text-slate-500">└──</span>
                  <Folder className="h-3 w-3 text-sky-400 shrink-0" />
                  <span>[Nome Completo Estudante]/</span>
                </div>
                <div className="flex items-center gap-1.5 pl-11 text-amber-200">
                  <span className="text-slate-500">├──</span>
                  <FileImage className="h-3 w-3 text-amber-300 shrink-0" />
                  <span>foto_perfil_3x4.jpg</span>
                </div>
                <div className="flex items-center gap-1.5 pl-11 text-slate-300">
                  <span className="text-slate-500">└──</span>
                  <FileText className="h-3 w-3 text-slate-400 shrink-0" />
                  <span>[Documentos / Repositório]</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-school-blue-100/60 dark:border-school-blue-900/40 flex items-center gap-1.5 text-[10px] text-school-blue-700 dark:text-school-blue-300 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              <span>Catalogação inteligente e pastas criadas sob demanda</span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Configuração de Credenciais OAuth do Google */}
      {modalConfigAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-school-blue-100 text-school-blue-700 dark:bg-school-blue-950 dark:text-school-blue-300">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Credenciais OAuth 2.0 do Google
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Definir Client ID e Client Secret da aplicação Google Cloud
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalConfigAberto(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarCredenciais} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Google Client ID:
                </label>
                <input
                  type="text"
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  placeholder="ex: 123456789-abcdef.apps.googleusercontent.com"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Google Client Secret:
                </label>
                <input
                  type="password"
                  value={clientSecretInput}
                  onChange={(e) => setClientSecretInput(e.target.value)}
                  placeholder="GOCSPX-..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
                />
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-400 space-y-1 border border-slate-200/60 dark:border-slate-700">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <HelpCircle className="h-3.5 w-3.5 text-school-blue-500" />
                  URI de Redirecionamento Autorizada:
                </span>
                <code className="block select-all rounded bg-white px-2 py-1 font-mono text-[10px] text-school-blue-700 dark:bg-slate-900 dark:text-school-blue-300 border border-slate-200 dark:border-slate-700">
                  {typeof window !== 'undefined' ? `${window.location.origin}/api/auth/google-drive/callback` : '/api/auth/google-drive/callback'}
                </code>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalConfigAberto(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processando}
                  className="px-5 py-2 rounded-xl bg-school-blue-600 text-white text-xs font-bold hover:bg-school-blue-700 disabled:opacity-50"
                >
                  {processando ? 'Salvando...' : 'Salvar Credenciais'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
