import { EventoEscolar, CalendarioCategoria, EscolaConfig } from '@/lib/types';

export interface EventoFormatadoPdf {
  id: string;
  dataInicioIso: string;
  dataFimIso: string;
  dataFormatada: string;
  diaSemanaFormatado: string;
  horarioFormatado: string;
  titulo: string;
  categoriaId: string;
  categoriaNome: string;
  categoriaCor: string;
  local: string;
  descricao: string;
  chaveOrdenacao: string;
}

export interface GerarPdfCalendarioOpcoes {
  eventos: EventoEscolar[];
  categorias: CalendarioCategoria[];
  ano: number;
  mes: number; // 0 = Janeiro, 9 = Outubro, etc. (índice 0-11 padrão Date)
  escolaConfig: EscolaConfig;
}

const DIAS_SEMANA_COMPLETO = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const DIAS_SEMANA_ABREV = [
  'Dom',
  'Seg',
  'Ter',
  'Qua',
  'Qui',
  'Sex',
  'Sáb',
];

const MESES_NOMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

/**
 * Resolve informações de categoria com retrocompatibilidade
 */
export function resolverCategoriaInfo(
  catIdOrName: string,
  categorias: CalendarioCategoria[]
): CalendarioCategoria {
  if (!catIdOrName) {
    return {
      id: 'cat-geral',
      nome: 'Geral',
      cor_hex: '#2563EB',
      visivel_docentes: true,
      sistema_protegida: false,
    };
  }

  const termo = catIdOrName.trim().toLowerCase();

  const found = categorias.find(
    (c) => c.id.toLowerCase() === termo || c.nome.toLowerCase() === termo
  );
  if (found) return found;

  const legacyToId: Record<string, string> = {
    prova: 'cat-provas',
    provas: 'cat-provas',
    avaliacao: 'cat-provas',
    avaliação: 'cat-provas',
    avaliacoes: 'cat-provas',
    avaliações: 'cat-provas',
    reuniao: 'cat-reunioes',
    reunião: 'cat-reunioes',
    reunioes: 'cat-reunioes',
    reuniões: 'cat-reunioes',
    feriado: 'cat-feriados',
    feriados: 'cat-feriados',
    recesso: 'cat-feriados',
    recessos: 'cat-feriados',
    cultural: 'cat-culturais',
    culturais: 'cat-culturais',
    aniversario: 'cat-aniversarios',
    aniversário: 'cat-aniversarios',
    aniversarios: 'cat-aniversarios',
    aniversários: 'cat-aniversarios',
    gestao: 'cat-gestao',
    gestão: 'cat-gestao',
  };

  if (legacyToId[termo]) {
    const canonical = categorias.find((c) => c.id === legacyToId[termo]);
    if (canonical) return canonical;
  }

  // Se o termo for explicitamente gestão ou aniversários, marcar como não visível por padrão
  const ehPrivado = termo.includes('gest') || termo.includes('anivers');

  return {
    id: catIdOrName,
    nome: catIdOrName,
    cor_hex: '#2563EB',
    visivel_docentes: !ehPrivado,
    sistema_protegida: false,
  };
}

/**
 * Determina se um evento ocorre em uma data específica considerando span de datas e recorrência
 */
export function eventoOcorreNaData(
  ev: EventoEscolar,
  dataString: string,
  diaNum: number,
  mesNum: number, // 1..12
  anoNum: number
): boolean {
  if (ev.recorrencia_data_limite) {
    const limiteStr = ev.recorrencia_data_limite.includes('T')
      ? ev.recorrencia_data_limite.split('T')[0]
      : ev.recorrencia_data_limite;
    if (dataString > limiteStr) {
      return false;
    }
  }

  const inicioStr = ev.data_inicio?.includes('T') ? ev.data_inicio.split('T')[0] : ev.data_inicio;
  const fimStr = (ev.data_fim || ev.data_inicio)?.includes('T')
    ? (ev.data_fim || ev.data_inicio).split('T')[0]
    : (ev.data_fim || ev.data_inicio);

  if (!inicioStr) return false;

  // Verificação direta do período base cadastrado
  if (dataString >= inicioStr && dataString <= fimStr) {
    return true;
  }

  // Recorrência ativa
  if (!ev.recorrencia_ativa || !ev.recorrencia_tipo || ev.recorrencia_tipo === 'NENHUMA') {
    return false;
  }

  if (dataString < inicioStr) {
    return false;
  }

  const [iniAno, iniMes, iniDia] = inicioStr.split('-').map(Number);
  const [fimAno, fimMes, fimDia] = fimStr.split('-').map(Number);
  const dtIni = new Date(iniAno, iniMes - 1, iniDia);
  const dtFim = new Date(fimAno, fimMes - 1, fimDia);
  const diffDias = Math.max(0, Math.round((dtFim.getTime() - dtIni.getTime()) / (1000 * 60 * 60 * 24)));

  const baseDia = ev.recorrencia_dia != null ? Number(ev.recorrencia_dia) : iniDia;

  if (ev.recorrencia_tipo === 'MENSAL') {
    return diaNum >= baseDia && diaNum <= baseDia + diffDias;
  }

  if (ev.recorrencia_tipo === 'ANUAL') {
    const baseMes = ev.recorrencia_mes != null ? Number(ev.recorrencia_mes) : iniMes;
    if (mesNum === baseMes) {
      return diaNum >= baseDia && diaNum <= baseDia + diffDias;
    }
  }

  return false;
}

