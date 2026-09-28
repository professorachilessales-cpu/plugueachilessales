import { NextResponse } from 'next/server';
import { desconectarContaDrive } from '@/lib/google-drive';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await desconectarContaDrive();
    return NextResponse.json({
      success: true,
      message: 'Conta do Google Drive desconectada com sucesso. Os tokens foram revogados.',
      is_connected: false,
    });
  } catch (error: any) {
    console.error('Erro ao desconectar conta do Google Drive:', error);
    return NextResponse.json(
      { error: error?.message || 'Falha ao desconectar conta do Google Drive' },
      { status: 500 }
    );
  }
}
