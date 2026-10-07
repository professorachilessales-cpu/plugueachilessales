'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export default function UsuariosPermissoesPage() {
  const router = useRouter();
  const { currentUser } = useApp();

  useEffect(() => {
    const destino = currentUser?.funcao_tipo === 'GERAL' ? '/fotograma' : '/dashboard';
    router.replace(destino);
  }, [router, currentUser]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-school-blue-600 border-t-transparent" />
      <p className="mt-3 text-xs text-slate-500">
        Redirecionando para a área autorizada...
      </p>
    </div>
  );
}