/**
 * 2. Regras de Negócio & Filtragem:
 * - Filtra eventos do mês visível
 * - Exclui eventos não visíveis no perfil dos docentes (visivel_docentes === false)
 * - Ordena estritamente em ordem cronológica crescente (por data e horário)
 */
export function filtrarEOrdenarEventosMes(
  eventos: EventoEscolar[],
  categorias: CalendarioCategoria[],
  ano: number,
  mes: number // 0-indexed (ex: 9 = Outubro)
): EventoFormatadoPdf[] {
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const mesFormatado = String(mes + 1).padStart(2, '0');
  const inicioMesStr = `${ano}-${mesFormatado}-01`;
  const fimMesStr = `${ano}-${mesFormatado}-${String(diasNoMes).padStart(2, '0')}`;

  const eventosNoMes: EventoFormatadoPdf[] = [];

  for (const ev of eventos) {
    // 1. REGRA DE VISIBILIDADE:
    // Exclui do relatório eventos com flag de "NÃO Visível no perfil dos docentes"
    const catInfo = resolverCategoriaInfo(ev.categoria, categorias);
    const visivelDocentes =
      (ev as any).visivel_docentes !== false &&
      catInfo.visivel_docentes !== false &&
      catInfo.id !== 'cat-aniversarios' &&
      catInfo.nome.toLowerCase() !== 'aniversários';

    if (!visivelDocentes) {
      continue; // Ignora eventos exclusivos da gestão / ocultos para docentes
    }

    // 2. VERIFICA SE O EVENTO OCORRE NESTE MÊS:
    let primeiraDataOcorrenciaNoMes: string | null = null;
    let ultimaDataOcorrenciaNoMes: string | null = null;

    for (let dia = 1; dia <= diasNoMes; dia++) {
      const dataString = `${ano}-${mesFormatado}-${String(dia).padStart(2, '0')}`;
      if (eventoOcorreNaData(ev, dataString, dia, mes + 1, ano)) {
        if (!primeiraDataOcorrenciaNoMes) {
          primeiraDataOcorrenciaNoMes = dataString;
        }
        ultimaDataOcorrenciaNoMes = dataString;
      }
    }

    // Se o evento não ocorre em nenhum dia deste mês, ignora
    if (!primeiraDataOcorrenciaNoMes || !ultimaDataOcorrenciaNoMes) {
      continue;
    }

    // 3. FORMATAÇÃO DAS DATAS E INTERVALOS:
    const iniStr = ev.data_inicio?.includes('T') ? ev.data_inicio.split('T')[0] : ev.data_inicio;
    const fimStr = (ev.data_fim || ev.data_inicio)?.includes('T')
      ? (ev.data_fim || ev.data_inicio).split('T')[0]
      : (ev.data_fim || ev.data_inicio);

    // Datas originais ou projetadas (se recorrente)
    let dataIniEfetiva = iniStr;
    let dataFimEfetiva = fimStr;

    if (ev.recorrencia_tipo === 'MENSAL' || ev.recorrencia_tipo === 'ANUAL') {
      dataIniEfetiva = primeiraDataOcorrenciaNoMes;
      dataFimEfetiva = ultimaDataOcorrenciaNoMes;
    }

    const [aI, mI, dI] = (dataIniEfetiva || primeiraDataOcorrenciaNoMes).split('-');
    const [aF, mF, dF] = (dataFimEfetiva || ultimaDataOcorrenciaNoMes).split('-');

    const dtInicioObj = new Date(Number(aI), Number(mI) - 1, Number(dI));
    const dtFimObj = new Date(Number(aF), Number(mF) - 1, Number(dF));

    const isIntervalo = dataIniEfetiva !== dataFimEfetiva;

    // Formatação amigável da data
    let dataFormatada = `${dI}/${mI}/${aI}`;
    if (isIntervalo) {
      if (mI === mF && aI === aF) {
        dataFormatada = `${dI} a ${dF}/${mI}/${aI}`;
      } else {
        dataFormatada = `${dI}/${mI}/${aI} a ${dF}/${mF}/${aF}`;
      }
    }

    // Dia da semana
    let diaSemanaFormatado = DIAS_SEMANA_COMPLETO[dtInicioObj.getDay()] || '';
    if (isIntervalo) {
      const semIni = DIAS_SEMANA_ABREV[dtInicioObj.getDay()] || '';
      const semFim = DIAS_SEMANA_ABREV[dtFimObj.getDay()] || '';
      diaSemanaFormatado = `${semIni} a ${semFim}`;
    }

    // Horário
    let horarioFormatado = 'Dia Inteiro';
    if (!ev.all_day) {
      if ((ev as any).horario) {
        horarioFormatado = String((ev as any).horario);
      } else if ((ev as any).hora_inicio) {
        const hIni = String((ev as any).hora_inicio);
        const hFim = (ev as any).hora_fim ? ` - ${(ev as any).hora_fim}` : '';
        horarioFormatado = `${hIni}${hFim}`;
      } else if (ev.data_inicio?.includes('T') && !ev.data_inicio.endsWith('T00:00:00') && !ev.data_inicio.endsWith('T00:00:00Z')) {
        const timePart = ev.data_inicio.split('T')[1]?.substring(0, 5);
        if (timePart) {
          horarioFormatado = timePart;
        }
      }
    }

    // Local
    const local = (ev as any).local || (ev as any).localizacao || (ev as any).sala || '-';

    // Descrição
    const descricao = ev.descricao?.trim() || '-';

    // Chave de ordenação cronológica estrita: Data (YYYY-MM-DD) + Horário + Título
    const horaChave = horarioFormatado === 'Dia Inteiro' ? '00:00' : horarioFormatado;
    const chaveOrdenacao = `${primeiraDataOcorrenciaNoMes}_${horaChave}_${ev.titulo.toLowerCase()}`;

    eventosNoMes.push({
      id: ev.id,
      dataInicioIso: dataIniEfetiva,
      dataFimIso: dataFimEfetiva,
      dataFormatada,
      diaSemanaFormatado,
      horarioFormatado,
      titulo: ev.titulo,
      categoriaId: catInfo.id,
      categoriaNome: catInfo.nome,
      categoriaCor: catInfo.cor_hex || '#2563EB',
      local,
      descricao,
      chaveOrdenacao,
    });
  }

  // 3. ORDENAÇÃO ESTRITAMENTE CRONOLÓGICA CRESCENTE:
  eventosNoMes.sort((a, b) => a.chaveOrdenacao.localeCompare(b.chaveOrdenacao));

  return eventosNoMes;
}

