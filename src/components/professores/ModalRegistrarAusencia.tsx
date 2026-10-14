'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  X, 
  Calendar, 
  CalendarRange, 
  Clock, 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  RotateCcw, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  User,
  Loader2,
  Trash2
} from 'lucide-react';
import { Professor, TipoRegistroAusencia } from '@/lib/types';
import { calcularAulasDevidasGrade, ResultadoCalculoAulas } from '@/lib/ausencias-service';

interface ModalRegistrarAusenciaProps {
  isOpen: boolean;
  onClose: () => void;
  professorPreSelecionadoId?: string;
}

const MOTIVOS_SUGERIDOS = [
  'Atestado Médico / Licença Saúde',
  'Licença Gala (Casamento)',
  'Licença Luto (Falecimento de parente)',
  'Assunto Particular / Compromisso Pessoal',
  'Convocação Judicial / Júri',
  'Doação de Sangue',
  'Acompanhamento Familiar / Dependente',
  'Outros'
];

export function ModalRegistrarAusencia({
  isOpen,
  onClose,
  professorPreSelecionadoId,
}: ModalRegistrarAusenciaProps) {
  const { 
    professores, 
    turmas, 
    eventos, 
    addFaltaProfessor, 
    currentUser 
  } = useApp();

  const hoje = new Date().toISOString().split('T')[0];

  // Estado do formulário
  const [professorId, setProfessorId] = useState<string>(professorPreSelecionadoId || professores[0]?.id || '');
  const [tipoRegistro, setTipoRegistro] = useState<TipoRegistroAusencia>('DATA_UNICA');
  const [dataAusencia, setDataAusencia] = useState<string>(hoje);
  const [dataInicio, setDataInicio] = useState<string>(hoje);
  const [dataFim, setDataFim] = useState<string>(hoje);

  // Aulas devidas
  const [aulasTotaisDevidas, setAulasTotaisDevidas] = useState<number>(1);
  const [valorAlteradoManualmente, setValorAlteradoManualmente] = useState<boolean>(false);

  // Motivo e observações
  const [motivo, setMotivo] = useState<string>('Atestado Médico / Licença Saúde');
  const [justificativaDetalhada, setJustificativaDetalhada] = useState<string>('');
  const [observacao, setObservacao] = useState<string>('');

  // Atestado Drive
  const [arquivoAtestado, setArquivoAtestado] = useState<File | null>(null);
  const [linkDriveManual, setLinkDriveManual] = useState<string>('');
  const [modoLinkManual, setModoLinkManual] = useState<boolean>(false);

  // Estados de submissão e UI
  const [salvando, setSalvando] = useState<boolean>(false);
  const [progressoUpload, setProgressoUpload] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<boolean>(false);
  const [expandirDetalhamento, setExpandirDetalhamento] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Atualiza professor selecionado ao abrir ou receber prop
  useEffect(() => {
    if (isOpen) {
      if (professorPreSelecionadoId) {
        setProfessorId(professorPreSelecionadoId);
      } else if (!professorId && professores.length > 0) {
        setProfessorId(professores[0].id);
      }
      setErro(null);
      setSucesso(false);
      setProgressoUpload(null);
    }
  }, [isOpen, professorPreSelecionadoId, professores]);

  const professorSelecionado = useMemo(() => {
    return professores.find(p => p.id === professorId);
  }, [professores, professorId]);

  // Datas consolidadas
  const dataInicioEfetiva = tipoRegistro === 'DATA_UNICA' ? dataAusencia : dataInicio;
  const dataFimEfetiva = tipoRegistro === 'DATA_UNICA' ? dataAusencia : dataFim;

  // Validação: dataFim >= dataInicio
  const erroIntervaloDatas = useMemo(() => {
    if (tipoRegistro === 'PERIODO' && dataInicio && dataFim) {
      if (dataFim < dataInicio) {
        return 'A data de término não pode ser anterior à data de início.';
      }
    }
    return null;
  }, [tipoRegistro, dataInicio, dataFim]);

  // Cálculo automático via grade horária
  const calculoGrade: ResultadoCalculoAulas = useMemo(() => {
    if (!professorId || !dataInicioEfetiva || erroIntervaloDatas) {
      return {
        aulasCalculadasSistema: 0,
        resumoFormatado: 'Informe o docente e as datas válidas.',
        diasDetalhados: [],
        totalDiasLetivos: 0,
        totalDiasIntervalo: 0,
      };
    }

    return calcularAulasDevidasGrade({
      professorId,
      professorNome: professorSelecionado?.nome_completo,
      tipoRegistro,
      dataInicio: dataInicioEfetiva,
      dataFim: dataFimEfetiva,
      turmas,
      eventos,
    });
  }, [professorId, professorSelecionado, tipoRegistro, dataInicioEfetiva, dataFimEfetiva, erroIntervaloDatas, turmas, eventos]);

  // Atualiza o valor de aulasTotaisDevidas automaticamente quando o cálculo muda, exceto se usuário alterou manualmente
  useEffect(() => {
    if (!valorAlteradoManualmente) {
      setAulasTotaisDevidas(calculoGrade.aulasCalculadasSistema);
    }
  }, [calculoGrade.aulasCalculadasSistema, valorAlteradoManualmente]);

  // Se o professor ou tipo de data mudar, resetamos a alteração manual para recarregar a grade sugerida
  const handleProfessorChange = (novoId: string) => {
    setProfessorId(novoId);
    setValorAlteradoManualmente(false);
  };

  const handleTipoRegistroChange = (novoTipo: TipoRegistroAusencia) => {
    setTipoRegistro(novoTipo);
    setValorAlteradoManualmente(false);
  };

  const handleDataAusenciaChange = (novaData: string) => {
    setDataAusencia(novaData);
    setValorAlteradoManualmente(false);
  };

  const handleDataInicioChange = (novaData: string) => {
    setDataInicio(novaData);
    if (novaData > dataFim) {
      setDataFim(novaData);
    }
    setValorAlteradoManualmente(false);
  };

  const handleDataFimChange = (novaData: string) => {
    setDataFim(novaData);
    setValorAlteradoManualmente(false);
  };

  const handleAulasTotaisChange = (novoValor: number) => {
    const val = Math.max(0, isNaN(novoValor) ? 0 : novoValor);
    setAulasTotaisDevidas(val);
    setValorAlteradoManualmente(true);
  };

  const restaurarValorSugerido = () => {
    setAulasTotaisDevidas(calculoGrade.aulasCalculadasSistema);
    setValorAlteradoManualmente(false);
  };

  // Upload e Validação de Arquivo
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

    setArquivoAtestado(file);
    setErro(null);
  };

  const removerArquivoSelecionado = () => {
    setArquivoAtestado(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Submissão do Formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!professorId) {
      setErro('Selecione o docente.');
      return;
    }

    if (erroIntervaloDatas) {
      setErro(erroIntervaloDatas);
      return;
    }

    setErro(null);
    setSalvando(true);

    try {
      let finalDriveViewUrl: string | undefined = linkDriveManual ? linkDriveManual.trim() : undefined;
      let finalDriveFileId: string | undefined = undefined;

      // 1. Upload do Atestado no Google Drive se houver arquivo anexado
      if (arquivoAtestado) {
        setProgressoUpload('Enviando atestado para o Google Drive institucional...');

        const formData = new FormData();
        formData.append('file', arquivoAtestado);
        formData.append('tipo_upload', 'professor_atestado');
        formData.append('professor_id', professorId);
        formData.append('professor_nome', professorSelecionado?.nome_completo || 'Docente');
        formData.append('tipo_documento', 'Atestado');
        formData.append('data_inicio', dataInicioEfetiva);
        formData.append('data_fim', dataFimEfetiva);
        formData.append('motivo_cid', motivo);

        const uploadRes = await fetch('/api/upload-drive', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Falha ao salvar atestado médico no Google Drive.');
        }

        finalDriveFileId = uploadData.drive_file_id;
        finalDriveViewUrl = uploadData.url_visualizacao || uploadData.webViewLink;
      }

      setProgressoUpload('Gravando registro de ausência no sistema...');

      const justificativaFinal = justificativaDetalhada.trim()
        ? `${motivo.toUpperCase()} - ${justificativaDetalhada.trim().toUpperCase()}`
        : motivo.toUpperCase();

      // 2. Gravar o registro da ausência no banco de dados e estado global
      addFaltaProfessor({
        professor_id: professorId,
        professor_nome: professorSelecionado?.nome_completo || 'Docente',
        tipo_registro: tipoRegistro,
        data_inicio: dataInicioEfetiva,
        data_fim: dataFimEfetiva,
        data_falta: dataInicioEfetiva,
        aulas_calculadas_sistema: calculoGrade.aulasCalculadasSistema,
        aulas_totais_devidas: aulasTotaisDevidas,
        aulas_faltadas: aulasTotaisDevidas,
        motivo: motivo,
        justificativa: justificativaFinal,
        atestado_drive_url: finalDriveViewUrl,
        atestado_drive_link: finalDriveViewUrl,
        drive_file_id: finalDriveFileId,
        atestado_drive_id: finalDriveFileId,
        observacao: observacao.trim() || undefined,
        usuario_registro_id: currentUser?.id,
      });

      setSucesso(true);
      setTimeout(() => {
        setSucesso(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Erro ao registrar ausência:', err);
      setErro(err.message || 'Erro inesperado ao registrar ausência.');
    } finally {
      setSalvando(false);
      setProgressoUpload(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-100 dark:bg-slate-900 shadow-2xl border border-slate-300 dark:border-slate-800 overflow-hidden">
        
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4.5 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-school-blue-100 text-school-blue-800 border border-school-blue-200 dark:bg-school-blue-950 dark:text-school-gold-400 dark:border-school-blue-900">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Registrar Ausência / Falta Docente
              </h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Contagem automática pela grade horária e sincronização no Google Drive
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={salvando}
            aria-label="Fechar modal"
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-transparent hover:border-slate-200 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo do Formulário com Scroll Suave e Fundo Neutro Estruturado */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-xs bg-slate-100/70 dark:bg-slate-950/40">
          
          {/* Alertas de Feedback */}
          {erro && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-rose-50 p-4 text-rose-800 border-2 border-rose-200 shadow-xs dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <div className="leading-relaxed font-semibold">{erro}</div>
            </div>
          )}

          {sucesso && (
            <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 p-4 text-emerald-900 border-2 border-emerald-300 shadow-xs dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="font-black text-sm">Ausência registrada com sucesso e atestado sincronizado!</div>
            </div>
          )}

          {/* CARD 1: SELEÇÃO DO DOCENTE E PERÍODO */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 space-y-4">
            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider text-[11px]">
                Selecione o Docente *
              </label>
              <div className="relative">
                <select
                  required
                  value={professorId}
                  onChange={(e) => handleProfessorChange(e.target.value)}
                  disabled={salvando}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold uppercase text-slate-900 shadow-xs hover:border-slate-400 focus:border-school-blue-600 focus:ring-2 focus:ring-school-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {professores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome_completo} {p.matricula ? `(Matrícula: ${p.matricula})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {professorSelecionado && (
                <div className="mt-2 flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-[11px] text-slate-700 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-300">
                  <User className="h-4 w-4 text-school-blue-700 dark:text-school-gold-400 shrink-0" />
                  <span>
                    Cargo/Vínculo: <strong className="text-slate-900 dark:text-white uppercase font-bold">{professorSelecionado.tipo_profissional || 'Docente'}</strong>
                    {professorSelecionado.disciplinas && professorSelecionado.disciplinas.length > 0 && (
                      <> • Disciplina(s): <span className="font-semibold text-slate-800 dark:text-slate-200">{professorSelecionado.disciplinas.join(', ')}</span></>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* MODALIDADE DE REGISTRO (SEGMENTED CONTROL) */}
            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider text-[11px]">
                Modalidade do Registro *
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => handleTipoRegistroChange('DATA_UNICA')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold text-xs transition-all ${
                    tipoRegistro === 'DATA_UNICA'
                      ? 'bg-school-blue-800 text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60 font-semibold'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  <span>Data Única (1 dia)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTipoRegistroChange('PERIODO')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold text-xs transition-all ${
                    tipoRegistro === 'PERIODO'
                      ? 'bg-school-blue-800 text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60 font-semibold'
                  }`}
                >
                  <CalendarRange className="h-4 w-4" />
                  <span>Período de Ausência (Intervalo)</span>
                </button>
              </div>
            </div>

            {/* CAMPOS DE DATA */}
            {tipoRegistro === 'DATA_UNICA' ? (
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider text-[11px]">
                  Data da Ausência *
                </label>
                <input
                  type="date"
                  required
                  value={dataAusencia}
                  onChange={(e) => handleDataAusenciaChange(e.target.value)}
                  disabled={salvando}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 shadow-xs hover:border-slate-400 focus:border-school-blue-600 focus:ring-2 focus:ring-school-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <span className="mt-1.5 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Representa ausência pontual em um único dia letivo.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider text-[11px]">
                    Data de Início *
                  </label>
                  <input
                    type="date"
                    required
                    value={dataInicio}
                    onChange={(e) => handleDataInicioChange(e.target.value)}
                    disabled={salvando}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 shadow-xs hover:border-slate-400 focus:border-school-blue-600 focus:ring-2 focus:ring-school-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider text-[11px]">
                    Data de Término *
                  </label>
                  <input
                    type="date"
                    required
                    min={dataInicio}
                    value={dataFim}
                    onChange={(e) => handleDataFimChange(e.target.value)}
                    disabled={salvando}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-bold text-slate-900 shadow-xs hover:border-slate-400 focus:border-school-blue-600 focus:ring-2 focus:ring-school-blue-500/20 dark:bg-slate-800 dark:text-white ${
                      erroIntervaloDatas 
                        ? 'border-rose-400 bg-rose-50/50 dark:border-rose-600' 
                        : 'border-slate-300 bg-white dark:border-slate-700'
                    }`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* CARD 2: PAINEL DE CONTAGEM AUTOMÁTICA DA GRADE HORÁRIA */}
          <div className="rounded-2xl border-2 border-school-blue-200 bg-school-blue-50/70 p-4.5 shadow-sm dark:border-school-blue-900/60 dark:bg-school-blue-950/25 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-school-blue-700 dark:text-school-gold-400" />
                <span className="font-black text-school-blue-950 dark:text-school-blue-200 text-xs uppercase tracking-wider">
                  Apuração via Grade Horária Ativa
                </span>
              </div>
              <span className="rounded-full bg-school-blue-100 text-school-blue-900 border border-school-blue-300 px-3 py-1 text-[11px] font-extrabold dark:bg-school-blue-900/80 dark:text-school-blue-200 dark:border-school-blue-700 shadow-xs">
                {calculoGrade.totalDiasLetivos} dia(s) letivo(s) apurado(s)
              </span>
            </div>

            {/* Resumo formatado com a somatória */}
            <div className="rounded-xl bg-white dark:bg-slate-900 p-3.5 text-xs text-slate-800 dark:text-slate-200 border border-school-blue-200 dark:border-slate-700 font-mono shadow-xs leading-relaxed">
              {calculoGrade.resumoFormatado}
            </div>

            {/* Alternador de Detalhamento por Dia */}
            {calculoGrade.diasDetalhados.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setExpandirDetalhamento(!expandirDetalhamento)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-school-blue-800 dark:text-school-gold-400 hover:underline cursor-pointer"
                >
                  {expandirDetalhamento ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      <span>Ocultar detalhamento por turma/dia</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      <span>Ver detalhamento por dia e turmas ({calculoGrade.diasDetalhados.length} dia(s))</span>
                    </>
                  )}
                </button>

                {expandirDetalhamento && (
                  <div className="mt-2.5 space-y-2 max-h-48 overflow-y-auto pr-1">
                    {calculoGrade.diasDetalhados.map((dia) => (
                      <div
                        key={dia.data}
                        className={`flex items-start justify-between p-2.5 rounded-xl text-xs border ${
                          dia.isFinalDeSemana || dia.isFeriadoOuNaoLetivo
                            ? 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700'
                            : dia.aulasTotal > 0
                            ? 'bg-white text-slate-900 border-school-blue-200 shadow-xs dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700'
                            : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/50 dark:border-slate-800'
                        }`}
                      >
                        <div>
                          <strong className="text-slate-900 dark:text-white font-bold">
                            {dia.diaSemana} ({dia.dataFormatada})
                          </strong>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400">
                            {dia.descricaoCurta}
                          </div>
                        </div>
                        <span className={`font-mono font-black px-2.5 py-0.5 rounded-lg text-xs ${
                          dia.aulasTotal > 0
                            ? 'bg-amber-100 text-amber-950 border border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {dia.aulasTotal} aula(s)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CAMPO EDITÁVEL: Total de Aulas Devidas */}
            <div className="pt-3 border-t border-school-blue-200 dark:border-school-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="block font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                  Total de Aulas Devidas *
                </label>
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  Preenchido automaticamente. Você pode ajustar livremente o valor final.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={200}
                  required
                  value={aulasTotaisDevidas}
                  onChange={(e) => handleAulasTotaisChange(Number(e.target.value))}
                  disabled={salvando}
                  className="w-24 rounded-xl border-2 border-amber-400 bg-white px-3 py-2 text-center text-sm font-black text-amber-950 shadow-xs focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 dark:border-amber-600 dark:bg-amber-950/60 dark:text-amber-200"
                />

                {valorAlteradoManualmente && (
                  <button
                    type="button"
                    onClick={restaurarValorSugerido}
                    title="Restaurar valor apurado pela grade"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Resetar ({calculoGrade.aulasCalculadasSistema})</span>
                  </button>
                )}
              </div>
            </div>

            {valorAlteradoManualmente && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-950 text-xs font-medium dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-200">
                <Info className="h-4 w-4 shrink-0 text-amber-800 dark:text-amber-300" />
                <span>
                  Valor alterado manualmente pelo usuário (apurado na grade: <strong>{calculoGrade.aulasCalculadasSistema} aulas</strong>).
                </span>
              </div>
            )}
          </div>

          {/* CARD 3: MOTIVO E JUSTIFICATIVA */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider text-[11px]">
                  Motivo / Tipo da Ausência *
                </label>
                <select
                  required
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  disabled={salvando}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 shadow-xs hover:border-slate-400 focus:border-school-blue-600 focus:ring-2 focus:ring-school-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {MOTIVOS_SUGERIDOS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider text-[11px]">
                  Observação Interna (Opcional)
                </label>
                <input
                  type="text"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  disabled={salvando}
                  placeholder="Ex: Reposição combinada para sábado letivo"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 shadow-xs hover:border-slate-400 focus:border-school-blue-600 focus:ring-2 focus:ring-school-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider text-[11px]">
                Justificativa Declarada / Detalhes *
              </label>
              <textarea
                rows={2}
                required
                value={justificativaDetalhada}
                onChange={(e) => setJustificativaDetalhada(e.target.value)}
                disabled={salvando}
                placeholder="Ex: CONSULTA MÉDICA COM CIRURGIÃO, PROCEDIMENTO ODONTOLÓGICO OU DECLARAÇÃO..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs uppercase text-slate-900 placeholder:text-slate-400 shadow-xs hover:border-slate-400 focus:border-school-blue-600 focus:ring-2 focus:ring-school-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* CARD 4: UPLOAD E LINK DO ATESTADO NO GOOGLE DRIVE */}
          <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-4.5 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/20 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-emerald-700 dark:text-emerald-400" />
                <span className="font-black text-emerald-950 dark:text-emerald-200 text-xs uppercase tracking-wider">
                  Atestado Médico / Documento Comprobatório
                </span>
              </div>

              <button
                type="button"
                onClick={() => setModoLinkManual(!modoLinkManual)}
                className="text-xs font-bold text-emerald-800 dark:text-school-gold-400 hover:underline cursor-pointer"
              >
                {modoLinkManual ? 'Enviar arquivo físico' : 'Inserir link existente do Drive'}
              </button>
            </div>

            {/* Informação da Hierarquia do Drive */}
            {professorSelecionado && (
              <div className="rounded-xl bg-white dark:bg-slate-900 p-3 text-xs text-slate-700 dark:text-slate-300 border border-emerald-200 dark:border-emerald-900/60 font-mono shadow-xs">
                Destino no Google Drive:{' '}
                <strong className="text-slate-900 dark:text-slate-100 font-bold">
                  FICHA DOS PROFESSORES / {(professorSelecionado.nome_completo || 'P').charAt(0).toUpperCase()} / {professorSelecionado.nome_completo.toUpperCase()} / atestado_medico_{dataInicioEfetiva.replace(/-/g, '_')}.pdf
                </strong>
              </div>
            )}

            {!modoLinkManual ? (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!arquivoAtestado ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={salvando}
                    className="w-full flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-300 hover:border-emerald-600 bg-white hover:bg-emerald-50/50 p-5 shadow-xs transition-all cursor-pointer dark:border-slate-700 dark:bg-slate-900 dark:hover:border-school-gold-400"
                  >
                    <UploadCloud className="h-8 w-8 text-emerald-700 dark:text-school-gold-400" />
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      Clique para anexar atestado (PDF, PNG ou JPEG)
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      O arquivo será enviado e organizado na pasta individual do professor no Google Drive
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-white p-3.5 shadow-xs dark:border-emerald-900/80 dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold shadow-xs">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                          {arquivoAtestado.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {(arquivoAtestado.size / 1024).toFixed(1)} KB • Pronto para upload
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removerArquivoSelecionado}
                      disabled={salvando}
                      className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Remover anexo"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1 uppercase text-[11px]">
                  Link Compartilhado do Google Drive
                </label>
                <input
                  type="url"
                  value={linkDriveManual}
                  onChange={(e) => setLinkDriveManual(e.target.value)}
                  disabled={salvando}
                  placeholder="https://drive.google.com/file/d/.../view"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 shadow-xs focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            )}
          </div>
        </form>

        {/* Rodapé com Botões de Ação */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {salvando && progressoUpload ? (
              <span className="flex items-center gap-1.5 text-school-blue-700 dark:text-school-gold-400 font-bold">
                <Loader2 className="h-4 w-4 animate-spin" />
                {progressoUpload}
              </span>
            ) : (
              <span>* Campos obrigatórios</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={salvando || Boolean(erroIntervaloDatas)}
              className="inline-flex items-center gap-2 rounded-xl bg-school-blue-800 px-6 py-2.5 text-xs font-black text-white shadow-md hover:bg-school-blue-700 dark:bg-school-blue-600 dark:hover:bg-school-blue-500 transition-all disabled:opacity-50 cursor-pointer"
            >
              {salvando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Salvar Registro de Ausência</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
