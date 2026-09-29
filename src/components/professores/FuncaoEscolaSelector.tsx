'use client';

import React from 'react';
import { 
  DoorClosed, 
  Sparkles, 
  FolderKanban, 
  RefreshCw, 
  UtensilsCrossed, 
  HeartHandshake, 
  Tag, 
  CheckCircle2, 
  Circle 
} from 'lucide-react';
import { FuncaoEscola } from '@/lib/types';

export interface FuncaoEscolaOpcao {
  valor: FuncaoEscola;
  label: string;
  emoji: string;
  descricao: string;
  icone: React.ComponentType<{ className?: string }>;
}

export const OPCOES_FUNCAO_ESCOLA: FuncaoEscolaOpcao[] = [
  {
    valor: 'Porteiro',
    label: 'Porteiro',
    emoji: '🚪',
    descricao: 'Controle de acesso, recepção e portaria',
    icone: DoorClosed,
  },
  {
    valor: 'Serviços Gerais',
    label: 'Serviços Gerais',
    emoji: '🧹',
    descricao: 'Conservação, limpeza e manutenção predial',
    icone: Sparkles,
  },
  {
    valor: 'Administrativo',
    label: 'Administrativo',
    emoji: '📂',
    descricao: 'Secretaria, expedição de documentos e apoio',
    icone: FolderKanban,
  },
  {
    valor: 'Readaptado',
    label: 'Readaptado',
    emoji: '🔄',
    descricao: 'Servidor em regime de readaptação funcional',
    icone: RefreshCw,
  },
  {
    valor: 'Merendeira',
    label: 'Merendeira',
    emoji: '🍲',
    descricao: 'Preparo e distribuição da alimentação escolar',
    icone: UtensilsCrossed,
  },
  {
    valor: 'Ajudantes',
    label: 'Ajudantes',
    emoji: '🤝',
    descricao: 'Apoio operacional, pátio e suporte escolar',
    icone: HeartHandshake,
  },
  {
    valor: 'Outros',
    label: 'Outros',
    emoji: '🏷️',
    descricao: 'Demais atribuições funcionais complementares',
    icone: Tag,
  },
];

interface FuncaoEscolaSelectorProps {
  value: string;
  onChange: (funcao: FuncaoEscola) => void;
  required?: boolean;
}

export default function FuncaoEscolaSelector({
  value,
  onChange,
  required = true,
}: FuncaoEscolaSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Função na Escola {required && <span className="text-rose-500">*</span>}
        </label>
        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
          {value ? `Selecionado: ${value}` : 'Escolha uma opção (seleção única)'}
        </span>
      </div>

      <div 
        role="radiogroup" 
        aria-required={required}
        aria-label="Função na Escola"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5"
      >
        {OPCOES_FUNCAO_ESCOLA.map((opcao) => {
          const isSelected = value === opcao.valor;
          const IconeComp = opcao.icone;

          return (
            <div
              key={opcao.valor}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => onChange(opcao.valor)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  onChange(opcao.valor);
                }
              }}
              className={`relative flex flex-col justify-between p-3 rounded-xl border cursor-pointer select-none transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                isSelected
                  ? 'border-2 border-indigo-600 bg-indigo-50/90 text-indigo-950 shadow-sm ring-2 ring-indigo-500/25 dark:border-school-gold-400 dark:bg-indigo-950/60 dark:text-school-gold-200 dark:ring-school-gold-400/25'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Topo do Card: Emoji/Ícone e Indicador de Check */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl" role="img" aria-label={opcao.label}>
                    {opcao.emoji}
                  </span>
                  <div className={`p-1 rounded-lg ${
                    isSelected 
                      ? 'bg-indigo-200/80 text-indigo-800 dark:bg-indigo-900 dark:text-school-gold-300' 
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    <IconeComp className="h-3.5 w-3.5" />
                  </div>
                </div>

                {isSelected ? (
                  <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-school-gold-400 flex-shrink-0 animate-in zoom-in-75 duration-150" />
                ) : (
                  <Circle className="h-4 w-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                )}
              </div>

              {/* Título e Descrição */}
              <div>
                <span className={`block text-xs font-bold uppercase tracking-tight ${
                  isSelected 
                    ? 'text-indigo-950 dark:text-white' 
                    : 'text-slate-800 dark:text-slate-200'
                }`}>
                  {opcao.label}
                </span>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  {opcao.descricao}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