/**
 * Injeta e aguarda carregamento de script no navegador
 */
function carregarScriptNavegador(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      return reject(new Error('Ambiente sem DOM.'));
    }

    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error(`Falha ao carregar script ${src}`)));
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.loaded = 'false';
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Erro ao carregar script ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Inicializa a biblioteca jsPDF com o plugin autoTable de forma resiliente
 */
async function inicializarJsPdfEAutoTable(): Promise<{ jsPDF: any; autoTable: any }> {
  const win = typeof window !== 'undefined' ? (window as any) : null;

  if (win && win.jspdf?.jsPDF) {
    const jsPDF = win.jspdf.jsPDF;
    if (typeof jsPDF.prototype.autoTable === 'function') {
      return { jsPDF, autoTable: jsPDF.prototype.autoTable };
    }
  }

  // Carrega scripts locais de public/vendor
  try {
    await carregarScriptNavegador('/vendor/jspdf.umd.min.js');
    await carregarScriptNavegador('/vendor/jspdf.plugin.autotable.min.js');
  } catch (errLocal) {
    console.warn('Falha ao carregar scripts locais, tentando CDN...', errLocal);
    await carregarScriptNavegador('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    await carregarScriptNavegador('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
  }

  if (!win?.jspdf?.jsPDF) {
    throw new Error('Biblioteca jsPDF não pôde ser carregada.');
  }

  const jsPDF = win.jspdf.jsPDF;
  if (typeof jsPDF.prototype.autoTable !== 'function' && win.jspdfAutoTable?.applyPlugin) {
    win.jspdfAutoTable.applyPlugin(jsPDF);
  }

  return { jsPDF, autoTable: jsPDF.prototype.autoTable || win.jspdfAutoTable };
}

/**
 * Converte imagem (logo) em Base64 Data URL no navegador para inclusão no PDF
 */
async function carregarImagemBase64(url: string): Promise<string | null> {
  if (!url || typeof window === 'undefined') return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * 3. Estrutura & Layout do PDF & Montagem do Documento
 * Gera e dispara o download do arquivo PDF A4 formatado e otimizado para impressão.
 */
export async function gerarCalendarioMensalPdf({
  eventos,
  categorias,
  ano,
  mes,
  escolaConfig,
}: GerarPdfCalendarioOpcoes): Promise<{ success: boolean; filename?: string; totalEventos?: number; error?: string }> {
  try {
    const { jsPDF } = await inicializarJsPdfEAutoTable();

    // 1. Filtragem e ordenação conforme regras de negócio
    const eventosFiltrados = filtrarEOrdenarEventosMes(eventos, categorias, ano, mes);
    const nomeMesExtenso = MESES_NOMES[mes] || 'Mês';
    const nomeMesCapitalizado = nomeMesExtenso.charAt(0).toUpperCase() + nomeMesExtenso.slice(1);

    // 2. Instanciação do documento jsPDF em formato A4 retrato
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
    const marginX = 14;

    const dataHoraEmissao = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // 3. Cabeçalho Institucional Timbrado
    let cursorY = 14;

    // Tentativa de carregar logotipo da escola
    const logoBase64 = await carregarImagemBase64(escolaConfig.logo_url || '/logo-plugue.png');

    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', marginX, cursorY, 20, 20, undefined, 'FAST');
      } catch (errLogo) {
        // Fallback gráfico se a imagem falhar
        doc.setFillColor(30, 58, 138);
        doc.roundedRect(marginX, cursorY, 20, 20, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('PLUG', marginX + 3.5, cursorY + 12);
      }
    } else {
      // Brasão / Ícone institucional decorativo
      doc.setFillColor(30, 58, 138); // Azul profundo #1E3A8A
      doc.roundedRect(marginX, cursorY, 20, 20, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('ESCOLA', marginX + 2.5, cursorY + 12);
    }

    // Identificação textual da escola ao lado do logotipo
    const textoX = marginX + 24;
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    const nomeEscola = (escolaConfig.nome_escola || 'PLUGUE - GESTÃO ESCOLAR INTEGRADA').toUpperCase();
    doc.text(nomeEscola, textoX, cursorY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105); // slate-600

    const inepText = escolaConfig.codigo_inep ? `INEP: ${escolaConfig.codigo_inep}` : '';
    const cnpjText = escolaConfig.cnpj ? `CNPJ: ${escolaConfig.cnpj}` : '';
    const linhaDocs = [inepText, cnpjText].filter(Boolean).join('  |  ');
    if (linhaDocs) {
      doc.text(linhaDocs, textoX, cursorY + 9.5);
    }

    const endText = escolaConfig.endereco || 'Endereço da Instituição de Ensino';
    const telText = escolaConfig.telefone ? `Tel: ${escolaConfig.telefone}` : '';
    const linhaContato = [endText, telText].filter(Boolean).join('  •  ');
    doc.text(linhaContato, textoX, cursorY + 14);

    // Metadados discretos à direita no cabeçalho
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('SISTEMA DE GESTÃO ESCOLAR', pageWidth - marginX, cursorY + 5, { align: 'right' });
    doc.text(`Ano Letivo: ${escolaConfig.ano_letivo_ativo || ano}`, pageWidth - marginX, cursorY + 9.5, { align: 'right' });
    doc.text(`Emissão: ${dataHoraEmissao}`, pageWidth - marginX, cursorY + 14, { align: 'right' });

    cursorY += 24;

    // Linha divisória sutil
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.4);
    doc.line(marginX, cursorY, pageWidth - marginX, cursorY);

    cursorY += 5;

    // 4. Banner com Título Principal em Destaque
    // "Eventos Escolares - Outubro de 2026"
    const bannerHeight = 16;
    doc.setFillColor(239, 246, 255); // blue-50 (#EFF6FF)
    doc.setDrawColor(191, 219, 254); // blue-200 (#BFDBFE)
    doc.roundedRect(marginX, cursorY, pageWidth - (marginX * 2), bannerHeight, 2, 2, 'FD');

    // Barra de acento lateral esquerda azul royal
    doc.setFillColor(37, 99, 235); // blue-600
    doc.rect(marginX, cursorY, 2.5, bannerHeight, 'F');

    // Título Principal
    doc.setTextColor(30, 58, 138); // blue-900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    const tituloRelatorio = `Eventos Escolares - ${nomeMesCapitalizado} de ${ano}`;
    doc.text(tituloRelatorio, marginX + 6, cursorY + 6.5);

    // Subtítulo e Resumo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const subinfo = `Visualização Oficial do Calendário Mensal  •  Total de eventos listados: ${eventosFiltrados.length} evento(s)  •  Visível aos Docentes`;
    doc.text(subinfo, marginX + 6, cursorY + 11.5);

    cursorY += bannerHeight + 6;

    // 5. Montagem do Corpo do Relatório com Tabela Limpa (autoTable)
    const tableColumns = [
      { header: 'Data', dataKey: 'data' },
      { header: 'Dia da Semana', dataKey: 'diaSemana' },
      { header: 'Título do Evento', dataKey: 'titulo' },
      { header: 'Categoria', dataKey: 'categoria' },
      { header: 'Descrição', dataKey: 'descricao' },
    ];

    const tableRows = eventosFiltrados.map((ev) => ({
      data: ev.dataFormatada,
      diaSemana: ev.diaSemanaFormatado,
      titulo: ev.titulo,
      categoria: ev.categoriaNome,
      descricao: ev.descricao,
      categoriaCor: ev.categoriaCor,
    }));

    if (tableRows.length === 0) {
      // Mensagem amigável caso não haja eventos visíveis
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(
        'Nenhum evento com visibilidade para o perfil docente está agendado para este mês.',
        pageWidth / 2,
        cursorY + 15,
        { align: 'center' }
      );
    } else {
      (doc as any).autoTable({
        startY: cursorY,
        margin: { left: marginX, right: marginX, bottom: 20 },
        columns: tableColumns,
        body: tableRows,
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 8.5,
          textColor: [15, 23, 42], // slate-900
          lineColor: [226, 232, 240], // slate-200
          lineWidth: 0.2,
          cellPadding: { top: 3, bottom: 3, left: 2.5, right: 2.5 },
          overflow: 'linebreak',
          valign: 'top',
        },
        headStyles: {
          fillColor: [30, 58, 138], // Azul royal profundo (#1E3A8A)
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5,
          halign: 'center',
          valign: 'middle',
          minCellHeight: 8,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252], // slate-50 (#F8FAFC)
        },
        columnStyles: {
          data: {
            cellWidth: 28,
            halign: 'center',
            fontStyle: 'bold',
            textColor: [30, 58, 138],
          },
          diaSemana: {
            cellWidth: 26,
            halign: 'center',
            textColor: [71, 85, 105],
          },
          titulo: {
            cellWidth: 48,
            fontStyle: 'bold',
            textColor: [15, 23, 42],
          },
          categoria: {
            cellWidth: 34,
            halign: 'center',
            fontStyle: 'bold',
            textColor: [30, 58, 138],
          },
          descricao: {
            cellWidth: 'auto', // Ocupa o restante (aprox 46mm)
            textColor: [51, 65, 85],
          },
        },
        didDrawPage: (data: any) => {
          // Rodapé em todas as páginas
          const totalPages = doc.internal.getNumberOfPages();
          const currentPage = data.pageNumber;

          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.3);
          doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(148, 163, 184); // slate-400

          const rodapeEsquerdo = `${escolaConfig.nome_escola || 'PLUGUE'}  •  Calendário Escolar Oficial  •  Emissão: ${dataHoraEmissao}`;
          doc.text(rodapeEsquerdo, marginX, pageHeight - 7);

          const rodapeDireito = `Página ${currentPage} de ${totalPages}`;
          doc.text(rodapeDireito, pageWidth - marginX, pageHeight - 7, { align: 'right' });
        },
      });
    }

    // 6. Download / Salvar Arquivo
    const nomeArquivo = `Eventos_Escolares_${nomeMesCapitalizado}_${ano}.pdf`;
    doc.save(nomeArquivo);

    return {
      success: true,
      filename: nomeArquivo,
      totalEventos: eventosFiltrados.length,
    };
  } catch (error: any) {
    console.error('Erro na geração do calendário em PDF:', error);
    return {
      success: false,
      error: error?.message || 'Falha ao gerar o documento PDF.',
    };
  }
}
