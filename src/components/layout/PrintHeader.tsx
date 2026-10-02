'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { School } from 'lucide-react';

interface PrintHeaderProps {
  documentTitle?: string;
  documentSubtitle?: string;
  compact?: boolean;
}

export function PrintHeader({
  documentTitle = 'RELATÓRIO INSTITUCIONAL ESCOLAR',
  documentSubtitle = 'Plataforma Unificada de Gestão Educacional - PLUGUE',
  compact = false,
}: PrintHeaderProps) {
  const { escolaConfig } = useApp();
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (compact) {
    return (
      <div className="hidden print:block mb-2 pb-1.5 border-b-2 border-slate-800 text-slate-900">
        <div className="flex items-center justify-between gap-3">
          {/* Logotipo da Escola */}
          <div className="flex items-center gap-2.5">
            {escolaConfig.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={escolaConfig.logo_url}
                alt={escolaConfig.nome_escola}
                className="h-9 w-auto object-contain max-w-[80px]"
              />
            ) : (
              <div className="h-8 w-8 rounded bg-blue-900 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                <School className="w-4 h-4" />
              </div>
            )}

            <div>
              <h1 className="text-xs font-black uppercase tracking-tight text-blue-950 leading-tight">
                {escolaConfig.nome_escola}
              </h1>
              <p className="text-[8.5px] text-slate-600 font-medium leading-tight">
                INEP: {escolaConfig.codigo_inep || 'Não informado'} | CNPJ: {escolaConfig.cnpj || 'Não informado'}
              </p>
              <p className="text-[8px] text-slate-500 leading-tight">
                {escolaConfig.endereco} | Tel: {escolaConfig.telefone}
              </p>
            </div>
          </div>

          {/* Metadados de Impressão */}
          <div className="text-right text-[8.5px] text-slate-600 shrink-0">
            <div className="font-black text-slate-900 uppercase tracking-wide text-[9.5px]">
              {documentTitle}
            </div>
            <div className="text-[8px] text-slate-600">{documentSubtitle}</div>
            <div className="font-mono text-[7.5px] text-slate-500">
              Emitido em: {currentDate}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hidden print:block mb-8 pb-4 border-b-2 border-slate-800 text-slate-900">
      <div className="flex items-center justify-between gap-6">
        {/* Logotipo da Escola */}
        <div className="flex items-center gap-4">
          {escolaConfig.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={escolaConfig.logo_url}
              alt={escolaConfig.nome_escola}
              className="h-20 w-auto object-contain max-w-[140px]"
            />
          ) : (
            <div className="h-16 w-16 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold text-2xl shadow-sm">
              <School className="w-10 h-10" />
            </div>
          )}

          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-blue-950">
              {escolaConfig.nome_escola}
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              INEP: {escolaConfig.codigo_inep} | CNPJ: {escolaConfig.cnpj}
            </p>
            <p className="text-xs text-slate-500">
              {escolaConfig.endereco} | Tel: {escolaConfig.telefone}
            </p>
          </div>
        </div>

        {/* Metadados de Impressão */}
        <div className="text-right text-xs text-slate-500">
          <div className="font-semibold text-slate-800 uppercase tracking-wide">
            {documentTitle}
          </div>
          <div>{documentSubtitle}</div>
          <div className="mt-1 font-mono text-[10px]">
            Emitido em: {currentDate}
          </div>
        </div>
      </div>
    </div>
  );
}
