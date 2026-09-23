'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { ShieldAlert, ArrowLeft, Lock, School, Sparkles } from 'lucide-react';

interface RouteGuardProps {
  children: React.ReactNode;
}

const RESTRICTED_FOR_PROFESSOR = [
  '/estudantes',
  '/turmas',
  '/auditoria',
  '/configuracoes',
  '/professores',
];

export function RouteGuard({ children }: RouteGuardProps) {
  const pathname = usePathname();
  const currentPath = pathname || '';
  const { role, currentUser } = useApp();

  const isProfessor = role === 'professor';
  const isRestrictedRoute = RESTRICTED_FOR_PROFESSOR.some(
    (prefix) => currentPath === prefix || currentPath.startsWith(`${prefix}/`)
  );

  const allowedModules = currentUser?.allowed_modules || ['PROFILE', 'FOTOGRAMA', 'CALENDARIO'];
  const isFotogramaRoute = currentPath === '/fotograma' || currentPath.startsWith('/fotograma/');
  const isCalendarioRoute = currentPath === '/calendario' || currentPath.startsWith('/calendario/');

  const isFotogramaRevoked = isProfessor && isFotogramaRoute && !allowedModules.includes('FOTOGRAMA');
  const isCalendarioRevoked = isProfessor && isCalendarioRoute && !allowedModules.includes('CALENDARIO');

  if (isProfessor && (isRestrictedRoute || isFotogramaRevoked || isCalendarioRevoked)) {
    const title = isFotogramaRevoked
      ? 'Acesso ao Fotograma Não Autorizado'
      : isCalendarioRevoked
      ? 'Acesso ao Calendário Não Autorizado'
      : 'Acesso Não Autorizado';

    const description = isFotogramaRevoked || isCalendarioRevoked
      ? 'A permissão para este módulo foi revogada pela coordenação na Matriz de Permissões do seu usuário.'
      : 'Você está conectado com o perfil Docente. Os módulos administrativos e de gestão são de uso exclusivo da Secretaria e Administração Escolar.';

    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-4 text-center animate-in fade-in-0 duration-300">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900/80 shadow-lg shadow-rose-500/10">
          <ShieldAlert className="h-10 w-10" />
        </div>

        <div className="mt-6 max-w-md">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
            <Lock className="h-3.5 w-3.5" />
            403 • Acesso Restrito
          </span>

          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {title}
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {description}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {allowedModules.includes('FOTOGRAMA') && (
              <Link
                href="/fotograma"
                className="inline-flex items-center gap-2 rounded-xl bg-school-blue-800 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-school-blue-800/20 hover:bg-school-blue-700 transition-all dark:bg-school-blue-700 dark:hover:bg-school-blue-600"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Acessar Fotograma da Turma</span>
              </Link>
            )}

            {allowedModules.includes('CALENDARIO') && (
              <Link
                href="/calendario"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                <span>Ver Calendário Escolar</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
