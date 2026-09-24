import zlib from 'node:zlib';

export interface DocxReportData {
  escola: {
    nome: string;
    cnpj: string;
    endereco: string;
    contato: string;
    anoLetivo: number;
    logoUrl?: string;
  };
  aluno: {
    nome: string;
    turma: string;
    turno: string;
    nascimento: string;
    idade: number | string;
    matricula: string;
  };
  dataEmissao: string;
  conteudoFinal: string;
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildZipArchive(files: { name: string; data: Buffer | string }[]): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, 'utf8');
    const dataBuf = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data, 'utf8');
    const uncompressedSize = dataBuf.length;
    const crc = zlib.crc32(dataBuf);
    const compressedData = zlib.deflateRawSync(dataBuf);
    const compressedSize = compressedData.length;

    // Local file header
    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(8, 8); // Deflate
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressedSize, 18);
    localHeader.writeUInt32LE(uncompressedSize, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);
    nameBuf.copy(localHeader, 30);

    localHeaders.push(localHeader, compressedData);

    // Central directory header
    const centralHeader = Buffer.alloc(46 + nameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressedSize, 20);
    centralHeader.writeUInt32LE(uncompressedSize, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    nameBuf.copy(centralHeader, 46);

    centralHeaders.push(centralHeader);

    offset += localHeader.length + compressedData.length;
  }

  const centralDirBuf = Buffer.concat(centralHeaders);
  const centralDirSize = centralDirBuf.length;
  const centralDirOffset = offset;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localHeaders, centralDirBuf, eocd]);
}

