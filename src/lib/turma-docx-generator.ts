import { buildZipArchive, escapeXml } from './docx-generator';
import { Turma, Estudante, EscolaConfig } from './types';

export interface TurmaDocxOptions {
  turma: Partial<Turma> & { id: string; nome: string };
  estudantes: Estudante[];
  escolaConfig?: Partial<EscolaConfig> | null;
  dataEmissao?: string;
}

export function formatarDataNascimento(data?: string): string {
  if (!data) return '-';
  const limpa = String(data).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(limpa)) {
    const [ano, mes, dia] = limpa.substring(0, 10).split('-');
    return `${dia}/${mes}/${ano}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(limpa)) {
    return limpa;
  }
  return limpa || '-';
}

export function formatarCpf(cpf?: string): string {
  if (!cpf) return '-';
  const limpo = String(cpf).replace(/\D/g, '');
  if (limpo.length === 11) {
    return `${limpo.slice(0, 3)}.${limpo.slice(3, 6)}.${limpo.slice(6, 9)}-${limpo.slice(9, 11)}`;
  }
  return String(cpf).trim() || '-';
}

export function formatarAee(val?: boolean | number | string): string {
  if (val === true || val === 1 || String(val).toLowerCase() === 'true' || String(val).toLowerCase() === 'sim') {
    return 'SIM';
  }
  return 'NÃO';
}

export function formatarTurno(turno?: string): string {
  if (!turno) return 'Não informado';
  const t = String(turno).toLowerCase();
  if (t === 'manha' || t === 'manhã') return 'Manhã';
  if (t === 'tarde') return 'Tarde';
  if (t === 'noite') return 'Noite';
  return turno.charAt(0).toUpperCase() + turno.slice(1);
}

function getDataEmissaoFormatada(dataEmissao?: string): string {
  if (dataEmissao && dataEmissao.trim()) {
    return dataEmissao.trim();
  }
  const agora = new Date();
  const dia = String(agora.getDate()).padStart(2, '0');
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const ano = agora.getFullYear();
  const hora = String(agora.getHours()).padStart(2, '0');
  const min = String(agora.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${ano} às ${hora}:${min}`;
}

const COMMON_CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

const COMMON_PACKAGE_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const COMMON_DOCUMENT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const COMMON_STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="20"/>
        <w:szCs w:val="20"/>
        <w:color w:val="1E293B"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:line="240" w:lineRule="auto" w:after="80"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>`;

function renderFooterXml(nomeEscola: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:tbl>
    <w:tblPr>
      <w:tblW w:w="9900" w:type="dxa"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        <w:left w:val="none"/>
        <w:bottom w:val="none"/>
        <w:right w:val="none"/>
        <w:insideH w:val="none"/>
        <w:insideV w:val="none"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tr>
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="6000" w:type="dxa"/>
        </w:tcPr>
        <w:p>
          <w:pPr>
            <w:spacing w:before="60" w:after="0"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
              <w:sz w:val="16"/>
              <w:color w:val="64748B"/>
            </w:rPr>
            <w:t>${escapeXml(nomeEscola)} • Antigravity School OS</w:t>
          </w:r>
        </w:p>
      </w:tc>
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="3900" w:type="dxa"/>
        </w:tcPr>
        <w:p>
          <w:pPr>
            <w:jc w:val="right"/>
            <w:spacing w:before="60" w:after="0"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
              <w:sz w:val="16"/>
              <w:color w:val="64748B"/>
            </w:rPr>
            <w:t xml:space="preserve">Página </w:t>
          </w:r>
          <w:fldSimple w:instr="PAGE"/>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
              <w:sz w:val="16"/>
              <w:color w:val="64748B"/>
            </w:rPr>
            <w:t xml:space="preserve"> de </w:t>
          </w:r>
          <w:fldSimple w:instr="NUMPAGES"/>
        </w:p>
      </w:tc>
    </w:tr>
  </w:tbl>
</w:ftr>`;
}

