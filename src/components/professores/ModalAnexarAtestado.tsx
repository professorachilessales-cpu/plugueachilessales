'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  X, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  FolderTree, 
  Loader2 
} from 'lucide-react';
import { Professor } from '@/lib/types';

interface ModalAnexarAtestadoProps {
  isOpen: boolean;
  onClose: () => void;
  professor: Professor;
  faltas?: any[];
  onSuccess?: () => void;
}

/**
 * Converte data ISO ('YYYY-MM-DD' ou 'YYYY-MM-DDTHH:mm:ss...') para formato brasileiro 'DD/MM/AAAA'
 */
function formatarDataIsoParaBr(dataIso?: string): string {
  if (!dataIso) return '';
  const limpo = dataIso.split('T')[0];
  const partes = limpo.split('-');
  if (partes.length === 3) {
    return `${partes[2].padStart(2, '0')}/${partes[1].padStart(2, '0')}/${partes[0]}`;
  }
  return dataIso;
}

/**
 * Calcula a quantidade de dias entre duas datas ISO no formato YYYY-MM-DD (inclusivo)
 */
function calcularDiasEntreDatas(d1Str: string, d2Str: string): number {
  if (!d1Str || !d2Str) return 1;
  const p1 = d1Str.split('T')[0].split('-').map(Number);
  const p2 = d2Str.split('T')[0].split('-').map(Number);
  if (p1.length < 3 || p2.length < 3) return 1;
  const t1 = new Date(p1[0], p1[1] - 1, p1[2]).getTime();
  const t2 = new Date(p2[0], p2[1] - 1, p2[2]).getTime();
  if (t2 >= t1) {
    return Math.round((t2 - t1) / (1000 * 60 * 60 * 24)) + 1;
  }
  return 1;
}

