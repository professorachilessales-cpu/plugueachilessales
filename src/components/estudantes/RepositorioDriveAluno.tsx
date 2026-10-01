'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Estudante, DocumentoEstudanteDrive, TipoDocumentoDrive } from '@/lib/types';
import { 
  Upload, 
  FileText, 
  Folder, 
  FolderOpen,
  ExternalLink, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  FileCheck, 
  Download, 
  Search, 
  Filter,
  Plus,
  X
} from 'lucide-react';

interface RepositorioDriveAlunoProps {
  estudante: Estudante;
}

const EXTENSOES_PERMITIDAS = ['.pdf', '.png', '.jpg', '.jpeg'];

const TIPOS_DOC_LABELS: Record<TipoDocumentoDrive, string> = {
  rg: 'RG / Identidade Civil',
  comprovante_residencia: 'Comprovante de Residência',
  laudo_medico: 'Laudo Médico / AEE',
  certidao_nascimento: 'Certidão de Nascimento',
  historico_escolar: 'Histórico Escolar',
  outro: 'Outro Documento',
  Historico: 'Histórico Escolar',
  'Ficha Cadastral': 'Ficha Cadastral',
  'Documentos Pessoais': 'Documentos Pessoais',
  Atestado: 'Atestado Médico',
  Outros: 'Outro Documento',
};