function renderCabecalhoInstitucionalXml(escola: any): string {
  const nomeEscola = escola?.nome_escola || 'Colégio Integrado PLUGUE';
  const cnpjEscola = escola?.cnpj || '12.345.678/0001-90';
  const anoAtivo = escola?.ano_letivo_ativo || 2026;
  const endereco = escola?.endereco || 'Av. Central do Saber, 1500';
  const contato = escola?.telefone || '(11) 4002-8922';

  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9900" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="none"/>
          <w:left w:val="none"/>
          <w:bottom w:val="none"/>
          <w:right w:val="none"/>
          <w:insideH w:val="none"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
        <w:tblCellMar>
          <w:top w:w="60" w:type="dxa"/>
          <w:bottom w:w="60" w:type="dxa"/>
          <w:left w:w="80" w:type="dxa"/>
          <w:right w:w="80" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      <w:tr>
        <!-- Coluna Esquerda: Logotipo / Nome do Sistema -->
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="4500" w:type="dxa"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:spacing w:after="20"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                <w:b/>
                <w:sz w:val="32"/>
                <w:color w:val="1E40AF"/>
              </w:rPr>
              <w:t>PLUGUE</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr>
              <w:spacing w:after="0"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                <w:b/>
                <w:sz w:val="18"/>
                <w:color w:val="B45309"/>
              </w:rPr>
              <w:t>SISTEMA DE GESTÃO EDUCACIONAL</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <!-- Coluna Direita: Dados da Instituição de Ensino -->
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="5400" w:type="dxa"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="right"/>
              <w:spacing w:after="20"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                <w:b/>
                <w:sz w:val="22"/>
                <w:color w:val="0F172A"/>
              </w:rPr>
              <w:t>${escapeXml(nomeEscola)}</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr>
              <w:jc w:val="right"/>
              <w:spacing w:after="20"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                <w:sz w:val="17"/>
                <w:color w:val="475569"/>
              </w:rPr>
              <w:t>CNPJ: ${escapeXml(cnpjEscola)} • Ano Letivo: ${escapeXml(String(anoAtivo))}</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr>
              <w:jc w:val="right"/>
              <w:spacing w:after="0"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                <w:sz w:val="17"/>
                <w:color w:val="475569"/>
              </w:rPr>
              <w:t>${escapeXml(endereco)} | Tel: ${escapeXml(contato)}</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <!-- Linha divisória horizontal -->
    <w:p>
      <w:pPr>
        <w:pBdr>
          <w:bottom w:val="single" w:sz="14" w:space="4" w:color="1E40AF"/>
        </w:pBdr>
        <w:spacing w:before="60" w:after="160"/>
      </w:pPr>
    </w:p>`;
}

function renderBoxDadosTurmaXml(turma: Partial<Turma> & { id: string; nome: string }, totalEstudantes: number, dataEmissao: string, extraStatXml?: string): string {
  const turnoFormatado = formatarTurno(turma.turno);
  const salaFormatada = turma.sala || 'Sala Não Informada';
  const anoLetivo = turma.ano_letivo || 2026;

  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9900" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
        </w:tblBorders>
        <w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/>
        <w:tblCellMar>
          <w:top w:w="80" w:type="dxa"/>
          <w:bottom w:w="80" w:type="dxa"/>
          <w:left w:w="120" w:type="dxa"/>
          <w:right w:w="120" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="3800" w:type="dxa"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:after="0"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="475569"/></w:rPr><w:t xml:space="preserve">Turma: </w:t></w:r>
            <w:r><w:rPr><w:b/><w:sz w:val="19"/><w:color w:val="0F172A"/></w:rPr><w:t>${escapeXml(turma.nome)}</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="2600" w:type="dxa"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:after="0"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="475569"/></w:rPr><w:t xml:space="preserve">Turno: </w:t></w:r>
            <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="0F172A"/></w:rPr><w:t>${escapeXml(turnoFormatado)}</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="3500" w:type="dxa"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:after="0"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="475569"/></w:rPr><w:t xml:space="preserve">Sala: </w:t></w:r>
            <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="0F172A"/></w:rPr><w:t>${escapeXml(salaFormatada)}</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="3800" w:type="dxa"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:after="0"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="475569"/></w:rPr><w:t xml:space="preserve">Matriculados: </w:t></w:r>
            <w:r><w:rPr><w:b/><w:sz w:val="19"/><w:color w:val="1E40AF"/></w:rPr><w:t>${totalEstudantes} estudante(s)</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="2600" w:type="dxa"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:after="0"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="475569"/></w:rPr><w:t xml:space="preserve">Ano Letivo: </w:t></w:r>
            <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="0F172A"/></w:rPr><w:t>${escapeXml(String(anoLetivo))}</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="3500" w:type="dxa"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:after="0"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="475569"/></w:rPr><w:t xml:space="preserve">Emissão: </w:t></w:r>
            <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="0F172A"/></w:rPr><w:t>${escapeXml(dataEmissao)}</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>
      ${extraStatXml ? `
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="9900" w:type="dxa"/>
            <w:gridSpan w:val="3"/>
          </w:tcPr>
          ${extraStatXml}
        </w:tc>
      </w:tr>
      ` : ''}
    </w:tbl>
  `;
}