export function generateDocxReport(data: DocxReportData): Buffer {
  const { escola, aluno, dataEmissao, conteudoFinal } = data;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  const packageRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const documentRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:color w:val="222222"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:line="276" w:lineRule="auto" w:after="160"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>`;

  // Footer com Numeração de Páginas: "Página X de Y"
  const footer1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:spacing w:before="120" w:after="0"/>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
        <w:sz w:val="18"/>
        <w:color w:val="777777"/>
      </w:rPr>
      <w:t xml:space="preserve">Página </w:t>
    </w:r>
    <w:fldSimple w:instr="PAGE"/>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
        <w:sz w:val="18"/>
        <w:color w:val="777777"/>
      </w:rPr>
      <w:t xml:space="preserve"> de </w:t>
    </w:r>
    <w:fldSimple w:instr="NUMPAGES"/>
  </w:p>
</w:ftr>`;

  // Parágrafos do corpo formatados com 11pt (22 half-pts), 1.15 line spacing (276), justificado
  const paragrafosCorpo = (conteudoFinal || 'Nenhum parecer redigido.')
    .split(/\r?\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => `
    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:spacing w:line="276" w:lineRule="auto" w:after="160"/>
        <w:ind w:firstLine="720"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
          <w:sz w:val="22"/>
          <w:color w:val="1E293B"/>
        </w:rPr>
        <w:t xml:space="preserve">${escapeXml(p)}</w:t>
      </w:r>
    </w:p>`).join('');

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <!-- CABEÇALHO INSTITUCIONAL: Grid de 2 colunas sem bordas -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9600" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="none"/>
          <w:left w:val="none"/>
          <w:bottom w:val="none"/>
          <w:right w:val="none"/>
          <w:insideH w:val="none"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
        <w:tblCellMar>
          <w:top w:w="80" w:type="dxa"/>
          <w:bottom w:w="80" w:type="dxa"/>
          <w:left w:w="100" w:type="dxa"/>
          <w:right w:w="100" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      <w:tr>
        <!-- Coluna Esquerda: Logotipo institucional / Brasão -->
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="4800" w:type="dxa"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:spacing w:after="40"/>
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
        <!-- Coluna Direita: Nome da Escola, CNPJ, Endereço, Contato e Ano Letivo (alinhada à direita) -->
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="4800" w:type="dxa"/>
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
              <w:t>${escapeXml(escola.nome || 'Colégio Integrado PLUGUE')}</w:t>
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
                <w:sz w:val="18"/>
                <w:color w:val="475569"/>
              </w:rPr>
              <w:t>CNPJ: ${escapeXml(escola.cnpj || '12.345.678/0001-90')} • Ano Letivo: ${escapeXml(String(escola.anoLetivo || 2026))}</w:t>
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
                <w:sz w:val="18"/>
                <w:color w:val="475569"/>
              </w:rPr>
              <w:t>${escapeXml(escola.endereco || 'Av. Central do Saber, 1500')} | ${escapeXml(escola.contato || '(11) 4002-8922')}</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <!-- Linha divisória horizontal separando o cabeçalho -->
    <w:p>
      <w:pPr>
        <w:pBdr>
          <w:bottom w:val="single" w:sz="16" w:space="8" w:color="1E40AF"/>
        </w:pBdr>
        <w:spacing w:before="120" w:after="240"/>
      </w:pPr>
    </w:p>

    <!-- Título centralizado (Negrito, Caixa Alta): PARECER PEDAGÓGICO INTEGRADO -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="100" w:after="240"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
          <w:b/>
          <w:sz w:val="28"/>
          <w:color w:val="0F172A"/>
        </w:rPr>
        <w:t>PARECER PEDAGÓGICO INTEGRADO</w:t>
      </w:r>
    </w:p>

    <!-- BLOCO DE IDENTIFICAÇÃO DO ESTUDANTE -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9600" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
        <w:tblCellMar>
          <w:top w:w="120" w:type="dxa"/>
          <w:bottom w:w="120" w:type="dxa"/>
          <w:left w:w="140" w:type="dxa"/>
          <w:right w:w="140" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:spacing w:line="240" w:lineRule="auto" w:after="60"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:b/>
                <w:sz w:val="20"/>
                <w:color w:val="334155"/>
              </w:rPr>
              <w:t>Nome Completo: </w:t>
            </w:r>
            <w:r>
              <w:rPr>
                <w:sz w:val="20"/>
                <w:color w:val="0F172A"/>
              </w:rPr>
              <w:t>${escapeXml(aluno.nome)}</w:t>
            </w:r>
            <w:r>
              <w:rPr>
                <w:b/>
                <w:sz w:val="20"/>
                <w:color w:val="334155"/>
              </w:rPr>
              <w:t> | Turma: </w:t>
            </w:r>
            <w:r>
              <w:rPr>
                <w:sz w:val="20"/>
                <w:color w:val="0F172A"/>
              </w:rPr>
              <w:t>${escapeXml(aluno.turma)}</w:t>
            </w:r>
            <w:r>
              <w:rPr>
                <w:b/>
                <w:sz w:val="20"/>
                <w:color w:val="334155"/>
              </w:rPr>
              <w:t> | Turno: </w:t>
            </w:r>
            <w:r>
              <w:rPr>
                <w:sz w:val="20"/>
                <w:color w:val="0F172A"/>
              </w:rPr>
              <w:t>${escapeXml(aluno.turno)}</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr>
              <w:spacing w:line="240" w:lineRule="auto" w:after="60"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:b/>
                <w:sz w:val="20"/>
                <w:color w:val="334155"/>
              </w:rPr>
              <w:t>Nascimento / Idade: </w:t>
            </w:r>
            <w:r>
              <w:rPr>
                <w:sz w:val="20"/>
                <w:color w:val="0F172A"/>
              </w:rPr>
              <w:t>${escapeXml(aluno.nascimento)} (${escapeXml(String(aluno.idade))} anos)</w:t>
            </w:r>
            <w:r>
              <w:rPr>
                <w:b/>
                <w:sz w:val="20"/>
                <w:color w:val="334155"/>
              </w:rPr>
              <w:t> | Matrícula: </w:t>
            </w:r>
            <w:r>
              <w:rPr>
                <w:sz w:val="20"/>
                <w:color w:val="0F172A"/>
              </w:rPr>
              <w:t>${escapeXml(aluno.matricula)}</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr>
              <w:spacing w:line="240" w:lineRule="auto" w:after="0"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:b/>
                <w:sz w:val="20"/>
                <w:color w:val="334155"/>
              </w:rPr>
              <w:t>Período Avaliado / Emissão: </w:t>
            </w:r>
            <w:r>
              <w:rPr>
                <w:sz w:val="20"/>
                <w:color w:val="0F172A"/>
              </w:rPr>
              <w:t>${escapeXml(dataEmissao)}</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <w:p>
      <w:pPr>
        <w:spacing w:before="240" w:after="0"/>
      </w:pPr>
    </w:p>

    <!-- CORPO DO DOCUMENTO CONSOLIDADO -->
    ${paragrafosCorpo}

    <!-- ESPAÇAMENTO PARA ASSINATURA -->
    <w:p>
      <w:pPr>
        <w:spacing w:before="480" w:after="0"/>
      </w:pPr>
    </w:p>

    <!-- RODAPÉ & BLOCO DE ASSINATURA -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="360" w:after="40"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
          <w:sz w:val="22"/>
          <w:color w:val="475569"/>
        </w:rPr>
        <w:t>____________________________________________</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:after="0"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
          <w:b/>
          <w:sz w:val="22"/>
          <w:color w:val="0F172A"/>
        </w:rPr>
        <w:t>Direção Escolar</w:t>
      </w:r>
    </w:p>

    <w:sectPr>
      <w:footerReference w:type="default" r:id="rIdFooter"/>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const files = [
    { name: '[Content_Types].xml', data: contentTypesXml },
    { name: '_rels/.rels', data: packageRelsXml },
    { name: 'word/_rels/document.xml.rels', data: documentRelsXml },
    { name: 'word/document.xml', data: documentXml },
    { name: 'word/styles.xml', data: stylesXml },
    { name: 'word/footer1.xml', data: footer1Xml },
  ];

  return buildZipArchive(files);
}
