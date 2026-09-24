'use client';

import React, { useState } from 'react';
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
  ShieldAlert,
  Info
} from 'lucide-react';
import { RelatorioProfessor, SolicitacaoRelatorio, Estudante, Turma } from '@/lib/types';

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
  const { salvarRascunhoProfessor, polirRelatorioComIA, enviarRelatorioProfessor } = useApp();

  const [rascunho, setRascunho] = useState(relatorio.rascunho_original || relatorio.texto_final || '');
  const [textoIa, setTextoIa] = useState(relatorio.texto_ia || '');
  const [textoFinal, setTextoFinal] = useState(relatorio.texto_final || relatorio.texto_ia || relatorio.rascunho_original || '');
  const [polindo, setPolindo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [sucessoEnviado, setSucessoEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!isOpen) return null;

  // Idade do estudante
  const partesNasc = (estudante.data_nascimento || '').split('-');
  const anoNasc = parseInt(partesNasc[0], 10);
  const idade = isNaN(anoNasc) ? 'Não informada' : `${new Date().getFullYear() - anoNasc} anos`;

  const handleSalvarRascunho = () => {
    salvarRascunhoProfessor(relatorio.id, rascunho);
  };

  const handlePolirComIA = async () => {
    if (!rascunho || rascunho.trim().length < 10) {
      setErro('Por favor, digite suas observações sobre o estudante antes de acionar a Inteligência Artificial.');
      return;
    }

    setErro(null);
    setPolindo(true);
    try {
      const resultado = await polirRelatorioComIA(relatorio.id, rascunho);
      setTextoIa(resultado);
      setTextoFinal(resultado);
    } catch (e: any) {
      setErro(e.message || 'Falha ao processar com a IA.');
    } finally {
      setPolindo(false);
    }
  };

  const handleEnviarSecretaria = async () => {
    const textoParaEnviar = textoFinal.trim() || textoIa.trim() || rascunho.trim();
    if (!textoParaEnviar || textoParaEnviar.length < 10) {
      setErro('O parecer precisa ter um texto pedagógico consistente antes do envio final.');
      return;
    }

    setErro(null);
    setEnviando(true);
    try {
      await enviarRelatorioProfessor(relatorio.id, textoParaEnviar);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* HEADER: Foto, Nome Completo, Idade e Turma do Estudante */}
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
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <span>Idade: <strong className="text-slate-700 dark:text-slate-200">{idade}</strong></span>
                <span>•</span>
                <span>Turno: <strong className="text-slate-700 dark:text-slate-200">{turma?.turno === 'manha' ? 'Manhã' : turma?.turno === 'tarde' ? 'Tarde' : 'Noite'}</strong></span>
                <span>•</span>
                <span>Solicitado em: <strong className="text-slate-700 dark:text-slate-200">{new Date(solicitacao.data_solicitacao).toLocaleDateString('pt-BR')}</strong></span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* CORPO MODAL COM SCROLL */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* AVISO EXPLICATIVO OBRIGATÓRIO (Seção 3) */}
          <div className="rounded-2xl border border-blue-200/80 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/30 flex items-start gap-3 shadow-sm">
            <div className="rounded-xl bg-school-blue-100 p-2 text-school-blue-700 dark:bg-school-blue-900/60 dark:text-school-gold-400 flex-shrink-0 mt-0.5">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-school-blue-900 dark:text-blue-200 uppercase tracking-wider">
                Refinamento Inteligente com IA
              </h4>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
                Este texto será polido por Inteligência Artificial antes do envio final à coordenação/secretaria. 
                Escreva livremente suas impressões, fatos ocorridos, facilidades e desafios do aluno; nosso modelo pedagógico adaptará o relato para o tom formal, técnico e humanizado exigido pela instituição.
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
              <span>Parecer enviado com sucesso à secretaria! O alerta foi emitido para a coordenação.</span>
            </div>
          )}

          {/* ÁREA DE ESCRITA LIVRE DO PROFESSOR */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Edit3 className="h-3.5 w-3.5 text-school-blue-600 dark:text-school-gold-400" />
                <span>1. Seu Relato Livre & Observações Concretas</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {rascunho.length} caracteres
              </span>
            </div>

            <textarea
              rows={4}
              value={rascunho}
              onChange={(e) => setRascunho(e.target.value)}
              onBlur={handleSalvarRascunho}
              placeholder="Ex: O aluno tem demonstrado facilidade em matemática e raciocínio lógico, porém conversa bastante nos momentos de explicação teórica. Nos trabalhos em equipe tem liderado positivamente..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-sm text-slate-900 focus:border-school-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-school-blue-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-school-gold-400 transition-all resize-y min-h-[110px]"
            />

            {/* CTA POLIMENTO GEMINI */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handlePolirComIA}
                disabled={polindo || rascunho.trim().length < 5}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-school-blue-700 via-school-blue-800 to-indigo-800 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-school-blue-900/20 hover:from-school-blue-600 hover:to-indigo-700 disabled:opacity-50 transition-all cursor-pointer disabled:cursor-not-allowed group"
              >
                {polindo ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-school-gold-400" />
                    <span>Gemini Refinando Relato...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 text-school-gold-400 group-hover:rotate-12 transition-transform" />
                    <span>Polir Parecer com Inteligência Artificial</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* VERSÃO GERADA PELA IA EM CAMPO EDITÁVEL */}
          {(textoIa || relatorio.texto_ia) && (
            <div className="space-y-2 pt-2 animate-in fade-in-0 duration-300">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-school-blue-900 dark:text-blue-300 flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-school-gold-500" />
                  <span>2. Versão Pedagógica Refinada (Revisável pelo Professor)</span>
                </label>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Pronto para Revisão
                </span>
              </div>

              <textarea
                rows={5}
                value={textoFinal}
                onChange={(e) => setTextoFinal(e.target.value)}
                placeholder="Aqui você pode ajustar qualquer detalhe antes de encaminhar à secretaria..."
                className="w-full rounded-2xl border-2 border-school-blue-200 bg-white p-4 text-sm leading-relaxed text-slate-900 focus:border-school-blue-600 focus:outline-none focus:ring-2 focus:ring-school-blue-500/20 dark:border-blue-900/80 dark:bg-slate-800 dark:text-white transition-all resize-y min-h-[140px]"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-school-blue-600 dark:text-school-gold-400" />
                <span>Você tem total liberdade para realizar ajustes, adicionar complementos ou aceitar a sugestão integral da IA.</span>
              </p>
            </div>
          )}

        </div>

        {/* FOOTER DO MODAL: Ações de Fechar, Salvar Rascunho e Enviar à Secretaria */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/90">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            Cancelar / Salvar Depois
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSalvarRascunho}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors"
            >
              <span>Salvar Rascunho</span>
            </button>

            <button
              type="button"
              onClick={handleEnviarSecretaria}
              disabled={enviando || (!textoFinal && !rascunho)}
              className="inline-flex items-center gap-2 rounded-xl bg-school-blue-800 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-school-blue-800/30 hover:bg-school-blue-700 disabled:opacity-50 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {enviando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-school-gold-400" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 text-school-gold-400" />
                  <span>Enviar à Secretaria</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
