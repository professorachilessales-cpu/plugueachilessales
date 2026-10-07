'use client';

import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  X, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Clock, 
  FolderTree, 
  Loader2 
} from 'lucide-react';
import { Professor } from '@/lib/types';

interface ModalAnexarAtestadoProps {
  isOpen: boolean;
  onClose: () => void;
  professor: Professor;
}

export function ModalAnexarAtestado({
  isOpen,
  onClose,
  professor,
}: ModalAnexarAtestadoProps) {
  const { addAtestadoProfessor } = useApp();

  const [tipoPeriodo, setTipoPeriodo] = useState<'dia_unico' | 'intervalo'>('dia_unico');
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  const [motivoCid, setMotivoCid] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Computa a quantidade de dias
  const quantidadeDias = useMemo(() => {
    if (tipoPeriodo === 'dia_unico') return 1;
    if (!dataInicio || !dataFim) return 1;
    const p1 = dataInicio.split('-').map(Number);
    const p2 = dataFim.split('-').map(Number);
    if (p1.length < 3 || p2.length < 3) return 1;
    const d1 = new Date(p1[0], p1[1] - 1, p1[2]).getTime();
    const d2 = new Date(p2[0], p2[1] - 1, p2[2]).getTime();
    if (d2 >= d1) {
      return Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    }
    return 1;
  }, [tipoPeriodo, dataInicio, dataFim]);

  if (!isOpen) return null;

  const letraInicial = (professor.nome_completo || 'P').trim().charAt(0).toUpperCase();
  const nomeDocenteFormatado = (professor.nome_completo || 'DOCENTE').trim().toUpperCase();

  const handleTipoPeriodoChange = (tipo: 'dia_unico' | 'intervalo') => {
    setTipoPeriodo(tipo);
    if (tipo === 'dia_unico') {
      setDataFim(dataInicio);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Limite recomendado de 10 MB
    if (selected.size > 10 * 1024 * 1024) {
      setErro(`O arquivo selecionado (${(selected.size / 1024 / 1024).toFixed(1)} MB) excede o limite máximo permitido de 10 MB.`);
      setArquivo(null);
      return;
    }

    setErro(null);
    setArquivo(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arquivo) {
      setErro('Por favor, anexe o arquivo digitalizado do atestado (.pdf, .png, .jpg, .jpeg).');
      return;
    }

    const dataFinalEfetiva = tipoPeriodo === 'dia_unico' ? dataInicio : dataFim;
    if (tipoPeriodo === 'intervalo' && dataFinalEfetiva < dataInicio) {
      setErro('A Data Final não pode ser anterior à Data Inicial.');
      return;
    }

    setErro(null);
    setEnviando(true);

    try {
      // 1. Validação de Conta Conectada
      const statusRes = await fetch('/api/auth/google-drive/status');
      const statusData = await statusRes.json();
      if (!statusData?.is_connected) {
        setErro('É necessário vincular uma conta Google antes de enviar arquivos.');
        setEnviando(false);
        return;
      }

      // 2. Preparação do FormData para envio com estrutura de diretórios padronizada
      const formData = new FormData();
      formData.append('file', arquivo);
      formData.append('tipo_upload', 'professor_atestado');
      formData.append('professor_id', professor.id);
      formData.append('professor_nome', professor.nome_completo);
      formData.append('tipo_documento', 'Atestado');
      formData.append('data_inicio', dataInicio);
      formData.append('data_fim', dataFinalEfetiva);
      formData.append('dias_afastamento', String(quantidadeDias));
      formData.append('quantidade_dias', String(quantidadeDias));
      if (motivoCid.trim()) {
        formData.append('motivo_cid', motivoCid.trim());
      }

      const res = await fetch('/api/upload-drive', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao sincronizar o atestado no Google Drive.');
      }

      // 3. Atualiza estado global
      addAtestadoProfessor({
        professor_id: professor.id,
        drive_file_id: data.drive_file_id,
        atestado_drive_url: data.atestado_drive_url || data.url_visualizacao,
        drive_view_url: data.atestado_drive_url || data.url_visualizacao,
        nome_arquivo: data.nome_arquivo || arquivo.name,
        data_inicio: dataInicio,
        data_fim: dataFinalEfetiva,
        dias_afastamento: quantidadeDias,
        quantidade_dias: quantidadeDias,
        motivo_cid: motivoCid.trim() || 'Licença Médica',
      });

      setSucesso(true);
      setTimeout(() => {
        setSucesso(false);
        onClose();
      }, 1400);
    } catch (e: any) {
      setErro(e.message || 'Erro ao realizar upload do atestado para o Google Drive.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-school-blue-100 p-2 text-school-blue-700 dark:bg-school-blue-950 dark:text-school-gold-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Novo Atestado
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Docente: <strong className="text-slate-700 dark:text-slate-200">{professor.nome_completo}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={enviando}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Feedback de Erro */}
        {erro && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 flex items-center gap-2 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {/* Feedback de Sucesso */}
        {sucesso && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>Atestado salvo e sincronizado no Google Drive com sucesso!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* 1. Tipo de Período (Dia Único vs Intervalo de Dias) */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Tipo de Período *
            </label>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => handleTipoPeriodoChange('dia_unico')}
                className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all ${
                  tipoPeriodo === 'dia_unico'
                    ? 'bg-white text-school-blue-700 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Dia Único</span>
              </button>

              <button
                type="button"
                onClick={() => handleTipoPeriodoChange('intervalo')}
                className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all ${
                  tipoPeriodo === 'intervalo'
                    ? 'bg-white text-school-blue-700 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Intervalo de Dias</span>
              </button>
            </div>
          </div>

          {/* 2. Datas da Ausência */}
          {tipoPeriodo === 'dia_unico' ? (
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Data da Ausência *
              </label>
              <input
                type="date"
                required
                value={dataInicio}
                onChange={(e) => {
                  setDataInicio(e.target.value);
                  setDataFim(e.target.value);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:border-school-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <span className="mt-1 block text-[10px] text-slate-400">
                Computado: 1 dia de afastamento
              </span>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Data Inicial *
                  </label>
                  <input
                    type="date"
                    required
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Data Final *
                  </label>
                  <input
                    type="date"
                    required
                    value={dataFim}
                    min={dataInicio}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                <span>Período computado:</span>
                <span className="font-bold text-school-blue-700 dark:text-school-gold-400">
                  {quantidadeDias} {quantidadeDias === 1 ? 'dia' : 'dias'} de afastamento
                </span>
              </div>
            </div>
          )}

          {/* 3. Motivo / CID (Opcional) */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Motivo / CID (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: J10.1 - Influenza ou Consulta Médica"
              value={motivoCid}
              onChange={(e) => setMotivoCid(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-school-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* 4. Arquivo Digitalizado (Obrigatório) */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Arquivo Digitalizado (.pdf, .png, .jpg, .jpeg) *
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-slate-300 hover:border-school-blue-500 bg-slate-50 hover:bg-blue-50/50 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:bg-slate-800 cursor-pointer transition-colors text-center"
            >
              <UploadCloud className="h-8 w-8 text-school-blue-600 dark:text-school-gold-400 mb-1" />
              {arquivo ? (
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-xs">
                    {arquivo.name}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    {(arquivo.size / 1024).toFixed(1)} KB • Pronto para upload
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Clique para selecionar o arquivo
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Formatos aceitos: PDF, PNG, JPG ou JPEG (máximo 10 MB)
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* 5. Prévia do Diretório Estruturado no Drive */}
          <div className="rounded-2xl bg-blue-50/50 p-3 dark:bg-slate-800/40 border border-blue-100/60 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5 font-bold text-school-blue-800 dark:text-school-gold-400 mb-1">
              <FolderTree className="h-3.5 w-3.5" />
              <span>Hierarquia no Google Drive:</span>
            </div>
            <code className="block font-mono text-[10px] text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-900/60 px-2 py-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50 break-all">
              FICHA DOS PROFESSORES / {letraInicial} / {nomeDocenteFormatado} / atestado_{(dataInicio || 'DATA').replace(/-/g, '_')}_[ID_UNICO].[ext]
            </code>
          </div>

          {/* Ações */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={enviando}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando || !arquivo}
              className="inline-flex items-center gap-1.5 rounded-xl bg-school-blue-800 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-school-blue-700 disabled:opacity-50 transition-colors"
            >
              {enviando ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Sincronizando no Drive...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-3.5 w-3.5" />
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
