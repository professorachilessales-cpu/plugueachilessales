'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Estudante, DocumentoEstudanteDrive, TipoDocumentoDrive } from '@/lib/types';
import { 
  Upload, 
  FileText, 
  Folder, 
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
  const primeiraLetra = (estudante.nome_completo || 'A').trim().charAt(0).toUpperCase();
  const nomeEstudanteFormatado = (estudante.nome_completo || 'ESTUDANTE').trim().toUpperCase();
  const caminhoPastaDrive = `FICHA DOS ESTUDANTES / ${primeiraLetra} / ${nomeEstudanteFormatado}`;

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

  // Resolução inteligente da URL de abertura do arquivo (Web View ou Mídia Direta)
  const obterLinkVisualizacao = (doc: DocumentoEstudanteDrive): string => {
    // 1. Extração do File ID real do Google Drive
    let fileId = doc.drive_file_id;
    if (!fileId && doc.id && !doc.id.startsWith('doc-')) {
      fileId = doc.id;
    }
    if (!fileId && (doc.drive_view_url || doc.url_visualizacao)) {
      const urlStr = doc.drive_view_url || doc.url_visualizacao || '';
      const match = urlStr.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        fileId = match[1];
      }
    }

    const nome = (doc.nome_arquivo || '').toLowerCase();
    const isImagemOuMidia =
      nome.endsWith('.png') ||
      nome.endsWith('.jpg') ||
      nome.endsWith('.jpeg') ||
      (doc.mime_type && doc.mime_type.startsWith('image/'));

    // Link direto de imagem/mídia formatado (lh3)
    if (fileId && isImagemOuMidia && !fileId.startsWith('drive_sim_') && !fileId.startsWith('mock_')) {
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }

    // Link padrão de visualização web do Google Drive
    if (fileId && !fileId.startsWith('drive_sim_') && !fileId.startsWith('mock_')) {
      return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
    }

    // Fallbacks para URLs salvas válidas
    if (doc.drive_view_url && doc.drive_view_url !== 'https://drive.google.com' && doc.drive_view_url !== '#') {
      return doc.drive_view_url;
    }
    if (doc.url_visualizacao && doc.url_visualizacao !== 'https://drive.google.com' && doc.url_visualizacao !== '#') {
      return doc.url_visualizacao;
    }

    if (fileId) {
      return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
    }

    return 'https://drive.google.com';
  };

  // Confirmação de exclusão física no Google Drive com auditoria
  const confirmarExclusao = async () => {
    if (!arquivoParaExcluir) return;
    const doc = arquivoParaExcluir;
    setExcluindo(true);
    setErroUpload(null);
    try {
      await deleteDocumentoEstudanteDrive(
        doc.id || '',
        doc.drive_file_id,
        doc.nome_arquivo,
        estudante.id
      );
      setSucessoUpload(`Arquivo "${doc.nome_arquivo}" excluído do Google Drive com sucesso e registrado na auditoria.`);
      setTimeout(() => setSucessoUpload(null), 4000);
      setArquivoParaExcluir(null);
    } catch (err: any) {
      setErroUpload(err.message || 'Erro ao excluir arquivo do Google Drive.');
    } finally {
      setExcluindo(false);
    }
  };

  // Documentos cadastrados para este estudante com ordenação segura
  const documentos = useMemo(() => {
    return documentosEstudanteDrive
      .filter(d => d.aluno_id === estudante.id)
      .filter(d => filtroTipo === 'todos' || (d.tipo_documento || d.tipo) === filtroTipo)
      .sort((a, b) => {
        const timeA = new Date(a.data_upload || (a as any).createdTime || 0).getTime() || 0;
        const timeB = new Date(b.data_upload || (b as any).createdTime || 0).getTime() || 0;
        return timeB - timeA;
      });
  }, [documentosEstudanteDrive, estudante.id, filtroTipo]);

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

        {/* Caminho normalizado */}
        <div className="rounded-xl bg-slate-100 px-3 py-1.5 text-[11px] font-mono font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
          <Folder className="h-3.5 w-3.5 text-amber-500" />
          <span>{caminhoPastaDrive}</span>
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
