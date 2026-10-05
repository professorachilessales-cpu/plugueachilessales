import { NextRequest, NextResponse } from 'next/server';
import { generateDocxReport, DocxReportData } from '@/lib/docx-generator';
import { initialEstudantes, initialTurmas, initialEscolaConfig, initialSolicitacoesRelatorio, initialRelatoriosConsolidados } from '@/lib/mock-data';
import { executeTursoQuery } from '@/lib/turso';

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

    let solicitacao: any = null;
    let consolidado: any = null;
    let aluno: any = null;
    let turma: any = null;
    let config: any = null;

    try {
      const solRes = await executeTursoQuery('SELECT * FROM solicitacoes_relatorio WHERE id = ?', [solicitacaoId]);
      if (solRes.rows && solRes.rows.length > 0) {
        solicitacao = solRes.rows[0];
      }
      const consRes = await executeTursoQuery('SELECT * FROM relatorios_consolidados WHERE solicitacao_id = ? ORDER BY created_at DESC LIMIT 1', [solicitacaoId]);
      if (consRes.rows && consRes.rows.length > 0) {
        consolidado = consRes.rows[0];
      }
      if (solicitacao?.aluno_id) {
        const alRes = await executeTursoQuery('SELECT * FROM estudantes WHERE id = ?', [solicitacao.aluno_id]);
        if (alRes.rows && alRes.rows.length > 0) {
          aluno = alRes.rows[0];
        }
      }
      if (aluno?.turma_id) {
        const turRes = await executeTursoQuery('SELECT * FROM turmas WHERE id = ?', [aluno.turma_id]);
        if (turRes.rows && turRes.rows.length > 0) {
          turma = turRes.rows[0];
        }
      }
      const cfgRes = await executeTursoQuery('SELECT * FROM escola_config LIMIT 1');
      if (cfgRes.rows && cfgRes.rows.length > 0) {
        config = cfgRes.rows[0];
      }
    } catch (e) {
      console.warn('Erro ao consultar Turso no endpoint docx:', e);
    }

    // Fallbacks para dados locais/mock se não encontrados no banco
    if (!solicitacao) {
      solicitacao = initialSolicitacoesRelatorio.find(s => s.id === solicitacaoId);
    }
    if (!consolidado) {
      consolidado = initialRelatoriosConsolidados.find(c => c.solicitacao_id === solicitacaoId);
    }
    const alunoId = solicitacao?.aluno_id || 'est-1';
    if (!aluno) {
      aluno = initialEstudantes.find(e => e.id === alunoId) || initialEstudantes[0];
    }
    if (!turma) {
      turma = initialTurmas.find(t => t.id === aluno.turma_id) || initialTurmas[0];
    }

    const rawTurno = turma.turno ? String(turma.turno).toLowerCase().trim() : '';
    const turnoNome = (rawTurno === 'manha' || rawTurno === 'manhã') ? 'MANHÃ' : rawTurno === 'tarde' ? 'TARDE' : rawTurno === 'noite' ? 'NOITE' : rawTurno.toUpperCase() || 'MANHÃ';

    const docxBuffer = generateDocxReport({
      escola: {
        nome: config?.nome_escola || initialEscolaConfig.nome_escola,
        cnpj: config?.cnpj || initialEscolaConfig.cnpj,
        endereco: config?.endereco || initialEscolaConfig.endereco,
        contato: config?.telefone || initialEscolaConfig.telefone,
        anoLetivo: config?.ano_letivo_ativo || initialEscolaConfig.ano_letivo_ativo,
      },
      aluno: {
        nome: aluno.nome_completo,
        turma: turma.nome,
        turno: turnoNome,
        data_nascimento: aluno.data_nascimento,
        dataNascimento: aluno.data_nascimento,
        nascimento: aluno.data_nascimento,
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