export function RepositorioDriveAluno({ estudante }: RepositorioDriveAlunoProps) {
  const { documentosEstudanteDrive, addDocumentoEstudanteDrive, deleteDocumentoEstudanteDrive } = useApp();

  // Cálculo da pasta normalizada
  const primeiraLetra = (estudante.nome_completo || 'A').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().charAt(0).toUpperCase();
  const nomeEstudanteFormatado = (estudante.nome_completo || 'ESTUDANTE').trim().toUpperCase();
  const caminhoPastaDrive = `FICHA DOS ESTUDANTES / ${primeiraLetra} / ${nomeEstudanteFormatado}`;

  // Estado do link direto da pasta do estudante no Google Drive e arquivos físicos
  const [pastaDriveUrl, setPastaDriveUrl] = useState<string | null>(null);
  const [arquivosDriveFisicos, setArquivosDriveFisicos] = useState<DocumentoEstudanteDrive[]>([]);
  const [carregandoPastaDrive, setCarregandoPastaDrive] = useState<boolean>(true);

  // Efeito para carregar ou resolver a URL da pasta do estudante no Google Drive e listar arquivos físicos
  useEffect(() => {
    let ativo = true;
    const buscarPasta = async () => {
      try {
        setCarregandoPastaDrive(true);
        const res = await fetch(
          `/api/drive/pasta-estudante?estudanteId=${encodeURIComponent(estudante.id)}&estudanteNome=${encodeURIComponent(estudante.nome_completo || '')}`
        );
        const data = await res.json();
        if (ativo) {
          if (data?.folder_url) {
            setPastaDriveUrl(data.folder_url);
          }
          if (Array.isArray(data?.arquivos) && data.arquivos.length > 0) {
            setArquivosDriveFisicos(data.arquivos);
          }
        }
      } catch (err) {
        console.warn('Falha ao resolver pasta do estudante no Google Drive:', err);
      } finally {
        if (ativo) setCarregandoPastaDrive(false);
      }
    };

    buscarPasta();
    return () => { ativo = false; };
  }, [estudante.id, estudante.nome_completo]);

  // Estados de upload
  const [tipoDoc, setTipoDoc] = useState<TipoDocumentoDrive>('laudo_medico');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroUpload, setErroUpload] = useState<string | null>(null);
  const [sucessoUpload, setSucessoUpload] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formatação segura de datas para evitar 'Invalid Date'
  const formatarDataSegura = (dataVal: any): string => {
    if (!dataVal) return '—';
    try {
      const d = new Date(dataVal);
      if (isNaN(d.getTime())) return '—';
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(d);
    } catch {
      return '—';
    }
  };

  // Estados do Modal de Exclusão do Google Drive
  const [arquivoParaExcluir, setArquivoParaExcluir] = useState<DocumentoEstudanteDrive | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [arquivosExcluidos, setArquivosExcluidos] = useState<string[]>([]);

  // Validador estrito de IDs emitidos pelo Google Drive API
  const isRealDriveId = (id?: string | null): boolean => {
    if (!id || typeof id !== 'string') return false;
    const limpo = id.trim();
    if (
      limpo.startsWith('drive_') ||
      limpo.startsWith('mock_') ||
      limpo.endsWith('_mock') ||
      limpo.includes('mock') ||
      limpo.startsWith('doc-') ||
      limpo === 'default' ||
      limpo.length < 25
    ) {
      return false;
    }
    return /^[a-zA-Z0-9_-]{25,50}$/.test(limpo);
  };

  // Resolução inteligente e garantida da URL de abertura do arquivo no Google Drive (Elimina Erro 400)
  const obterLinkVisualizacao = (doc: DocumentoEstudanteDrive): string => {
    // 1. Extração preliminar de File ID do Google Drive
    let fileId = doc.drive_file_id;
    if (!fileId && doc.id && isRealDriveId(doc.id)) {
      fileId = doc.id;
    }

    const urlSalva = doc.drive_view_url || doc.url_visualizacao || (doc as any).drive_view_link || '';

    // Se temos uma URL salva contendo /file/d/ com ID real do Google Drive
    if (urlSalva) {
      const match = urlSalva.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1] && isRealDriveId(match[1])) {
        return `https://drive.google.com/file/d/${match[1]}/view`;
      }
      if (urlSalva.includes('/drive/folders/')) {
        return urlSalva;
      }
      if (urlSalva.includes('/document/d/') || urlSalva.includes('/forms/d/') || urlSalva.includes('/spreadsheets/d/')) {
        return urlSalva;
      }
      // Se for uma URL lh3 antiga salva, extrai o ID real dela para abrir no Google Drive
      if (urlSalva.includes('googleusercontent.com/d/')) {
        const matchLh3 = urlSalva.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (matchLh3 && matchLh3[1] && isRealDriveId(matchLh3[1])) {
          return `https://drive.google.com/file/d/${matchLh3[1]}/view`;
        }
      }
    }

    // 2. Se o fileId atual é um ID real comprovado do Google Drive
    if (isRealDriveId(fileId)) {
      return `https://drive.google.com/file/d/${fileId}/view`;
    }

    // 3. Se for ID simulado / legado, busca se há correspondência nos arquivos físicos reais da pasta do aluno
    if (arquivosDriveFisicos.length > 0) {
      const docNomeLimpo = (doc.nome_arquivo || '').toLowerCase().replace(/\[[^\]]+\]_/g, '').trim();
      const correspondente = arquivosDriveFisicos.find(af => {
        const afNomeLimpo = (af.nome_arquivo || '').toLowerCase().replace(/\[[^\]]+\]_/g, '').trim();
        return afNomeLimpo.includes(docNomeLimpo) || docNomeLimpo.includes(afNomeLimpo);
      });
      if (correspondente && isRealDriveId(correspondente.drive_file_id)) {
        return `https://drive.google.com/file/d/${correspondente.drive_file_id}/view`;
      }
    }

    // 4. Fallback 100% à prova de Erro 400:
    // Nunca gere /file/d/ para IDs não validados pelo Google. Abra a pasta do estudante no Drive
    if (pastaDriveUrl) {
      return pastaDriveUrl;
    }

    const termoBusca = doc.nome_arquivo || estudante.nome_completo || '';
    return `https://drive.google.com/drive/u/0/search?q=${encodeURIComponent(termoBusca)}`;
  };

  // Confirmação de exclusão física no Google Drive com auditoria
  const confirmarExclusao = async () => {
    if (!arquivoParaExcluir) return;
    const doc = arquivoParaExcluir;
    setExcluindo(true);
    setErroUpload(null);

    const docId = doc.id || '';
    const fileId = doc.drive_file_id || '';
    const nomeArquivo = doc.nome_arquivo || '';

    // 1. Oculta imediatamente da visualização da tela
    setArquivosExcluidos(prev => {
      const novos = [...prev];
      if (docId && !novos.includes(docId)) novos.push(docId);
      if (fileId && !novos.includes(fileId)) novos.push(fileId);
      if (nomeArquivo) {
        const norm = nomeArquivo.toLowerCase().trim();
        if (!novos.includes(norm)) novos.push(norm);
      }
      return novos;
    });

    // 2. Remove imediatamente do estado de arquivos físicos carregados
    setArquivosDriveFisicos(prev =>
      prev.filter(af => {
        if (docId && af.id === docId) return false;
        if (fileId && (af.drive_file_id === fileId || af.id === fileId)) return false;
        if (nomeArquivo && af.nome_arquivo?.toLowerCase().trim() === nomeArquivo.toLowerCase().trim()) return false;
        return true;
      })
    );

    try {
      await deleteDocumentoEstudanteDrive(
        docId,
        fileId,
        nomeArquivo,
        estudante.id
      );
      setSucessoUpload(`Arquivo "${nomeArquivo}" excluído com sucesso e registrado na auditoria.`);
      setTimeout(() => setSucessoUpload(null), 4000);
      setArquivoParaExcluir(null);
    } catch (err: any) {
      // Reverte a ocultação se a exclusão falhar
      setArquivosExcluidos(prev =>
        prev.filter(k => k !== docId && k !== fileId && k !== nomeArquivo.toLowerCase().trim())
      );
      setErroUpload(err.message || 'Erro ao excluir arquivo do Google Drive.');
    } finally {
      setExcluindo(false);
    }
  };

  // Documentos cadastrados para este estudante com ordenação segura e mesclagem de fontes
  const documentos = useMemo(() => {
    const isExcluido = (d: any) => {
      if (!d) return true;
      if (d.id && arquivosExcluidos.includes(d.id)) return true;
      if (d.drive_file_id && arquivosExcluidos.includes(d.drive_file_id)) return true;
      if (d.nome_arquivo && arquivosExcluidos.includes(d.nome_arquivo.toLowerCase().trim())) return true;
      return false;
    };

    const lista1 = documentosEstudanteDrive
      .filter(d => d.aluno_id === estudante.id || (d as any).estudante_id === estudante.id)
      .filter(d => !isExcluido(d));

    // Complementa com documentos anexados diretamente na ficha do estudante (se houver)
    const lista2 = ((estudante as any).documentos || [])
      .filter((d: any) => !isExcluido(d))
      .map((doc: any) => ({
        id: doc.id || `doc-${doc.drive_file_id}`,
        aluno_id: estudante.id,
        estudante_id: estudante.id,
        drive_file_id: doc.drive_file_id,
        nome_arquivo: doc.nome_arquivo,
        url_visualizacao: doc.drive_view_link,
        drive_view_url: doc.drive_view_link,
        tipo_documento: doc.tipo_documento,
        tipo: doc.tipo_documento,
        tamanho_bytes: doc.tamanho_bytes,
        mime_type: doc.mime_type,
        data_upload: doc.created_at,
      }));

    // Complementa com arquivos físicos reais detectados na pasta do Google Drive
    const lista3 = arquivosDriveFisicos
      .filter(af => !isExcluido(af))
      .map((af: any) => ({
        ...af,
        aluno_id: estudante.id,
        estudante_id: estudante.id,
      }));

    // Mescla sem duplicatas priorizando arquivos com IDs reais do Google Drive
    const mapa = new Map<string, DocumentoEstudanteDrive>();
    [...lista1, ...lista2, ...lista3].forEach(doc => {
      if (isExcluido(doc)) return;
      const chave = doc.drive_file_id || doc.id || (doc.nome_arquivo || '').toLowerCase().trim();

      if (chave) {
        const existente = mapa.get(chave);
        if (!existente) {
          mapa.set(chave, doc);
        } else {
          // Se o novo registro tiver ID real do Drive e o anterior não tinha, substitui
          if (!isRealDriveId(existente.drive_file_id) && isRealDriveId(doc.drive_file_id)) {
            mapa.set(chave, {
              ...existente,
              drive_file_id: doc.drive_file_id,
              url_visualizacao: doc.url_visualizacao,
              drive_view_url: doc.drive_view_url,
              drive_download_url: doc.drive_download_url || existente.drive_download_url,
            });
          }
        }
      }
    });

    return Array.from(mapa.values())
      .filter(d => filtroTipo === 'todos' || (d.tipo_documento || d.tipo) === filtroTipo)
      .sort((a, b) => {
        const timeA = new Date(a.data_upload || (a as any).createdTime || 0).getTime() || 0;
        const timeB = new Date(b.data_upload || (b as any).createdTime || 0).getTime() || 0;
        return timeB - timeA;
      });
  }, [documentosEstudanteDrive, estudante.id, (estudante as any).documentos, arquivosDriveFisicos, arquivosExcluidos, filtroTipo]);

  const handleSelecionarArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErroUpload(null);
    if (!e.target.files || e.target.files.length === 0) {
      setArquivo(null);
      return;
    }
    const file = e.target.files[0];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!EXTENSOES_PERMITIDAS.includes(ext)) {
      setErroUpload(`Formato de arquivo inválido (${ext}). Formatos aceitos: .pdf, .png, .jpg, .jpeg`);
      setArquivo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setArquivo(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arquivo) {
      setErroUpload('Por favor, selecione um arquivo.');
      return;
    }

    setEnviando(true);
    setErroUpload(null);
    setSucessoUpload(null);

    try {
      // Validação de Conta Vinculada antes do upload
      const statusRes = await fetch('/api/auth/google-drive/status');
      const statusData = await statusRes.json();
      if (!statusData?.is_connected) {
        setErroUpload('É necessário vincular uma conta Google antes de enviar arquivos.');
        setEnviando(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', arquivo);
      formData.append('aluno_id', estudante.id);
      formData.append('aluno_nome', estudante.nome_completo);
      formData.append('estudante_nome', estudante.nome_completo);
      formData.append('tipo', tipoDoc);
      formData.append('tipo_documento', tipoDoc);
      formData.append('caminho_pasta', caminhoPastaDrive);

      const res = await fetch('/api/upload-drive', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro no envio do arquivo para o Google Drive');
      }

      await addDocumentoEstudanteDrive({
        id: `doc-drive-${Date.now()}`,
        aluno_id: estudante.id,
        tipo: tipoDoc,
        tipo_documento: tipoDoc,
        nome_arquivo: arquivo.name,
        caminho_pasta: caminhoPastaDrive,
        drive_file_id: data.file_id || 'drive_' + Date.now(),
        drive_view_url: data.view_url || 'https://drive.google.com',
        url_visualizacao: data.view_url || 'https://drive.google.com',
        drive_download_url: data.download_url || 'https://drive.google.com',
        tamanho_bytes: arquivo.size,
        mime_type: arquivo.type,
        data_upload: new Date().toISOString(),
      });

      setSucessoUpload(`Arquivo "${arquivo.name}" anexado com sucesso na pasta institucional do Drive!`);
      setArquivo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setSucessoUpload(null), 4000);
    } catch (err: any) {
      setErroUpload(err.message || 'Falha ao enviar arquivo');
    } finally {
      setEnviando(false);
    }
  };

  const formatarTamanho = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Topo e Caminho Normalizado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Folder className="h-5 w-5 text-amber-500" />
            Repositório Google Drive do Estudante
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Armazenamento oficial na nuvem com separação por pastas alfabéticas padronizadas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botão de Acesso Direto à Pasta no Google Drive */}
          <a
            href={pastaDriveUrl || `https://drive.google.com/drive/search?q=${encodeURIComponent(estudante.nome_completo || '')}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir pasta deste estudante no Google Drive"
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white px-3.5 py-1.5 text-xs font-bold shadow-sm transition-all"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span>Abrir Pasta no Google Drive</span>
            <ExternalLink className="h-3 w-3" />
          </a>

          {/* Caminho normalizado com link de acesso rápido */}
          <a
            href={pastaDriveUrl || `https://drive.google.com/drive/search?q=${encodeURIComponent(estudante.nome_completo || '')}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir no Google Drive"
            className="rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-[11px] font-mono font-bold text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Folder className="h-3.5 w-3.5 text-amber-500" />
            <span>{caminhoPastaDrive}</span>
          </a>
        </div>
      </div>

      {erroUpload && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3.5 text-xs font-semibold text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-200">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{erroUpload}</span>
        </div>
      )}

      {sucessoUpload && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{sucessoUpload}</span>
        </div>
      )}

      {/* Formulário de Upload */}
      <form onSubmit={handleUpload} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/40 space-y-4">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
          Anexar Novo Arquivo à Ficha do Aluno:
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
              Tipo de Documento:
            </label>
            <select
              value={tipoDoc}
              onChange={(e) => setTipoDoc(e.target.value as TipoDocumentoDrive)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {Object.entries(TIPOS_DOC_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
              Selecionar Arquivo (.pdf, .png, .jpg, .jpeg):
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,image/png,image/jpeg,application/pdf"
              onChange={handleSelecionarArquivo}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-school-blue-50 file:text-school-blue-700 hover:file:bg-school-blue-100 dark:file:bg-slate-800 dark:file:text-school-gold-400"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
          <span className="text-[11px] text-slate-500">
            Formatos válidos: <strong>PDF, PNG, JPG, JPEG</strong> • Destino: <code className="text-amber-600">{caminhoPastaDrive}</code>
          </span>

          <button
            type="submit"
            disabled={enviando || !arquivo}
            className="inline-flex items-center gap-1.5 rounded-xl bg-school-blue-800 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-school-blue-700 active:scale-95 transition-all disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            <span>{enviando ? 'Enviando ao Drive...' : 'Enviar para o Google Drive'}</span>
          </button>
        </div>
      </form>

      {/* Tabela de Documentos Armazenados com Filtro */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Documentos no Repositório ({documentos.length})
          </h5>

          {/* Filtro por tipo */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[11px] text-slate-400">Filtrar:</span>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="todos">Todos os tipos</option>
              {Object.entries(TIPOS_DOC_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Nome do Arquivo</th>
                <th className="px-4 py-3">Tamanho</th>
                <th className="px-4 py-3">Data Envio</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-school-dark-surface">
              {documentos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-400">
                    Nenhum documento encontrado neste repositório.
                  </td>
                </tr>
              ) : (
                documentos.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 uppercase">
                        {TIPOS_DOC_LABELS[(doc.tipo_documento || doc.tipo) as TipoDocumentoDrive] || doc.tipo_documento || doc.tipo || 'Documento'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileText className="h-4 w-4 text-school-blue-600 dark:text-school-gold-400 shrink-0" />
                      <span className="truncate max-w-xs">{doc.nome_arquivo}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                      {formatarTamanho(doc.tamanho_bytes)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatarDataSegura(doc.data_upload || (doc as any).createdTime || (doc as any).modifiedTime)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={obterLinkVisualizacao(doc)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Visualizar no Google Drive"
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold text-school-blue-600 hover:bg-school-blue-50 dark:text-school-gold-400 dark:hover:bg-slate-800 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Abrir</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => setArquivoParaExcluir(doc)}
                          title="Excluir Arquivo do Google Drive"
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Confirmação Visual de Exclusão no Google Drive */}
      {arquivoParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Excluir Arquivo do Drive
                  </h3>
                  <span className="text-[10px] text-slate-400">Sincronização imediata e auditoria</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setArquivoParaExcluir(null)}
                disabled={excluindo}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              Tem certeza que deseja excluir permanentemente o arquivo{' '}
              <strong className="text-rose-600 dark:text-rose-400 font-mono break-all">
                &ldquo;{arquivoParaExcluir.nome_arquivo}&rdquo;
              </strong>{' '}
              do Google Drive?
            </p>

            <div className="rounded-xl bg-amber-50 p-3 text-[11px] text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300">
              Esta ação removerá o arquivo físico da pasta institucional do Google Drive, desvinculará registros locais e salvará um registro de auditoria imutável.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={excluindo}
                onClick={() => setArquivoParaExcluir(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={excluindo}
                onClick={confirmarExclusao}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{excluindo ? 'Excluindo...' : 'Excluir Permanentemente'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
