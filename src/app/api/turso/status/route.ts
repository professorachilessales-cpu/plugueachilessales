export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { executeTursoQuery, checkIsTursoConfigured, tursoConfig, getTursoDbUrl } from '@/lib/turso';

export async function GET() {
  try {
    const isConfigured = checkIsTursoConfigured();
    if (!isConfigured) {
      return NextResponse.json({
        configured: false,
        connected: false,
        message: 'TURSO_AUTH_TOKEN não definido nas variáveis de ambiente (.env.local)',
        dbUrl: getTursoDbUrl(),
      });
    }

    // Testa uma query simples
    const testResult = await executeTursoQuery("SELECT 1 as connected, datetime('now') as server_time");
    
    // Tenta contar tabelas
    let tablesResult = { rows: [] as any[] };
    try {
      tablesResult = await executeTursoQuery(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      );
    } catch {
      // ignora se tabelas ainda não foram criadas
    }

    return NextResponse.json({
      configured: true,
      connected: true,
      dbUrl: tursoConfig.dbUrl,
      serverTime: testResult.rows[0]?.server_time,
      tables: tablesResult.rows.map((r: any) => r.name),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        configured: checkIsTursoConfigured(),
        connected: false,
        error: error.message || 'Falha ao conectar no Turso',
        dbUrl: tursoConfig.dbUrl,
      },
      { status: 500 }
    );
  }
}