export function ModalAnexarAtestado({
  isOpen,
  onClose,
  professor,
  faltas,
  onSuccess,
}: ModalAnexarAtestadoProps) {
  const { faltasProfessores, updateFaltaProfessor, addAtestadoProfessor } = useApp();

  const [faltasCarregadas, setFaltasCarregadas] = useState<any[] | null>(null);
  const [carregandoFaltas, setCarregandoFaltas] = useState(false);
  const [selectedFaltaId, setSelectedFaltaId] = useState<string>('');
  const [motivoCid, setMotivoCid] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Busca faltas atualizadas da API ao abrir o modal para garantir sincronia com Turso
  useEffect(() => {
    if (!isOpen || !professor.id) return;
    let isMounted = true;
    setCarregandoFaltas(true);
    fetch(`/api/professores/${professor.id}/faltas`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.faltas)) {
          setFaltasCarregadas(data.faltas);
        }
      })
      .catch((err) => {
        console.warn('Fallback para faltas em memória do AppContext:', err);
      })
      .finally(() => {
        if (isMounted) setCarregandoFaltas(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, professor.id]);

  // Lista de ausências que AINDA NÃO possuem atestado vinculado
  const ausenciasSemAtestado = useMemo(() => {
    const base = faltasCarregadas !== null 
      ? faltasCarregadas 
      : (faltas || (faltasProfessores || []).filter(f => f && f.professor_id === professor.id));

    return base.filter((f) => {
      if (!f) return false;
      const temAtestado = Boolean(
        f.atestado_drive_url ||
        f.atestado_drive_link ||
        f.drive_file_id ||
        f.atestado_drive_id ||
        f.apresentou_atestado
      );
      return !temAtestado;
    });
  }, [faltasCarregadas, faltas, faltasProfessores, professor.id]);

  // Objeto da falta selecionada
  const faltaSelecionada = useMemo(() => {
    if (!selectedFaltaId) return null;
    return ausenciasSemAtestado.find((f) => String(f.id) === String(selectedFaltaId)) || null;
  }, [ausenciasSemAtestado, selectedFaltaId]);

  // Data inicial e final extraídas da ausência selecionada
  const dataInicioFalta = useMemo(() => {
    if (!faltaSelecionada) return '';
    return (faltaSelecionada.data_inicio || faltaSelecionada.data_falta || '').split('T')[0];
  }, [faltaSelecionada]);

  const dataFimFalta = useMemo(() => {
    if (!faltaSelecionada) return '';
    return (faltaSelecionada.data_fim || dataInicioFalta).split('T')[0];
  }, [faltaSelecionada, dataInicioFalta]);

  // Identifica se a ausência selecionada corresponde a um período (múltiplos dias)
  const isPeriodo = useMemo(() => {
    if (!faltaSelecionada) return false;
    if (faltaSelecionada.tipo_registro === 'PERIODO') return true;
    if (dataInicioFalta && dataFimFalta && dataInicioFalta !== dataFimFalta) {
      return calcularDiasEntreDatas(dataInicioFalta, dataFimFalta) > 1;
    }
    return false;
  }, [faltaSelecionada, dataInicioFalta, dataFimFalta]);

  // Quantidade de dias de afastamento
  const quantidadeDias = useMemo(() => {
    if (!faltaSelecionada) return 1;
    if (!isPeriodo) return 1;
    return calcularDiasEntreDatas(dataInicioFalta, dataFimFalta);
  }, [faltaSelecionada, isPeriodo, dataInicioFalta, dataFimFalta]);

  if (!isOpen) return null;

  const letraInicial = (professor.nome_completo || 'P').trim().charAt(0).toUpperCase();
  const nomeDocenteFormatado = (professor.nome_completo || 'DOCENTE').trim().toUpperCase();

  const handleSelectFaltaChange = (faltaId: string) => {
    setSelectedFaltaId(faltaId);
    setErro(null);

    const falta = ausenciasSemAtestado.find((f) => String(f.id) === String(faltaId));
    if (falta && (falta.motivo || falta.justificativa) && !motivoCid.trim()) {
      setMotivoCid(falta.motivo || falta.justificativa || '');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Limite máximo de 10 MB
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

    if (!selectedFaltaId || !faltaSelecionada) {
      setErro('Por favor, selecione a ausência cadastrada correspondente ao atestado.');
      return;
    }

    if (!arquivo) {
      setErro('Por favor, anexe o arquivo digitalizado do atestado (.pdf, .png, .jpg, .jpeg).');
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

      // 2. Preparação do FormData com metadados estruturados
      const formData = new FormData();
      formData.append('file', arquivo);
      formData.append('tipo_upload', 'professor_atestado');
      formData.append('professor_id', professor.id);
      formData.append('professor_nome', professor.nome_completo);
      formData.append('tipo_documento', 'Atestado');
      formData.append('data_inicio', dataInicioFalta);
      formData.append('data_fim', dataFimFalta);
      formData.append('dias_afastamento', String(quantidadeDias));
      formData.append('quantidade_dias', String(quantidadeDias));
      formData.append('falta_id', selectedFaltaId);
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

      const urlAtestado = data.atestado_drive_url || data.url_visualizacao;

      // 3. Atualiza estado global de atestados
      addAtestadoProfessor({
        professor_id: professor.id,
        falta_id: selectedFaltaId,
        drive_file_id: data.drive_file_id,
        atestado_drive_url: urlAtestado,
        drive_view_url: urlAtestado,
        nome_arquivo: data.nome_arquivo || arquivo.name,
        data_inicio: dataInicioFalta,
        data_fim: dataFimFalta,
        dias_afastamento: quantidadeDias,
        quantidade_dias: quantidadeDias,
        motivo_cid: motivoCid.trim() || 'Licença Médica',
      });

      // 4. Vincula atestado à falta cadastrada no contexto
      updateFaltaProfessor(selectedFaltaId, {
        atestado_drive_url: urlAtestado,
        atestado_drive_link: urlAtestado,
        drive_file_id: data.drive_file_id,
        atestado_drive_id: data.drive_file_id,
        apresentou_atestado: true,
      });

      if (onSuccess) {
        onSuccess();
      }

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
            aria-label="Fechar"
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
          
          {/* 1. SELEÇÃO INTELIGENTE: Data da Ausência */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Data da Ausência *
              </label>
              {carregandoFaltas && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Atualizando ausências...
                </span>
              )}
            </div>

            {ausenciasSemAtestado.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Nenhuma ausência pendente de atestado registrada para este docente.</span>
              </div>
            ) : (
              <select
                value={selectedFaltaId}
                onChange={(e) => handleSelectFaltaChange(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-school-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white shadow-xs"
              >
                <option value="">-- Selecione a ausência cadastrada --</option>
                {ausenciasSemAtestado.map((f) => {
                  const dIni = (f.data_inicio || f.data_falta || '').split('T')[0];
                  const dFim = (f.data_fim || dIni).split('T')[0];
                  const dias = calcularDiasEntreDatas(dIni, dFim);
                  const isMult = dFim && dFim !== dIni && dias > 1;

                  const rotuloData = isMult
                    ? `${formatarDataIsoParaBr(dIni)} a ${formatarDataIsoParaBr(dFim)} (${dias} dias)`
                    : `${formatarDataIsoParaBr(dIni)} (Dia Único)`;

                  const rotuloMotivo = f.motivo || f.justificativa ? ` • ${f.motivo || f.justificativa}` : '';

                  return (
                    <option key={f.id} value={f.id}>
                      {rotuloData}{rotuloMotivo}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* 2. COMPORTAMENTO DINÂMICO AO SELECIONAR A AUSÊNCIA */}
          {faltaSelecionada && (
            <div className="animate-in fade-in-0 duration-200">
              {!isPeriodo ? (
                /* DIA ÚNICO */
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Data da Ausência
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={formatarDataIsoParaBr(dataInicioFalta)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-100/90 dark:border-slate-700 dark:bg-slate-800/80 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-default shadow-xs"
                    />
                    <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                  <span className="mt-1 block text-[10px] text-slate-500 dark:text-slate-400">
                    Ausência de dia único (1 dia de afastamento).
                  </span>
                </div>
              ) : (
                /* INTERVALO DE DIAS */
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Data Inicial
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          readOnly
                          value={formatarDataIsoParaBr(dataInicioFalta)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-100/90 dark:border-slate-700 dark:bg-slate-800/80 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-default shadow-xs"
                        />
                        <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Data Final
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          readOnly
                          value={formatarDataIsoParaBr(dataFimFalta)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-100/90 dark:border-slate-700 dark:bg-slate-800/80 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-default shadow-xs"
                        />
                        <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span>Período de afastamento computado:</span>
                    <span className="font-bold text-school-blue-700 dark:text-school-gold-400">
                      {quantidadeDias} dias
                    </span>
                  </div>
                </div>
              )}
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

          {/* 5. Prévia da Hierarquia Estruturada no Google Drive */}
          <div className="rounded-2xl bg-blue-50/50 p-3 dark:bg-slate-800/40 border border-blue-100/60 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5 font-bold text-school-blue-800 dark:text-school-gold-400 mb-1">
              <FolderTree className="h-3.5 w-3.5" />
              <span>Hierarquia no Google Drive:</span>
            </div>
            <code className="block font-mono text-[10px] text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-900/60 px-2 py-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50 break-all">
              FICHA DOS PROFESSORES / {letraInicial} / {nomeDocenteFormatado} / atestado_{(dataInicioFalta || 'DATA').replace(/-/g, '_')}_[ID_UNICO].[ext]
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
              disabled={enviando || !arquivo || !selectedFaltaId}
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
