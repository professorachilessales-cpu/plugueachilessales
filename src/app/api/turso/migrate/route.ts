import { NextRequest, NextResponse } from 'next/server';
import { executeTursoBatch, isTursoConfigured } from '@/lib/turso';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    if (!isTursoConfigured) {
      return NextResponse.json(
        { error: 'Turso não está configurado. Adicione TURSO_AUTH_TOKEN no .env.local.' },
        { status: 400 }
      );
    }

    const schemaPath = path.join(process.cwd(), 'turso-schema.sql');
    if (!fs.existsSync(schemaPath)) {
      return NextResponse.json(
        { error: 'Arquivo turso-schema.sql não encontrado.' },
        { status: 404 }
      );
    }

    const sqlContent = fs.readFileSync(schemaPath, 'utf8');
    
    // Divide os comandos SQL por ponto e vírgula
    const statements = sqlContent
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    await executeTursoBatch(statements);

    return NextResponse.json({
      success: true,
      message: 'Tabelas criadas com sucesso no Turso!',
      totalStatements: statements.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao sincronizar tabelas com Turso.' },
      { status: 500 }
    );
  }
}