/**
 * 1. GERAR LISTAGEM COM ASSINATURA (DOCX)
 * Estudantes matriculados na turma em ordem alfabética, data de nascimento e espaço para assinatura.
 */
export function generateTurmaListaAssinaturaDocx(options: TurmaDocxOptions): Buffer {
  const { turma, estudantes, escolaConfig, dataEmissao } = options;
  const nomeEscola = escolaConfig?.nome_escola || 'Colégio Integrado PLUGUE';
  const dataHoraEmissao = getDataEmissaoFormatada(dataEmissao);

  // Ordenação alfabética estrita por nome_completo
  const estudantesOrdenados = [...estudantes].sort((a, b) => {
    return (a.nome_completo || '').localeCompare(b.nome_completo || '', 'pt-BR', { sensitivity: 'base' });
  });

  const totalAee = estudantesOrdenados.filter((e) => {
    return e.aee === true || e.aee === 1 || String(e.aee).toLowerCase() === 'true' || String(e.aee).toLowerCase() === 'sim';
  }).length;

  const extraStatXml = totalAee > 0 ? `
    <w:p>
      <w:pPr><w:spacing w:before="40" w:after="0"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="DC2626"/></w:rPr><w:t xml:space="preserve">Inclusão &amp; AEE: </w:t></w:r>
      <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="334155"/></w:rPr><w:t>${totalAee} estudante(s) com AEE destacado(s) com asterisco vermelho (*)</w:t></w:r>
    </w:p>
  ` : undefined;

  // Linhas da tabela de estudantes
  let linhasTabelaXml = '';

  if (estudantesOrdenados.length === 0) {
    linhasTabelaXml = `
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="9900" w:type="dxa"/>
            <w:gridSpan w:val="3"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:spacing w:before="240" w:after="240"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:i/>
                <w:sz w:val="20"/>
                <w:color w:val="64748B"/>
              </w:rPr>
              <w:t>Nenhum estudante matriculado nesta turma até o momento.</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
    `;
  } else {
    linhasTabelaXml = estudantesOrdenados.map((est, index) => {
      const isEven = index % 2 === 0;
      const bgCor = isEven ? 'FFFFFF' : 'F8FAFC';
      const numOrdem = String(index + 1).padStart(2, '0');
      const nomeUpper = (est.nome_completo || '').trim().toUpperCase();
      const isAee = est.aee === true || est.aee === 1 || String(est.aee).toLowerCase() === 'true' || String(est.aee).toLowerCase() === 'sim';

      return `
        <w:tr>
          <w:trPr>
            <w:cantSplit/>
            <w:trHeight w:val="560" w:hRule="atLeast"/>
          </w:trPr>
          <!-- Nº -->
          <w:tc>
            <w:tcPr>
              <w:tcW w:w="600" w:type="dxa"/>
              <w:shd w:val="clear" w:color="auto" w:fill="${bgCor}"/>
              <w:vAlign w:val="center"/>
            </w:tcPr>
            <w:p>
              <w:pPr>
                <w:jc w:val="center"/>
                <w:spacing w:before="60" w:after="60"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                  <w:sz w:val="18"/>
                  <w:color w:val="64748B"/>
                </w:rPr>
                <w:t>${numOrdem}</w:t>
              </w:r>
            </w:p>
          </w:tc>
          <!-- NOME DO ESTUDANTE (com * vermelho para AEE) -->
          <w:tc>
            <w:tcPr>
              <w:tcW w:w="4100" w:type="dxa"/>
              <w:shd w:val="clear" w:color="auto" w:fill="${bgCor}"/>
              <w:vAlign w:val="center"/>
            </w:tcPr>
            <w:p>
              <w:pPr>
                <w:jc w:val="left"/>
                <w:spacing w:before="60" w:after="60"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                  <w:b/>
                  <w:sz w:val="19"/>
                  <w:color w:val="0F172A"/>
                </w:rPr>
                <w:t xml:space="preserve">${escapeXml(nomeUpper)}</w:t>
              </w:r>
              ${isAee ? `
              <w:r>
                <w:rPr>
                  <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                  <w:b/>
                  <w:sz w:val="22"/>
                  <w:color w:val="DC2626"/>
                </w:rPr>
                <w:t xml:space="preserve"> *</w:t>
              </w:r>` : ''}
            </w:p>
          </w:tc>
          <!-- ESPAÇO PARA ASSINATURA (AMPLIADO) -->
          <w:tc>
            <w:tcPr>
              <w:tcW w:w="5200" w:type="dxa"/>
              <w:shd w:val="clear" w:color="auto" w:fill="${bgCor}"/>
              <w:vAlign w:val="bottom"/>
            </w:tcPr>
            <w:p>
              <w:pPr>
                <w:jc w:val="center"/>
                <w:spacing w:before="160" w:after="30"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                  <w:sz w:val="18"/>
                  <w:color w:val="94A3B8"/>
                </w:rPr>
                <w:t>__________________________________________________</w:t>
              </w:r>
            </w:p>
          </w:tc>
        </w:tr>
      `;
    }).join('');
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${renderCabecalhoInstitucionalXml(escolaConfig)}

    <!-- Título do Documento -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="60" w:after="40"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
          <w:b/>
          <w:sz w:val="26"/>
          <w:color w:val="1E3A8A"/>
        </w:rPr>
        <w:t>LISTAGEM DE ESTUDANTES - TERMO DE ASSINATURA</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="0" w:after="140"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
          <w:sz w:val="18"/>
          <w:color w:val="64748B"/>
        </w:rPr>
        <w:t>Relação Nominal dos Estudantes Matriculados e Controle de Assinatura</w:t>
      </w:r>
    </w:p>

    <!-- Caixa de Identificação da Turma -->
    ${renderBoxDadosTurmaXml(turma, estudantesOrdenados.length, dataHoraEmissao, extraStatXml)}

    <!-- Espaço antes da tabela -->
    <w:p>
      <w:pPr>
        <w:spacing w:before="120" w:after="60"/>
      </w:pPr>
    </w:p>

    <!-- TABELA DE ESTUDANTES -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9900" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
        </w:tblBorders>
        <w:tblCellMar>
          <w:top w:w="80" w:type="dxa"/>
          <w:bottom w:w="80" w:type="dxa"/>
          <w:left w:w="100" w:type="dxa"/>
          <w:right w:w="100" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      <!-- Cabeçalho da Tabela (3 Colunas: Nº, NOME DO ESTUDANTE, ASSINATURA) -->
      <w:tr>
        <w:trPr>
          <w:tblHeader/>
          <w:cantSplit/>
        </w:trPr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="600" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="1E3A8A"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:spacing w:before="60" w:after="60"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                <w:b/>
                <w:sz w:val="18"/>
                <w:color w:val="FFFFFF"/>
              </w:rPr>
              <w:t>Nº</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="4100" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="1E3A8A"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="left"/>
              <w:spacing w:before="60" w:after="60"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                <w:b/>
                <w:sz w:val="18"/>
                <w:color w:val="FFFFFF"/>
              </w:rPr>
              <w:t>NOME DO ESTUDANTE</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="5200" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="1E3A8A"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:spacing w:before="60" w:after="60"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                <w:b/>
                <w:sz w:val="18"/>
                <w:color w:val="FFFFFF"/>
              </w:rPr>
              <w:t>ASSINATURA</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
      ${linhasTabelaXml}
    </w:tbl>

    <!-- Legenda para Estudantes AEE -->
    ${totalAee > 0 ? `
    <w:p>
      <w:pPr>
        <w:spacing w:before="80" w:after="80"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
          <w:b/>
          <w:sz w:val="18"/>
          <w:color w:val="DC2626"/>
        </w:rPr>
        <w:t xml:space="preserve">(*) </w:t>
      </w:r>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
          <w:i/>
          <w:sz w:val="16"/>
          <w:color w:val="475569"/>
        </w:rPr>
        <w:t>Identifica estudante com Atendimento Educacional Especializado (AEE).</w:t>
      </w:r>
    </w:p>` : ''}

    <!-- Bloco de Fechamento e Assinaturas -->
    <w:p>
      <w:pPr>
        <w:spacing w:before="240" w:after="160"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:i/>
          <w:sz w:val="17"/>
          <w:color w:val="64748B"/>
        </w:rPr>
        <w:t>Certificamos que a relação acima contempla os ${estudantesOrdenados.length} estudante(s) matriculado(s) nesta turma no período letivo.</w:t>
      </w:r>
    </w:p>

    <!-- Espaço para assinaturas dos responsáveis pela turma -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9900" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="none"/>
          <w:left w:val="none"/>
          <w:bottom w:val="none"/>
          <w:right w:val="none"/>
          <w:insideH w:val="none"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="4950" w:type="dxa"/>
            <w:vAlign w:val="bottom"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:spacing w:before="360" w:after="40"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:sz w:val="18"/>
                <w:color w:val="94A3B8"/>
              </w:rPr>
              <w:t>___________________________________________</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:spacing w:after="0"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:b/>
                <w:sz w:val="18"/>
                <w:color w:val="1E293B"/>
              </w:rPr>
              <w:t>Professor(a) Regente / Responsável</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="4950" w:type="dxa"/>
            <w:vAlign w:val="bottom"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:spacing w:before="360" w:after="40"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:sz w:val="18"/>
                <w:color w:val="94A3B8"/>
              </w:rPr>
              <w:t>___________________________________________</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:spacing w:after="0"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:b/>
                <w:sz w:val="18"/>
                <w:color w:val="1E293B"/>
              </w:rPr>
              <w:t>Secretaria / Direção Escolar</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <!-- Propriedades da Página A4 -->
    <w:sectPr>
      <w:footerReference w:type="default" r:id="rIdFooter"/>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const files = [
    { name: '[Content_Types].xml', data: COMMON_CONTENT_TYPES_XML },
    { name: '_rels/.rels', data: COMMON_PACKAGE_RELS_XML },
    { name: 'word/_rels/document.xml.rels', data: COMMON_DOCUMENT_RELS_XML },
    { name: 'word/document.xml', data: documentXml },
    { name: 'word/styles.xml', data: COMMON_STYLES_XML },
    { name: 'word/footer1.xml', data: renderFooterXml(nomeEscola) },
  ];

  return buildZipArchive(files);
}

/**
 * 2. GERAR LISTAGEM CADASTRAL (AEE & CPF) (DOCX)
 * Estudantes em ordem alfabética, data de nascimento, se AEE ou não e CPF.
 */
export function generateTurmaListaCadastroDocx(options: TurmaDocxOptions): Buffer {
  const { turma, estudantes, escolaConfig, dataEmissao } = options;
  const nomeEscola = escolaConfig?.nome_escola || 'Colégio Integrado PLUGUE';
  const dataHoraEmissao = getDataEmissaoFormatada(dataEmissao);

  // Ordenação alfabética estrita por nome_completo
  const estudantesOrdenados = [...estudantes].sort((a, b) => {
    return (a.nome_completo || '').localeCompare(b.nome_completo || '', 'pt-BR', { sensitivity: 'base' });
  });

  const totalAee = estudantesOrdenados.filter((e) => {
    return e.aee === true || e.aee === 1 || String(e.aee).toLowerCase() === 'true' || String(e.aee).toLowerCase() === 'sim';
  }).length;
  const pctAee = estudantesOrdenados.length > 0 ? Math.round((totalAee / estudantesOrdenados.length) * 100) : 0;

  // Linhas da tabela de estudantes
  let linhasTabelaXml = '';

  if (estudantesOrdenados.length === 0) {
    linhasTabelaXml = `
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="9900" w:type="dxa"/>
            <w:gridSpan w:val="5"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:spacing w:before="240" w:after="240"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:i/>
                <w:sz w:val="20"/>
                <w:color w:val="64748B"/>
              </w:rPr>
              <w:t>Nenhum estudante matriculado nesta turma até o momento.</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
    `;
  } else {
    linhasTabelaXml = estudantesOrdenados.map((est, index) => {
      const isEven = index % 2 === 0;
      const bgCor = isEven ? 'FFFFFF' : 'F8FAFC';
      const numOrdem = String(index + 1).padStart(2, '0');
      const nomeUpper = (est.nome_completo || '').trim().toUpperCase();
      const dataNasc = formatarDataNascimento(est.data_nascimento);
      const isAee = est.aee === true || est.aee === 1 || String(est.aee).toLowerCase() === 'true' || String(est.aee).toLowerCase() === 'sim';
      const textoAee = isAee ? 'SIM' : 'NÃO';
      const corTextoAee = isAee ? '6D28D9' : '64748B';
      const cpfFormatado = formatarCpf(est.cpf);

      return `
        <w:tr>
          <w:trPr>
            <w:cantSplit/>
            <w:trHeight w:val="380" w:hRule="atLeast"/>
          </w:trPr>
          <!-- Nº -->
          <w:tc>
            <w:tcPr>
              <w:tcW w:w="600" w:type="dxa"/>
              <w:shd w:val="clear" w:color="auto" w:fill="${bgCor}"/>
              <w:vAlign w:val="center"/>
            </w:tcPr>
            <w:p>
              <w:pPr>
                <w:jc w:val="center"/>
                <w:spacing w:before="50" w:after="50"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                  <w:sz w:val="18"/>
                  <w:color w:val="64748B"/>
                </w:rPr>
                <w:t>${numOrdem}</w:t>
              </w:r>
            </w:p>
          </w:tc>
          <!-- NOME DO ESTUDANTE -->
          <w:tc>
            <w:tcPr>
              <w:tcW w:w="4500" w:type="dxa"/>
              <w:shd w:val="clear" w:color="auto" w:fill="${bgCor}"/>
              <w:vAlign w:val="center"/>
            </w:tcPr>
            <w:p>
              <w:pPr>
                <w:jc w:val="left"/>
                <w:spacing w:before="50" w:after="50"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                  <w:b/>
                  <w:sz w:val="19"/>
                  <w:color w:val="0F172A"/>
                </w:rPr>
                <w:t xml:space="preserve">${escapeXml(nomeUpper)}</w:t>
              </w:r>
            </w:p>
          </w:tc>
          <!-- DATA DE NASCIMENTO -->
          <w:tc>
            <w:tcPr>
              <w:tcW w:w="1600" w:type="dxa"/>
              <w:shd w:val="clear" w:color="auto" w:fill="${bgCor}"/>
              <w:vAlign w:val="center"/>
            </w:tcPr>
            <w:p>
              <w:pPr>
                <w:jc w:val="center"/>
                <w:spacing w:before="50" w:after="50"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                  <w:sz w:val="18"/>
                  <w:color w:val="334155"/>
                </w:rPr>
                <w:t>${escapeXml(dataNasc)}</w:t>
              </w:r>
            </w:p>
          </w:tc>
          <!-- SE AEE OU NÃO -->
          <w:tc>
            <w:tcPr>
              <w:tcW w:w="1200" w:type="dxa"/>
              <w:shd w:val="clear" w:color="auto" w:fill="${bgCor}"/>
              <w:vAlign w:val="center"/>
            </w:tcPr>
            <w:p>
              <w:pPr>
                <w:jc w:val="center"/>
                <w:spacing w:before="50" w:after="50"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                  <w:b/>
                  <w:sz w:val="18"/>
                  <w:color w:val="${corTextoAee}"/>
                </w:rPr>
                <w:t>${textoAee}</w:t>
              </w:r>
            </w:p>
          </w:tc>
          <!-- CPF -->
          <w:tc>
            <w:tcPr>
              <w:tcW w:w="2000" w:type="dxa"/>
              <w:shd w:val="clear" w:color="auto" w:fill="${bgCor}"/>
              <w:vAlign w:val="center"/>
            </w:tcPr>
            <w:p>
              <w:pPr>
                <w:jc w:val="center"/>
                <w:spacing w:before="50" w:after="50"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                  <w:sz w:val="18"/>
                  <w:color w:val="1E293B"/>
                </w:rPr>
                <w:t>${escapeXml(cpfFormatado)}</w:t>
              </w:r>
            </w:p>
          </w:tc>
        </w:tr>
      `;
    }).join('');
  }

  const extraStatXml = `
    <w:p>
      <w:pPr><w:spacing w:before="40" w:after="0"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="6D28D9"/></w:rPr><w:t xml:space="preserve">Inclusão &amp; AEE: </w:t></w:r>
      <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="334155"/></w:rPr><w:t>${totalAee} estudante(s) com AEE (${pctAee}%) • ${estudantesOrdenados.length - totalAee} regulares</w:t></w:r>
    </w:p>
  `;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${renderCabecalhoInstitucionalXml(escolaConfig)}

    <!-- Título do Documento -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="60" w:after="40"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
          <w:b/>
          <w:sz w:val="26"/>
          <w:color w:val="1E3A8A"/>
        </w:rPr>
        <w:t>RELAÇÃO CADASTRAL DE ESTUDANTES (AEE &amp; CPF)</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="0" w:after="140"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
          <w:sz w:val="18"/>
          <w:color w:val="64748B"/>
        </w:rPr>
        <w:t>Relação Nominal dos Estudantes com Nascimento, Atendimento Especializado (AEE) e CPF</w:t>
      </w:r>
    </w:p>

    <!-- Caixa de Identificação da Turma com Estatística de AEE -->
    ${renderBoxDadosTurmaXml(turma, estudantesOrdenados.length, dataHoraEmissao, extraStatXml)}

    <!-- Espaço antes da tabela -->
    <w:p>
      <w:pPr>
        <w:spacing w:before="120" w:after="60"/>
      </w:pPr>
    </w:p>

    <!-- TABELA DE ESTUDANTES -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9900" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
        </w:tblBorders>
        <w:tblCellMar>
          <w:top w:w="80" w:type="dxa"/>
          <w:bottom w:w="80" w:type="dxa"/>
          <w:left w:w="100" w:type="dxa"/>
          <w:right w:w="100" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      <!-- Cabeçalho da Tabela -->
      <w:tr>
        <w:trPr>
          <w:tblHeader/>
          <w:cantSplit/>
        </w:trPr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="600" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="1E3A8A"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:spacing w:before="60" w:after="60"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                <w:b/>
                <w:sz w:val="18"/>
                <w:color w:val="FFFFFF"/>
              </w:rPr>
              <w:t>Nº</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="4500" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="1E3A8A"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="left"/>
              <w:spacing w:before="60" w:after="60"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                <w:b/>
                <w:sz w:val="18"/>
                <w:color w:val="FFFFFF"/>
              </w:rPr>
              <w:t>NOME DO ESTUDANTE</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="1600" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="1E3A8A"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:spacing w:before="60" w:after="60"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                <w:b/>
                <w:sz w:val="18"/>
                <w:color w:val="FFFFFF"/>
              </w:rPr>
              <w:t>NASCIMENTO</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="1200" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="1E3A8A"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:spacing w:before="60" w:after="60"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                <w:b/>
                <w:sz w:val="18"/>
                <w:color w:val="FFFFFF"/>
              </w:rPr>
              <w:t>AEE</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="2000" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="1E3A8A"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:spacing w:before="60" w:after="60"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                <w:b/>
                <w:sz w:val="18"/>
                <w:color w:val="FFFFFF"/>
              </w:rPr>
              <w:t>CPF</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
      ${linhasTabelaXml}
    </w:tbl>

    <!-- Resumo Numérico Institucional -->
    <w:p>
      <w:pPr>
        <w:spacing w:before="200" w:after="120"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:i/>
          <w:sz w:val="17"/>
          <w:color w:val="64748B"/>
        </w:rPr>
        <w:t>Total Geral: ${estudantesOrdenados.length} estudante(s) | AEE: ${totalAee} (${pctAee}%) | Regulares: ${estudantesOrdenados.length - totalAee}</w:t>
      </w:r>
    </w:p>

    <!-- Espaço para assinaturas dos responsáveis pela turma -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9900" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="none"/>
          <w:left w:val="none"/>
          <w:bottom w:val="none"/>
          <w:right w:val="none"/>
          <w:insideH w:val="none"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="4950" w:type="dxa"/>
            <w:vAlign w:val="bottom"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:spacing w:before="360" w:after="40"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:sz w:val="18"/>
                <w:color w:val="94A3B8"/>
              </w:rPr>
              <w:t>___________________________________________</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:spacing w:after="0"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:b/>
                <w:sz w:val="18"/>
                <w:color w:val="1E293B"/>
              </w:rPr>
              <w:t>Coordenação Pedagógica / Inclusão &amp; AEE</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="4950" w:type="dxa"/>
            <w:vAlign w:val="bottom"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:spacing w:before="360" w:after="40"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:sz w:val="18"/>
                <w:color w:val="94A3B8"/>
              </w:rPr>
              <w:t>___________________________________________</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:spacing w:after="0"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:b/>
                <w:sz w:val="18"/>
                <w:color w:val="1E293B"/>
              </w:rPr>
              <w:t>Secretaria / Direção Escolar</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <!-- Propriedades da Página A4 -->
    <w:sectPr>
      <w:footerReference w:type="default" r:id="rIdFooter"/>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const files = [
    { name: '[Content_Types].xml', data: COMMON_CONTENT_TYPES_XML },
    { name: '_rels/.rels', data: COMMON_PACKAGE_RELS_XML },
    { name: 'word/_rels/document.xml.rels', data: COMMON_DOCUMENT_RELS_XML },
    { name: 'word/document.xml', data: documentXml },
    { name: 'word/styles.xml', data: COMMON_STYLES_XML },
    { name: 'word/footer1.xml', data: renderFooterXml(nomeEscola) },
  ];

  return buildZipArchive(files);
}
