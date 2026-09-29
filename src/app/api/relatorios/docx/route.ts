import { NextRequest, NextResponse } from 'next/server';
import { generateDocxReport, DocxReportData } from '@/lib/docx-generator';
import { initialEstudantes, initialTurmas, initialEscolaConfig, initialSolicitacoesRelatorio, initialRelatoriosConsolidados } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { escola, aluno, dataEmissao, conteudoFinal } = body as DocxReportData;

    if (!aluno || !conteudoFinal) {
      return NextResponse.json(
        { error: 'Dados insuficientes para emissão do relatório DOCX.' },
        { status: 400 }
      );
    }

    const docxBuffer = generateDocxReport({
      escola: escola || {
        nome: initialEscolaConfig.nome_escola,
        cnpj: initialEscolaConfig.cnpj,
        endereco: initialEscolaConfig.endereco,
        contato: initialEscolaConfig.telefone,
        anoLetivo: initialEscolaConfig.ano_letivo_ativo,
      },
      aluno,
      dataEmissao: dataEmissao || new Date().toLocaleDateString('pt-BR'),
      conteudoFinal,
    });

    const safeNomeAluno = (aluno.nome || 'Estudante').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Parecer_Pedagogico_Integrado_${safeNomeAluno}.docx`;

    return new NextResponse(docxBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Erro ao gerar DOCX:', error);
    return NextResponse.json(
      { error: error?.message || 'Falha na geração do documento DOCX.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const solicitacaoId = searchParams.get('solicitacao_id');

    if (!solicitacaoId) {
      return NextResponse.json({ error: 'solicitacao_id é obrigatório.' }, { status: 400 });
    }

    const solicitacao = initialSolicitacoesRelatorio.find(s => s.id === solicitacaoId);
    const consolidado = initialRelatoriosConsolidados.find(c => c.solicitacao_id === solicitacaoId);

    const alunoId = solicitacao?.aluno_id || 'est-1';
    const aluno = initialEstudantes.find(e => e.id === alunoId) || initialEstudantes[0];
    const turma = initialTurmas.find(t => t.id === aluno.turma_id) || initialTurmas[0];

    // Calcula idade
    const partesNasc = (aluno.data_nascimento || '2010-01-01').split('-');
    const anoNasc = parseInt(partesNasc[0], 10);
    const idade = isNaN(anoNasc) ? 15 : new Date().getFullYear() - anoNasc;

    const docxBuffer = generateDocxReport({
      escola: {
        nome: initialEscolaConfig.nome_escola,
        cnpj: initialEscolaConfig.cnpj,
        endereco: initialEscolaConfig.endereco,
        contato: initialEscolaConfig.telefone,
        anoLetivo: initialEscolaConfig.ano_letivo_ativo,
      },
      aluno: {
        nome: aluno.nome_completo,
        turma: turma.nome,
        turno: turma.turno === 'manha' ? 'Manhã' : turma.turno === 'tarde' ? 'Tarde' : 'Noite',
        nascimento: new Date(aluno.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR'),
        idade,
        matricula: `MAT-${aluno.id.toUpperCase()}`,
      },
      dataEmissao: new Date().toLocaleDateString('pt-BR'),
      conteudoFinal: consolidado?.conteudo_final || 'Parecer Pedagógico Integrado em processo de consolidação.',
    });

    const safeNomeAluno = (aluno.nome_completo || 'Estudante').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Parecer_Pedagogico_Integrado_${safeNomeAluno}.docx`;

    return new NextResponse(docxBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Erro ao baixar DOCX via GET:', error);
    return NextResponse.json(
      { error: error?.message || 'Falha ao recuperar documento DOCX.' },
      { status: 500 }
    );
  }
}
