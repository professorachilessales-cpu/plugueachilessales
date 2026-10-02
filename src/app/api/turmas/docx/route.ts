import { NextRequest, NextResponse } from 'next/server';
import { 
  generateTurmaListaAssinaturaDocx, 
  generateTurmaListaCadastroDocx, 
  TurmaDocxOptions 
} from '@/lib/turma-docx-generator';
import { initialEstudantes, initialTurmas, initialEscolaConfig } from '@/lib/mock-data';
import { isTursoConfigured, executeTursoQuery } from '@/lib/turso';
import { Turma, Estudante, EscolaConfig } from '@/lib/types';

export const dynamic = 'force-dynamic';

function sanitizarNomeArquivo(nome: string): string {
  return (nome || 'Turma')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { turma, estudantes, tipo, escolaConfig, dataEmissao } = body;

    if (!turma || !turma.nome) {
      return NextResponse.json(
        { error: 'Os dados da turma são obrigatórios para emissão do documento.' },
        { status: 400 }
      );
    }

    const tipoDoc = tipo === 'cadastro' ? 'cadastro' : 'assinatura';

    // Se estudantes não foram fornecidos no corpo, tenta buscar
    let listaEstudantes: Estudante[] = Array.isArray(estudantes) ? estudantes : [];

    if (listaEstudantes.length === 0 && turma.id) {
      if (isTursoConfigured) {
        try {
          const res = await executeTursoQuery(
            'SELECT * FROM estudantes WHERE turma_id = ? AND (status_matricula != "Transferido" AND status_matricula != "Evadido")',
            [turma.id]
          );
          if (res.rows && res.rows.length > 0) {
            listaEstudantes = res.rows as any[];
          }
        } catch (e) {
          console.warn('Erro ao buscar estudantes no Turso:', e);
        }
      }
      if (listaEstudantes.length === 0) {
        listaEstudantes = initialEstudantes.filter(
          (e) => e.turma_id === turma.id && e.status_matricula !== 'Transferido' && e.status_matricula !== 'Evadido'
        );
      }
    }

    const options: TurmaDocxOptions = {
      turma,
      estudantes: listaEstudantes,
      escolaConfig: escolaConfig || initialEscolaConfig,
      dataEmissao,
    };

    let docxBuffer: Buffer;
    let filename: string;
    const safeNomeTurma = sanitizarNomeArquivo(turma.nome);

    if (tipoDoc === 'cadastro') {
      docxBuffer = generateTurmaListaCadastroDocx(options);
      filename = `Lista_Estudantes_AEE_CPF_${safeNomeTurma}.docx`;
    } else {
      docxBuffer = generateTurmaListaAssinaturaDocx(options);
      filename = `Lista_Estudantes_Assinatura_${safeNomeTurma}.docx`;
    }

    return new NextResponse(docxBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Erro ao gerar DOCX da turma:', error);
    return NextResponse.json(
      { error: error?.message || 'Falha na geração do arquivo DOCX da turma.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const turmaId = searchParams.get('turma_id') || searchParams.get('turmaId');
    const tipo = searchParams.get('tipo') === 'cadastro' ? 'cadastro' : 'assinatura';

    if (!turmaId) {
      return NextResponse.json(
        { error: 'O parâmetro turma_id é obrigatório.' },
        { status: 400 }
      );
    }

    let turmaEncontrada: any = null;
    let listaEstudantes: Estudante[] = [];
    let configEscola: any = initialEscolaConfig;

    if (isTursoConfigured) {
      try {
        const resTurma = await executeTursoQuery('SELECT * FROM turmas WHERE id = ? LIMIT 1', [turmaId]);
        if (resTurma.rows && resTurma.rows.length > 0) {
          turmaEncontrada = resTurma.rows[0];
        }

        const resEst = await executeTursoQuery(
          'SELECT * FROM estudantes WHERE turma_id = ? AND (status_matricula != "Transferido" AND status_matricula != "Evadido")',
          [turmaId]
        );
        if (resEst.rows && resEst.rows.length > 0) {
          listaEstudantes = resEst.rows as any[];
        }

        const resConfig = await executeTursoQuery('SELECT * FROM config_escola LIMIT 1');
        if (resConfig.rows && resConfig.rows.length > 0) {
          configEscola = resConfig.rows[0];
        }
      } catch (e) {
        console.warn('Erro ao consultar Turso em GET /api/turmas/docx:', e);
      }
    }

    if (!turmaEncontrada) {
      turmaEncontrada = initialTurmas.find((t) => t.id === turmaId) || initialTurmas[0];
      listaEstudantes = initialEstudantes.filter(
        (e) => e.turma_id === turmaId && e.status_matricula !== 'Transferido' && e.status_matricula !== 'Evadido'
      );
    }

    const options: TurmaDocxOptions = {
      turma: turmaEncontrada,
      estudantes: listaEstudantes,
      escolaConfig: configEscola,
    };

    let docxBuffer: Buffer;
    let filename: string;
    const safeNomeTurma = sanitizarNomeArquivo(turmaEncontrada.nome);

    if (tipo === 'cadastro') {
      docxBuffer = generateTurmaListaCadastroDocx(options);
      filename = `Lista_Estudantes_AEE_CPF_${safeNomeTurma}.docx`;
    } else {
      docxBuffer = generateTurmaListaAssinaturaDocx(options);
      filename = `Lista_Estudantes_Assinatura_${safeNomeTurma}.docx`;
    }

    return new NextResponse(docxBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Erro ao baixar DOCX da turma via GET:', error);
    return NextResponse.json(
      { error: error?.message || 'Falha ao recuperar arquivo DOCX da turma.' },
      { status: 500 }
    );
  }
}
