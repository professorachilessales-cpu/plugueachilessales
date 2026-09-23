'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { School } from 'lucide-react';

interface PrintHeaderProps {
  documentTitle?: string;
  documentSubtitle?: string;
}

export function PrintHeader({
  documentTitle = 'RELATÓRIO INSTITUCIONAL ESCOLAR',
  documentSubtitle = 'Plataforma Unificada de Gestão Educacional - PLUGUE',
}: PrintHeaderProps) {
  const { escolaConfig } = useApp();
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

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
