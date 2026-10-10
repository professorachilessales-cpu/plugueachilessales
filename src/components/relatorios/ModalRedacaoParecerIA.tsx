'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  X, 
  Sparkles, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  BookOpen, 
  Calendar, 
  Clock, 
  Loader2, 
  Wand2, 
  Edit3, 
  Info,
  Copy, 
  Check, 
  RotateCcw, 
  Undo2,
  FileCheck2,
  Trash2
} from 'lucide-react';
import { RelatorioProfessor, SolicitacaoRelatorio, Estudante, Turma } from '@/lib/types';
import { determinarGeneroEstudante } from '@/lib/pareceres-ia';

interface ModalRedacaoParecerIAProps {
  isOpen: boolean;
  onClose: () => void;
  relatorio: RelatorioProfessor;
  solicitacao: SolicitacaoRelatorio;
  estudante: Estudante;
  turma?: Turma;
}

export function ModalRedacaoParecerIA({
  isOpen,
  onClose,
  relatorio,
  solicitacao,
  estudante,
  turma,
}: ModalRedacaoParecerIAProps) {
  const { salvarRascunhoProfessor, limparRascunhoProfessor, polirRelatorioComIA, enviarRelatorioProfessor } = useApp();

  const isCancellingRef = useRef(false);

  const textoInicial = relatorio.texto_final || relatorio.texto_ia || relatorio.rascunho_original || '';
  const rascunhoInicial = relatorio.rascunho_original || relatorio.texto_final || '';

  // Estado unificado do editor (100% editável pelo docente)
  const [textoParecer, setTextoParecer] = useState(textoInicial);
  const [rascunhoOriginal, setRascunhoOriginal] = useState(rascunhoInicial);
  const [versaoIaRefinada, setVersaoIaRefinada] = useState(relatorio.texto_ia || '');
  const [foiRefinadoPorIa, setFoiRefinadoPorIa] = useState(Boolean(relatorio.texto_ia));

  const [polindo, setPolindo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [sucessoEnviado, setSucessoEnviado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(1);

  // Sincroniza estado com a prop relatorio e limpa flags de cancelamento
  useEffect(() => {
    if (isOpen) {
      isCancellingRef.current = false;
      const textoAtual = relatorio.texto_final || relatorio.texto_ia || relatorio.rascunho_original || '';
      setTextoParecer(textoAtual);
      setRascunhoOriginal(relatorio.rascunho_original || relatorio.texto_final || '');
      setVersaoIaRefinada(relatorio.texto_ia || '');
      setFoiRefinadoPorIa(Boolean(relatorio.texto_ia));
      setErro(null);
    }
  }, [isOpen, relatorio.id, relatorio.texto_final, relatorio.texto_ia, relatorio.rascunho_original]);

  // Identificação precisa do gênero gramatical para exibição e conferência
  const dadosGenero = useMemo(() => {
    return determinarGeneroEstudante({
      nome_completo: estudante.nome_completo,
      genero: estudante.genero || (estudante as any).sexo,
      sexo: (estudante as any).sexo || estudante.genero,
    });
  }, [estudante]);

  if (!isOpen) return null;

  // Idade do estudante
  const partesNasc = (estudante.data_nascimento || '').split('-');
  const anoNasc = parseInt(partesNasc[0], 10);
  const idade = isNaN(anoNasc) ? 'Não informada' : `${new Date().getFullYear() - anoNasc} anos`;

  const dataSolFormatada = (() => {
    const dStr = solicitacao.created_at || solicitacao.data_solicitacao;
    if (!dStr) return '—';
    try {
      const partes = dStr.split('T')[0].split('-');
      if (partes.length === 3) {
        return `${String(partes[2]).padStart(2, '0')}/${String(partes[1]).padStart(2, '0')}/${partes[0]}`;
      }
      return new Date(dStr).toLocaleDateString('pt-BR');
    } catch {
      return '—';
    }
  })();

  const handleSalvarRascunho = () => {
    if (isCancellingRef.current) return;
    if (!textoParecer || !textoParecer.trim()) return;
    salvarRascunhoProfessor(relatorio.id, textoParecer);
  };

  // Ação de Cancelar / Sair: Apaga todo cache no banco/browser e deixa o campo 100% limpo
  const handleCancelarSair = () => {
    isCancellingRef.current = true;
    setTextoParecer('');
    setRascunhoOriginal('');
    setVersaoIaRefinada('');
    setFoiRefinadoPorIa(false);
    setErro(null);
    limparRascunhoProfessor(relatorio.id);
    onClose();
  };

  // Ação de Limpar Campo: Limpa o editor e apaga qualquer cache do rascunho
  const handleLimparCampo = () => {
    isCancellingRef.current = true;
    setTextoParecer('');
    setRascunhoOriginal('');
    setVersaoIaRefinada('');
    setFoiRefinadoPorIa(false);
    setErro(null);
    limparRascunhoProfessor(relatorio.id);
    setTimeout(() => {
      isCancellingRef.current = false;
    }, 100);
  };

  // Acionamento da assistência de redação pela Groq
  const handlePolirComIA = async () => {
    if (polindo) return;
    if (!textoParecer || textoParecer.trim().length < 5) {
      setErro('Por favor, digite suas observações sobre o estudante antes de acionar a Assistência de Redação Pedagógica.');
      return;
    }

    setErro(null);
    setPolindo(true);

    // Salva o rascunho anterior para permitir "Desfazer / Ver Original"
    if (!rascunhoOriginal || rascunhoOriginal.trim().length === 0) {
      setRascunhoOriginal(textoParecer);
    }

    const proxTentativa = tentativa + 1;
    setTentativa(proxTentativa);

    try {
      const resultado = await polirRelatorioComIA(relatorio.id, textoParecer, {
        estudante,
        turma,
        tentativa: proxTentativa,
      });

      // Preenchimento Reativo: preenche diretamente o campo de texto/editor do parecer
      setTextoParecer(resultado);
      setVersaoIaRefinada(resultado);
      setFoiRefinadoPorIa(true);
    } catch (e: any) {
      setErro(e instanceof TypeError
        ? 'Não foi possível conectar à IA. Tente novamente em instantes. Suas observações foram preservadas.'
        : e.message || 'Falha ao processar com a IA.');
    } finally {
      setPolindo(false);
    }
  };

  // Ação de Desfazer / Resgatar Rascunho Inicial
  const handleRestaurarOriginal = () => {
    if (rascunhoOriginal && rascunhoOriginal.trim()) {
      setTextoParecer(rascunhoOriginal);
    }
  };

  // Ação de Resgatar Versão IA
  const handleRestaurarIa = () => {
    if (versaoIaRefinada && versaoIaRefinada.trim()) {
      setTextoParecer(versaoIaRefinada);
    }
  };

  // Ação de Copiar
  const handleCopiar = () => {
    if (navigator?.clipboard && textoParecer) {
      navigator.clipboard.writeText(textoParecer);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  const handleEnviarSecretaria = async () => {
    if (!textoParecer || textoParecer.trim().length < 10) {
      setErro('O parecer precisa ter um texto pedagógico consistente antes do envio final.');
      return;
    }

    setErro(null);
    setEnviando(true);
    try {
      await enviarRelatorioProfessor(relatorio.id, textoParecer.trim());
      setSucessoEnviado(true);
      setTimeout(() => {
        setSucessoEnviado(false);
        onClose();
      }, 1800);
    } catch (e: any) {
      setErro(e.message || 'Falha ao enviar parecer.');
    } finally {
      setEnviando(false);
    }
  };

  const temOriginalParaRestaurar = Boolean(
    rascunhoOriginal && rascunhoOriginal.trim() && rascunhoOriginal.trim() !== textoParecer.trim()
  );

  const temIaParaRestaurar = Boolean(
    versaoIaRefinada && versaoIaRefinada.trim() && versaoIaRefinada.trim() !== textoParecer.trim()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* HEADER: Foto, Nome Completo, Metadados e Gênero */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800 bg-gradient-to-r from-blue-50/80 via-white to-amber-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/30">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 rounded-2xl overflow-hidden border-2 border-school-blue-500 shadow-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
              {estudante.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={estudante.foto_url}
                  alt={estudante.nome_completo}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-7 w-7 text-school-blue-600 dark:text-school-gold-400" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white line-clamp-1">
                  {estudante.nome_completo}
                </h2>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-school-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                  {turma?.nome || 'Turma Atribuída'}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                  dadosGenero.generoGramatical === 'feminino'
                    ? 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200 dark:bg-fuchsia-950/70 dark:text-fuchsia-300 dark:border-fuchsia-900'
                    : 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-900'
                }`}>
                  {dadosGenero.generoGramatical === 'feminino' ? 'Aluna (Feminino)' : 'Aluno (Masculino)'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <span>Idade: <strong className="text-slate-700 dark:text-slate-200">{idade}</strong></span>
                <span>•</span>
                <span>Turno: <strong className="text-slate-700 dark:text-slate-200">{turma?.turno === 'manha' || turma?.turno === 'manhã' ? 'Manhã' : turma?.turno === 'tarde' ? 'Tarde' : 'Noite'}</strong></span>
                <span>•</span>
                <span>Solicitado em: <strong className="text-slate-700 dark:text-slate-200">{dataSolFormatada}</strong></span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onMouseDown={() => { isCancellingRef.current = true; }}
            onClick={handleCancelarSair}
            aria-label="Fechar e Limpar"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* CORPO DO MODAL */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* BANNER INSTITUCIONAL: DIRETRIZES DA IA PADRONIZADAS */}
          <div className="rounded-2xl border border-blue-200/80 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/30 flex items-start gap-3 shadow-sm">
            <div className="rounded-xl bg-school-blue-100 p-2 text-school-blue-700 dark:bg-school-blue-900/60 dark:text-school-gold-400 flex-shrink-0 mt-0.5">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-xs font-bold text-school-blue-900 dark:text-blue-200 uppercase tracking-wider">
                  Assistência de Redação Pedagógica com IA
                </h4>
                <span className="rounded-md bg-school-blue-100 dark:bg-school-blue-900/80 px-2 py-0.5 text-[10px] font-bold text-school-blue-800 dark:text-blue-200">
                  Concordância Ativa: {dadosGenero.termo}
                </span>
                <span className="rounded-md bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                  Padrão Oficial da Coordenação
                </span>
              </div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                Transforma anotações e apontamentos livres em texto técnico-pedagógico institucional, culto e articulado. Corrige 100% da ortografia e pontuação, aplica rigorosa <strong>concordância de gênero ({dadosGenero.generoGramatical})</strong> e elimina metatextos ou sugestões indevidas.
              </p>
            </div>
          </div>

          {erro && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {sucessoEnviado && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-2 animate-in zoom-in-95">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <span>Parecer docente salvo e enviado com sucesso ao banco de dados institucional!</span>
            </div>
          )}

          {/* EDITOR PRINCIPAL REATIVO (100% EDITÁVEL PELO DOCENTE) */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Edit3 className="h-3.5 w-3.5 text-school-blue-600 dark:text-school-gold-400" />
                <span>Parecer Pedagógico do Docente (100% Editável)</span>
              </label>

              <div className="flex items-center gap-2">
                {foiRefinadoPorIa && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800">
                    <Sparkles className="h-3 w-3 text-purple-600" />
                    <span>Lapidado com IA</span>
                  </span>
                )}
                <span className="text-[11px] text-slate-400">
                  {textoParecer.length} caracteres
                </span>
              </div>
            </div>

            {/* TEXTAREA PRINCIPAL */}
            <textarea
              rows={8}
              value={textoParecer}
              onChange={(e) => setTextoParecer(e.target.value)}
              onBlur={handleSalvarRascunho}
              placeholder="Digite suas observações ou anotações livres sobre o estudante (ex.: O estudante participa com empenho nas aulas de Ciências, porém precisa aprimorar a organização dos materiais...). Em seguida, clique em 'Assistência de Redação Pedagógica com IA' para transformar o texto no padrão institucional oficial."
              className="w-full rounded-2xl border-2 border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-900 focus:border-school-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-school-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-school-gold-400 transition-all resize-y min-h-[180px] font-sans"
            />

            {/* BARRA DE AÇÕES: GATILHO DA IA, DESFAZER/VER ORIGINAL E COPIAR */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handlePolirComIA}
                disabled={polindo || textoParecer.trim().length < 5}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-school-blue-700 via-school-blue-800 to-indigo-800 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-school-blue-900/20 hover:from-school-blue-600 hover:to-indigo-700 disabled:opacity-50 transition-all cursor-pointer disabled:cursor-not-allowed group"
              >
                {polindo ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-school-gold-400" />
                    <span>Refinando com IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-school-gold-400 group-hover:rotate-12 transition-transform" />
                    <span>Assistência de Redação Pedagógica com IA</span>
                  </>
                )}
              </button>

              {/* BOTÃO DESFAZER / VER ORIGINAL */}
              {temOriginalParaRestaurar && (
                <button
                  type="button"
                  onClick={handleRestaurarOriginal}
                  title="Restaurar as anotações iniciais antes do refinamento por IA"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                >
                  <Undo2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Desfazer / Ver Original</span>
                </button>
              )}

              {/* BOTÃO RESTAURAR VERSÃO IA (caso tenha voltado ao original) */}
              {temIaParaRestaurar && (
                <button
                  type="button"
                  onClick={handleRestaurarIa}
                  title="Reaplicar o texto refinado gerado pela IA"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-800 shadow-sm hover:bg-purple-100 dark:border-purple-900 dark:bg-purple-950/60 dark:text-purple-300 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Ver Versão IA</span>
                </button>
              )}

              {/* BOTÃO COPIAR */}
              <button
                type="button"
                onClick={handleCopiar}
                disabled={!textoParecer.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                {copiado ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-500" />
                    <span>Copiar</span>
                  </>
                )}
              </button>

              {/* BOTÃO LIMPAR CAMPO */}
              {textoParecer.trim().length > 0 && (
                <button
                  type="button"
                  onClick={handleLimparCampo}
                  title="Limpar todo o texto do campo e apagar rascunho em cache"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 shadow-sm hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                  <span>Limpar Campo</span>
                </button>
              )}
            </div>
          </div>

        </div>

        {/* FOOTER DO MODAL: Ações de Fechar, Salvar Rascunho e Enviar à Secretaria */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/90">
          <button
            type="button"
            onMouseDown={() => { isCancellingRef.current = true; }}
            onClick={handleCancelarSair}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cancelar / Sair
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSalvarRascunho}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors"
            >
              <span>Salvar Rascunho no Banco</span>
            </button>

            <button
              type="button"
              onClick={handleEnviarSecretaria}
              disabled={enviando || !textoParecer.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-school-blue-800 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-school-blue-800/30 hover:bg-school-blue-700 disabled:opacity-50 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {enviando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-school-gold-400" />
                  <span>Enviando ao Banco...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 text-school-gold-400" />
                  <span>Enviar Parecer à Secretaria</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
