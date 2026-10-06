'use client';

import React, { useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  X, 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Trash2,
  ExternalLink 
} from 'lucide-react';
import { FaltaProfessor } from '@/lib/types';

interface ModalSubstituirAtestadoFaltaProps {
  isOpen: boolean;
  onClose: () => void;
  falta: FaltaProfessor | null;
}

export function ModalSubstituirAtestadoFalta({
  isOpen,
  onClose,
  falta,
}: ModalSubstituirAtestadoFaltaProps) {
  const { updateFaltaProfessor, currentUser } = useApp();

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [salvando, setSalvando] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !falta) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['.pdf', '.png', '.jpg', '.jpeg'];
    const nameLower = file.name.toLowerCase();
    const isValid = allowed.some(ext => nameLower.endsWith(ext));

    if (!isValid) {
      setErro('Formato inválido. Selecione um arquivo PDF, PNG ou JPEG.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setArquivo(file);
    setErro(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arquivo) {
      setErro('Por favor, selecione o novo arquivo de atestado.');
      return;
    }

    setErro(null);
    setSalvando(true);

    try {
      // 1. Upload do novo arquivo no Drive
      const formData = new FormData();
      formData.append('file', arquivo);
      formData.append('tipo_upload', 'professor_atestado');
      formData.append('professor_id', falta.professor_id);
      formData.append('professor_nome', falta.professor_nome);
      formData.append('tipo_documento', 'Atestado');
      formData.append('data_inicio', falta.data_inicio || falta.data_falta);
      formData.append('data_fim', falta.data_fim || falta.data_falta);
      formData.append('falta_id', falta.id);

      const res = await fetch('/api/upload-drive', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao realizar upload para o Google Drive.');
      }

      const novoDriveFileId = data.drive_file_id;
      const novoDriveUrl = data.url_visualizacao || data.webViewLink;

      // 2. Se existia arquivo antigo diferente, podemos excluir com auditoria
      const driveAntigoId = falta.drive_file_id || falta.atestado_drive_id;
      if (driveAntigoId && driveAntigoId !== novoDriveFileId) {
        try {
          await fetch('/api/upload-drive', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': currentUser.id,
              'x-user-name': currentUser.name,
              'x-user-role': currentUser.role,
            },
            body: JSON.stringify({
              fileId: driveAntigoId,
              faltaId: falta.id,
              professorId: falta.professor_id,
              nomeArquivo: `atestado_anterior_${falta.id}`,
            }),
          });
        } catch {
          // Ignora falha na exclusão do arquivo antigo
        }
      }

      // 3. Atualizar estado local
      updateFaltaProfessor(falta.id, {
        atestado_drive_url: novoDriveUrl,
        atestado_drive_link: novoDriveUrl,
        drive_file_id: novoDriveFileId,
        atestado_drive_id: novoDriveFileId,
      });

      setSucesso(true);
      setTimeout(() => {
        setSucesso(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Erro ao substituir atestado:', err);
      setErro(err.message || 'Erro ao realizar upload do novo atestado.');
    } finally {
      setSalvando(false);
    }
  };

  const temAtestadoAtual = Boolean(falta.atestado_drive_url || falta.atestado_drive_link);
  const linkAtual = falta.atestado_drive_url || falta.atestado_drive_link;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm animate-in fade-in-0">
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {temAtestadoAtual ? 'Substituir Atestado Médico' : 'Anexar Atestado Médico'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Docente: <strong className="uppercase">{falta.professor_nome}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={salvando}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {erro && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-rose-50 p-3.5 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>{erro}</div>
            </div>
          )}

          {sucesso && (
            <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 p-3.5 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <div className="font-bold">Atestado médico atualizado com sucesso no Google Drive!</div>
            </div>
          )}

          {temAtestadoAtual && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                Atestado Atual Anexado
              </span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-xs">
                  {falta.drive_file_id || falta.atestado_drive_id || 'Arquivo no Google Drive'}
                </span>
                <a
                  href={linkAtual}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-school-blue-600 dark:text-school-gold-400 hover:underline"
                >
                  <span>Abrir no Drive</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider text-[11px]">
              Selecione o Novo Arquivo (.pdf, .png, .jpg, .jpeg) *
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              onChange={handleFileChange}
              className="hidden"
            />

            {!arquivo ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={salvando}
                className="w-full flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-5 hover:border-school-blue-500 hover:bg-school-blue-50/20 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-school-gold-400 transition-all cursor-pointer"
              >
                <UploadCloud className="h-7 w-7 text-school-blue-600 dark:text-school-gold-400" />
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Clique para escolher o novo arquivo
                </span>
                <span className="text-[10px] text-slate-400">
                  O arquivo será sincronizado na pasta individual do docente no Google Drive
                </span>
              </button>
            ) : (
              <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white truncate max-w-xs">
                      {arquivo.name}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      {(arquivo.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setArquivo(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  disabled={salvando}
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando || !arquivo}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
            >
              {salvando ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Enviando para o Drive...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Salvar Atestado</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
