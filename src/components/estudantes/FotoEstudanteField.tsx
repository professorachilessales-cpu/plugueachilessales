'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  Cloud, 
  Trash2, 
  Image as ImageIcon, 
  Smartphone, 
  Laptop, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  X,
  Loader2,
  FolderOpen,
  RefreshCw
} from 'lucide-react';
import { ModalRecorteFotoEstudante } from './ModalRecorteFotoEstudante';

interface FotoEstudanteFieldProps {
  fotoUrl: string;
  nomeEstudante: string;
  cpfEstudante?: string;
  matriculaEstudante?: string;
  estudanteId?: string;
  onChangeFotoUrl: (novaUrl: string) => void;
  onFotoSalvaNoDrive?: (dados: { foto_url: string; caminho_drive: string }) => void;
}

export function FotoEstudanteField({
  fotoUrl,
  nomeEstudante,
  cpfEstudante,
  matriculaEstudante,
  estudanteId,
  onChangeFotoUrl,
  onFotoSalvaNoDrive,
}: FotoEstudanteFieldProps) {
  // Detecção de dispositivo Mobile vs Desktop
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Estado local para visualização imediata da foto antes e após o upload (Padrão 3x4)
  const [previewUrl, setPreviewUrl] = useState<string>(fotoUrl || '');
  const objectUrlRef = useRef<string | null>(null);

  // Sincroniza o preview local quando a prop fotoUrl muda externamente (sem blob local ativo)
  useEffect(() => {
    if (!objectUrlRef.current) {
      setPreviewUrl(fotoUrl || '');
    }
  }, [fotoUrl]);

  // Limpeza de memória do objeto gerado (URL.revokeObjectURL) ao desmontar o componente
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  // Estados dos modais de escolha
  const [modalDesktopAberto, setModalDesktopAberto] = useState<boolean>(false);
  const [actionSheetMobileAberto, setActionSheetMobileAberto] = useState<boolean>(false);
  const [modalDrivePickerAberto, setModalDrivePickerAberto] = useState<boolean>(false);
  const [driveUrlManual, setDriveUrlManual] = useState<string>('');
  const [driveBuscando, setDriveBuscando] = useState<boolean>(false);

  // Estados do fluxo de recorte
  const [imagemParaRecorte, setImagemParaRecorte] = useState<string | null>(null);

  // Estados de feedback de upload e sincronização
  const [uploadando, setUploadando] = useState<boolean>(false);
  const [sincronizando, setSincronizando] = useState<boolean>(false);
  const [carregandoPasta, setCarregandoPasta] = useState<boolean>(false);
  const [arquivosPastaEstudante, setArquivosPastaEstudante] = useState<any[]>([]);
  const [caminhoPastaEstudante, setCaminhoPastaEstudante] = useState<string>('');
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  // Refs para inputs de arquivo ocultos
  const fileInputDesktopRef = useRef<HTMLInputElement>(null);
  const fileInputGaleriaRef = useRef<HTMLInputElement>(null);
  const fileInputCameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const verificarDispositivo = () => {
      const touchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const telaPequena = window.innerWidth < 768;
      setIsMobile(touchCapable && telaPequena);
    };

    verificarDispositivo();
    window.addEventListener('resize', verificarDispositivo);
    return () => window.removeEventListener('resize', verificarDispositivo);
  }, []);

  // Abrir o seletor correspondente ao dispositivo
  const handleAbrirSeletor = () => {
    setMensagemErro(null);
    setMensagemSucesso(null);
    if (isMobile) {
      setActionSheetMobileAberto(true);
    } else {
      setModalDesktopAberto(true);
    }
  };

  // Conversão de arquivo local selecionado com preview imediato (createObjectURL) e abertura do corte
  const processarArquivoSelecionado = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setMensagemErro('Selecione um arquivo de imagem válido (JPG, PNG, WEBP).');
      return;
    }

    // 1. Limpeza de memória do objeto temporário anterior se existente
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    // 2. Leitura imediata via URL.createObjectURL para feedback visual instantâneo na tela
    const localUrl = URL.createObjectURL(file);
    objectUrlRef.current = localUrl;
    setPreviewUrl(localUrl);
    setMensagemErro(null);
    setMensagemSucesso(null);

    // Fecha modais de seleção
    setModalDesktopAberto(false);
    setActionSheetMobileAberto(false);

    // 3. Lê via FileReader para carregar no modal interativo de recorte/enquadramento 3x4
    const reader = new FileReader();
    reader.onload = (e) => {
      const resultado = e.target?.result as string;
      if (resultado) {
        setImagemParaRecorte(resultado);
      }
    };
    reader.readAsDataURL(file);
  };

  // 1. Ação: Enviar do Computador (Desktop)
  const handleEnviarComputador = () => {
    fileInputDesktopRef.current?.click();
  };

  // 2. Ação: Escolher da Galeria (Mobile)
  const handleEscolherGaleria = () => {
    fileInputGaleriaRef.current?.click();
  };

  // 3. Ação: Tirar Foto com a Câmera Nativa (Mobile)
  const handleTirarFotoCamera = () => {
    fileInputCameraRef.current?.click();
  };

  // Validação de Conta Google Vinculada
  const verificarConexaoGoogle = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/google-drive/status');
      const data = await res.json();
      return Boolean(data?.is_connected);
    } catch {
      return false;
    }
  };

  // Botão Sincronizar Foto: busca foto_perfil_3x4.jpg na pasta do aluno
  const handleSincronizarFoto = async () => {
    setMensagemErro(null);
    setMensagemSucesso(null);
    setSincronizando(true);

    try {
      const conectado = await verificarConexaoGoogle();
      if (!conectado) {
        setMensagemErro('É necessário vincular uma conta Google antes de enviar arquivos.');
        return;
      }

      const res = await fetch(
        `/api/estudantes/foto?action=sincronizar&estudante_id=${encodeURIComponent(estudanteId || '')}&estudante_nome=${encodeURIComponent(nomeEstudante || '')}`
      );
      const data = await res.json();

      if (data.found && data.foto_url) {
        // Limpa URL de blob local caso estivesse ativo
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
        setPreviewUrl(data.foto_url);
        onChangeFotoUrl(data.foto_url);
        setMensagemSucesso(data.message || 'Foto sincronizada com sucesso!');
        if (onFotoSalvaNoDrive) {
          onFotoSalvaNoDrive({
            foto_url: data.foto_url,
            caminho_drive: data.caminho_drive || 'FICHA DOS ESTUDANTES',
          });
        }
      } else {
        setMensagemErro(data.message || 'Arquivo foto_perfil_3x4.jpg não encontrado na pasta do estudante no Drive.');
      }
    } catch (err: any) {
      setMensagemErro('Falha ao sincronizar foto com o Google Drive.');
    } finally {
      setSincronizando(false);
    }
  };

  // 4. Ação: Selecionar do Google Drive apontando diretamente para a pasta do estudante
  const handleAbrirGoogleDrive = async () => {
    setModalDesktopAberto(false);
    setActionSheetMobileAberto(false);
    setMensagemErro(null);

    const conectado = await verificarConexaoGoogle();
    if (!conectado) {
      setMensagemErro('É necessário vincular uma conta Google antes de enviar arquivos.');
      return;
    }

    setModalDrivePickerAberto(true);
    setCarregandoPasta(true);
    try {
      const res = await fetch(`/api/estudantes/foto?action=list_folder&estudante_nome=${encodeURIComponent(nomeEstudante || '')}`);
      const data = await res.json();
      if (data.files) {
        setArquivosPastaEstudante(data.files);
      }
      if (data.folder_path) {
        setCaminhoPastaEstudante(data.folder_path);
      }
    } catch {
      // Fallback
    } finally {
      setCarregandoPasta(false);
    }
  };

  // Inicializador do Google Picker Oficial (quando chaves OAuth estiverem configuradas)
  const abrirGooglePickerNativo = (clientId: string, apiKey: string) => {
    const gapi = (window as any).gapi;
    const google = (window as any).google;

    gapi.load('picker', () => {
      try {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.readonly',
          callback: (response: any) => {
            if (response.error !== undefined) {
              setModalDrivePickerAberto(true);
              return;
            }
            const picker = new google.picker.PickerBuilder()
              .addView(google.picker.ViewId.DOCS_IMAGES)
              .setOAuthToken(response.access_token)
              .setDeveloperKey(apiKey)
              .setCallback((data: any) => {
                if (data.action === google.picker.Action.PICKED) {
                  const doc = data.docs[0];
                  const driveFileId = doc.id;
                  const driveUrl = `https://lh3.googleusercontent.com/d/${driveFileId}`;
                  carregarImagemParaCorte(driveUrl);
                }
              })
              .build();
            picker.setVisible(true);
          },
        });
        tokenClient.requestAccessToken({ prompt: '' });
      } catch (err) {
        setModalDrivePickerAberto(true);
      }
    });
  };

  // Carregar imagem de URL remota para recorte via Canvas
  const carregarImagemParaCorte = async (url: string) => {
    setDriveBuscando(true);
    try {
      // Converte URLs do Google Drive para link direto seguro
      let urlTratada = url.trim();
      const driveMatch = urlTratada.match(/[-\w]{25,}/);
      if (driveMatch && urlTratada.includes('drive.google.com')) {
        const fileId = driveMatch[0];
        urlTratada = `https://lh3.googleusercontent.com/d/${fileId}`;
      }

      setImagemParaRecorte(urlTratada);
      setModalDrivePickerAberto(false);
      setDriveUrlManual('');
    } catch (e: any) {
      setMensagemErro('Não foi possível carregar a imagem do Google Drive informada.');
    } finally {
      setDriveBuscando(false);
    }
  };

  // Confirmar recorte e disparar upload para a rota da API com persistência no Google Drive
  const handleConfirmarRecorte = async (blob: Blob, croppedPreviewUrl?: string) => {
    setUploadando(true);
    setMensagemErro(null);
    setMensagemSucesso(null);

    // Feedback visual imediato: atualiza o preview local com a versão recortada antes mesmo do upload terminar
    if (objectUrlRef.current && objectUrlRef.current !== croppedPreviewUrl) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (croppedPreviewUrl) {
      objectUrlRef.current = croppedPreviewUrl;
      setPreviewUrl(croppedPreviewUrl);
    } else {
      const novoBlobUrl = URL.createObjectURL(blob);
      objectUrlRef.current = novoBlobUrl;
      setPreviewUrl(novoBlobUrl);
    }

    const conectado = await verificarConexaoGoogle();
    if (!conectado) {
      setMensagemErro('É necessário vincular uma conta Google antes de enviar arquivos.');
      setUploadando(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', blob, 'foto_perfil_3x4.jpg');
      formData.append('estudante_nome', nomeEstudante || 'ESTUDANTE');
      if (estudanteId) formData.append('estudante_id', estudanteId);
      if (cpfEstudante) formData.append('estudante_cpf', cpfEstudante);
      if (matriculaEstudante) formData.append('estudante_matricula', matriculaEstudante);

      const res = await fetch('/api/estudantes/foto', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Falha ao realizar upload para o Google Drive.');
      }

      // Atualiza a URL definitiva do Google Drive e limpa o blob local
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setPreviewUrl(data.foto_url);
      onChangeFotoUrl(data.foto_url);
      setMensagemSucesso('Foto 3x4 enviada com sucesso para o Google Drive!');
      setImagemParaRecorte(null);

      if (onFotoSalvaNoDrive) {
        onFotoSalvaNoDrive({
          foto_url: data.foto_url,
          caminho_drive: data.caminho_drive || 'FICHA DOS ESTUDANTES',
        });
      }
    } catch (err: any) {
      console.error('Erro no upload da foto do estudante:', err);
      setMensagemErro(err?.message || 'Erro de comunicação ao salvar foto no Google Drive.');
    } finally {
      setUploadando(false);
    }
  };

  const handleRemoverFoto = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreviewUrl('');
    onChangeFotoUrl('');
    setMensagemSucesso(null);
    setMensagemErro(null);
  };

  return (
    <div className="rounded-2xl border-2 border-dashed border-school-blue-200 bg-school-blue-50/40 p-4 sm:p-5 dark:border-school-blue-900/50 dark:bg-school-blue-950/20">
      {/* Inputs Ocultos de Arquivo */}
      <input
        type="file"
        ref={fileInputDesktopRef}
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) processarArquivoSelecionado(e.target.files[0]);
          e.target.value = '';
        }}
      />
      <input
        type="file"
        ref={fileInputGaleriaRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) processarArquivoSelecionado(e.target.files[0]);
          e.target.value = '';
        }}
      />
      <input
        type="file"
        ref={fileInputCameraRef}
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) processarArquivoSelecionado(e.target.files[0]);
          e.target.value = '';
        }}
      />

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        {/* Moldura de Pré-visualização da Foto 3x4 */}
        <div className="relative group shrink-0">
          <div
            onClick={handleAbrirSeletor}
            className="cursor-pointer relative h-36 w-28 sm:h-40 sm:w-32 rounded-2xl overflow-hidden border-2 border-school-blue-300 dark:border-school-blue-700 bg-white dark:bg-slate-800 shadow-md flex items-center justify-center transition-all hover:scale-105 hover:shadow-lg"
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Foto do Estudante"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '';
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-3 text-center text-slate-400 dark:text-slate-500">
                <Camera className="h-9 w-9 mb-1.5 text-school-blue-500" />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Foto 3x4
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5">Clique para adicionar</span>
              </div>
            )}

            {/* Indicador de envio/upload ativo */}
            {uploadando && (
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] flex flex-col items-center justify-center text-white p-2 z-10">
                <Loader2 className="h-6 w-6 animate-spin text-school-gold-400 mb-1" />
                <span className="text-[9px] font-bold text-center">Salvando no Drive...</span>
              </div>
            )}

            {/* Overlay com hover */}
            <div className="absolute inset-0 bg-school-blue-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold text-center p-2 backdrop-blur-[1px]">
              {previewUrl ? 'Alterar Foto 3x4' : 'Adicionar Foto'}
            </div>
          </div>

          {/* Botão de Excluir Foto */}
          {previewUrl && (
            <button
              type="button"
              onClick={handleRemoverFoto}
              className="absolute -top-2 -right-2 rounded-full bg-rose-600 text-white p-1.5 shadow-md hover:bg-rose-700 transition-colors z-20"
              title="Remover Foto Atual"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Informações e Botões de Ação */}
        <div className="flex-1 w-full space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <Camera className="h-4 w-4 text-school-blue-600 dark:text-school-gold-400" />
              Fotografia Oficial do Estudante (Padrão 3x4)
            </label>
            <span className="text-[10px] font-bold text-school-blue-700 dark:text-school-gold-400 bg-school-blue-100 dark:bg-school-blue-950/70 px-2.5 py-0.5 rounded-full uppercase">
              Google Drive Integrado
            </span>
          </div>

          {/* Legenda com Especificações Oficiais de Resolução 3x4 */}
          <div className="rounded-xl border border-school-blue-200 bg-school-blue-50/70 p-2.5 dark:border-school-blue-900/50 dark:bg-school-blue-950/30 flex items-start gap-2 shadow-xs">
            <span className="text-sm select-none shrink-0 mt-0.5">📐</span>
            <p className="text-[11px] leading-tight text-slate-700 dark:text-slate-300">
              <strong className="font-bold text-school-blue-950 dark:text-white">Padrão Oficial 3x4:</strong>{' '}
              Resolução recomendada de <strong className="font-bold text-school-blue-700 dark:text-school-gold-400">600 × 800 px</strong>{' '}
              (mínimo de <strong className="font-semibold text-slate-900 dark:text-slate-200">300 × 400 px</strong>, proporção estrita 3:4, formato JPG/PNG até 5 MB).
            </p>
          </div>

          {/* Árvore de Diretórios Padronizada do Google Drive */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Estrutura Oficial de Diretórios no Google Drive:
            </span>
            <div className="rounded-xl bg-slate-900 dark:bg-slate-950 p-2.5 sm:p-3 text-slate-300 font-mono text-[11px] border border-slate-700/60 shadow-inner">
              <div className="flex items-center gap-1.5 text-school-gold-400 font-bold">
                <FolderOpen className="h-3.5 w-3.5 text-school-gold-400 shrink-0" />
                <span>FICHA DOS ESTUDANTES/</span>
              </div>
              <div className="pl-3 sm:pl-4 border-l border-slate-700/70 ml-1.5 mt-1 space-y-0.5">
                <div className="flex items-center gap-1.5 text-amber-300">
                  <span className="text-slate-500">└──</span>
                  <span className="font-bold">[{nomeEstudante ? (nomeEstudante.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').charAt(0).toUpperCase() || 'A') : 'A'}]/</span>
                </div>
                <div className="pl-3 sm:pl-4 border-l border-slate-700/70 ml-1.5 mt-0.5 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-blue-300">
                    <span className="text-slate-500">└──</span>
                    <span className="font-bold truncate max-w-[280px]">[{nomeEstudante ? nomeEstudante.trim().toUpperCase() : 'NOME COMPLETO DO ESTUDANTE'}]/</span>
                  </div>
                  <div className="pl-3 sm:pl-4 ml-1.5 mt-0.5 space-y-0.5 text-[10px]">
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <span className="text-slate-500">├──</span>
                      <span className="font-semibold text-emerald-300">foto_perfil_3x4.jpg</span>
                      {previewUrl && (
                        <span className="text-[9px] bg-emerald-950/80 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-800/60 font-bold">
                          ✓ Sincronizada
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <span className="text-slate-500">└──</span>
                      <span>[Documentos / Repositório Geral]</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botões de Ação Rápida */}
          <div className="flex items-center gap-2.5 flex-wrap pt-1">
            <button
              type="button"
              onClick={handleAbrirSeletor}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-school-blue-600 text-white text-xs font-bold hover:bg-school-blue-700 shadow-sm transition-all"
            >
              <Camera className="h-4 w-4" />
              {previewUrl ? 'Alterar Foto do Estudante' : 'Adicionar Foto do Estudante'}
            </button>

            {/* Botão Sincronizar foto diretamente do Drive */}
            <button
              type="button"
              onClick={handleSincronizarFoto}
              disabled={sincronizando}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 shadow-xs transition-all disabled:opacity-50"
              title="Buscar arquivo foto_perfil_3x4.jpg na pasta do estudante no Drive"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${sincronizando ? 'animate-spin' : ''}`} />
              <span>{sincronizando ? 'Sincronizando...' : 'Sincronizar foto'}</span>
            </button>

            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Visualizar no Drive
              </a>
            )}
          </div>

          {/* Mensagens de Feedback */}
          {mensagemSucesso && (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{mensagemSucesso}</span>
            </div>
          )}

          {mensagemErro && (
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-800/60">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{mensagemErro}</span>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL DESKTOP: "Selecionar do Google Drive" ou "Enviar do Computador" */}
      {/* ======================================================== */}
      {modalDesktopAberto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-school-blue-100 text-school-blue-700 dark:bg-school-blue-950 dark:text-school-blue-300">
                  <Laptop className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Escolher Foto do Estudante
                  </h4>
                  <p className="text-[11px] text-slate-500">Selecione a origem da fotografia</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalDesktopAberto(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Legenda com Especificações Oficiais de Resolução 3x4 */}
            <div className="mt-3.5 rounded-2xl border border-school-blue-200 bg-school-blue-50/80 p-2.5 dark:border-school-blue-900/50 dark:bg-school-blue-950/40 flex items-start gap-2 shadow-xs">
              <span className="text-sm select-none shrink-0 mt-0.5">📐</span>
              <p className="text-[11px] leading-tight text-slate-700 dark:text-slate-300">
                <strong className="font-bold text-school-blue-950 dark:text-white">Padrão Oficial 3x4:</strong>{' '}
                Resolução recomendada de <strong className="font-bold text-school-blue-700 dark:text-school-gold-400">600 × 800 px</strong>{' '}
                (mínimo de <strong className="font-semibold text-slate-900 dark:text-slate-200">300 × 400 px</strong>, proporção estrita 3:4, formato JPG/PNG até 5 MB).
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {/* Opção 1: Selecionar do Google Drive */}
              <button
                type="button"
                onClick={handleAbrirGoogleDrive}
                className="w-full flex items-center gap-3.5 p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 hover:bg-school-blue-50/50 hover:border-school-blue-300 text-left transition-all dark:border-slate-800 dark:bg-slate-850 dark:hover:border-school-blue-600"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                  <Cloud className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <span className="block text-xs font-bold text-slate-900 dark:text-white">
                    Selecionar do Google Drive
                  </span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                    Abre o Google Drive para escolher uma foto existente
                  </span>
                </div>
              </button>

              {/* Opção 2: Enviar do Computador */}
              <button
                type="button"
                onClick={handleEnviarComputador}
                className="w-full flex items-center gap-3.5 p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 hover:bg-school-blue-50/50 hover:border-school-blue-300 text-left transition-all dark:border-slate-800 dark:bg-slate-850 dark:hover:border-school-blue-600"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-school-blue-100 text-school-blue-700 dark:bg-school-blue-950 dark:text-school-blue-300 shrink-0">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <span className="block text-xs font-bold text-slate-900 dark:text-white">
                    Enviar do Computador
                  </span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                    Selecionar arquivo JPG ou PNG salvo localmente
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ACTIONSHEET MOBILE: "Tirar Foto", "Escolher da Galeria", "Selecionar do Google Drive" */}
      {/* ======================================================== */}
      {actionSheetMobileAberto && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom duration-200">
            {/* Barra de arraste visual */}
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />

            <div className="mb-3 text-center">
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                Foto do Estudante (Formato 3x4)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Selecione como deseja capturar a fotografia
              </p>
            </div>

            {/* Legenda com Especificações Oficiais de Resolução 3x4 */}
            <div className="mb-3.5 rounded-2xl border border-school-blue-200 bg-school-blue-50/80 p-2.5 dark:border-school-blue-900/50 dark:bg-school-blue-950/40 flex items-start gap-2 shadow-xs">
              <span className="text-sm select-none shrink-0 mt-0.5">📐</span>
              <p className="text-[11px] leading-tight text-slate-700 dark:text-slate-300">
                <strong className="font-bold text-school-blue-950 dark:text-white">Padrão Oficial 3x4:</strong>{' '}
                Resolução recomendada de <strong className="font-bold text-school-blue-700 dark:text-school-gold-400">600 × 800 px</strong>{' '}
                (mínimo de <strong className="font-semibold text-slate-900 dark:text-slate-200">300 × 400 px</strong>, proporção 3:4, até 5 MB).
              </p>
            </div>

            <div className="space-y-2.5">
              {/* Opção 1: Tirar Foto (Câmera) */}
              <button
                type="button"
                onClick={handleTirarFotoCamera}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-school-blue-50 text-school-blue-900 dark:bg-school-blue-950/60 dark:text-school-blue-200 font-bold text-xs hover:bg-school-blue-100 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-school-blue-600 text-white shrink-0">
                  <Camera className="h-5 w-5" />
                </div>
                <div className="text-left flex-1">
                  <span className="block">Tirar Foto com a Câmera</span>
                  <span className="block text-[10px] font-normal text-slate-500 dark:text-slate-400">
                    Abre a câmera do aparelho para captura imediata
                  </span>
                </div>
              </button>

              {/* Opção 2: Escolher da Galeria */}
              <button
                type="button"
                onClick={handleEscolherGaleria}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white shrink-0">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div className="text-left flex-1">
                  <span className="block">Escolher da Galeria</span>
                  <span className="block text-[10px] font-normal text-slate-500 dark:text-slate-400">
                    Selecionar imagem existente no rolo da câmera
                  </span>
                </div>
              </button>

              {/* Opção 3: Selecionar do Google Drive */}
              <button
                type="button"
                onClick={handleAbrirGoogleDrive}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 font-bold text-xs hover:bg-emerald-100 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shrink-0">
                  <Cloud className="h-5 w-5" />
                </div>
                <div className="text-left flex-1">
                  <span className="block">Selecionar do Google Drive</span>
                  <span className="block text-[10px] font-normal text-slate-500 dark:text-slate-400">
                    Navegue ou selecione do Drive da instituição
                  </span>
                </div>
              </button>

              {/* Botão de Cancelar */}
              <button
                type="button"
                onClick={() => setActionSheetMobileAberto(false)}
                className="w-full mt-2 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL GOOGLE DRIVE SELETOR (LINK / ID OU NAVEGAÇÃO) */}
      {/* ======================================================== */}
      {modalDrivePickerAberto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <Cloud className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Google Drive &bull; Foto do Estudante
                  </h4>
                  <p className="text-[11px] text-slate-500">Selecione ou insira o link do arquivo</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalDrivePickerAberto(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Legenda com Especificações Oficiais de Resolução 3x4 */}
              <div className="rounded-2xl border border-school-blue-200 bg-school-blue-50/80 p-3 dark:border-school-blue-800/60 dark:bg-school-blue-950/40 flex items-start gap-2.5 shadow-xs">
                <span className="text-base select-none shrink-0 mt-0.5">📐</span>
                <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                  <strong className="font-bold text-school-blue-950 dark:text-white">Padrão Oficial 3x4:</strong>{' '}
                  Resolução recomendada de <strong className="font-bold text-school-blue-700 dark:text-school-gold-400">600 × 800 px</strong>{' '}
                  (mínimo de <strong className="font-semibold text-slate-900 dark:text-slate-200">300 × 400 px</strong>, proporção estrita 3:4, formato JPG/PNG até 5 MB).
                </p>
              </div>

              {/* Pasta do Estudante no Drive */}
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Pasta Oficial do Estudante:
                </span>
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-700 dark:text-amber-400">
                  <FolderOpen className="h-4 w-4 shrink-0 text-amber-500" />
                  <span className="truncate">{caminhoPastaEstudante || `FICHA DOS ESTUDANTES / ${nomeEstudante ? nomeEstudante.trim().charAt(0).toUpperCase() : 'A'} / ${(nomeEstudante || 'ESTUDANTE').trim().toUpperCase()}`}</span>
                </div>
              </div>

              {/* Arquivos encontrados na pasta do estudante */}
              {carregandoPasta ? (
                <div className="flex items-center justify-center p-6 text-xs text-slate-500 gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-school-blue-600" />
                  <span>Consultando arquivos da pasta do estudante no Drive...</span>
                </div>
              ) : arquivosPastaEstudante.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block uppercase">
                    Imagens / Arquivos na Pasta ({arquivosPastaEstudante.length}):
                  </span>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {arquivosPastaEstudante.map((arq) => (
                      <button
                        key={arq.id}
                        type="button"
                        onClick={() => carregarImagemParaCorte(arq.view_url)}
                        className="w-full flex items-center justify-between p-2 rounded-xl border border-slate-200 hover:border-school-blue-400 bg-white hover:bg-school-blue-50/50 dark:border-slate-700 dark:bg-slate-800 text-left transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <ImageIcon className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {arq.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-school-blue-600 dark:text-school-gold-400 shrink-0 uppercase">
                          Selecionar
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">
                  Ou Cole o Link / ID da Foto no Google Drive:
                </label>
                <input
                  type="text"
                  value={driveUrlManual}
                  onChange={(e) => setDriveUrlManual(e.target.value)}
                  placeholder="https://drive.google.com/file/d/1A2B3C.../view"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Cole o link de compartilhamento ou ID do arquivo de imagem do Google Drive.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalDrivePickerAberto(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => carregarImagemParaCorte(driveUrlManual)}
                  disabled={!driveUrlManual.trim() || driveBuscando}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-school-blue-600 text-white text-xs font-bold hover:bg-school-blue-700 disabled:opacity-50"
                >
                  {driveBuscando ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Carregando...</span>
                    </>
                  ) : (
                    <span>Carregar para Recorte</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DE RECORTE 3x4 OBRIGATÓRIO */}
      {/* ======================================================== */}
      {imagemParaRecorte && (
        <ModalRecorteFotoEstudante
          imagemSrc={imagemParaRecorte}
          nomeEstudante={nomeEstudante}
          onConfirmar={handleConfirmarRecorte}
          onCancelar={() => setImagemParaRecorte(null)}
        />
      )}
    </div>
  );
}
