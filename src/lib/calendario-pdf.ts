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
  diasDoMes: number[];
}

export interface GerarPdfCalendarioOpcoes {
  eventos: EventoEscolar[];
  categorias: CalendarioCategoria[];
  ano: number;
  mes: number; // 0 = Janeiro, 9 = Outubro, etc. (índice 0-11 padrão Date)
  escolaConfig: EscolaConfig;
  categoriaFiltroNome?: string;
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
 * Converte cor hexadecimal (#RRGGBB ou #RGB) para tupla RGB [r, g, b]
 */
function hexToRgb(hex: string): [number, number, number] {
  if (!hex || !hex.startsWith('#')) return [37, 99, 235];
  const h = hex.replace('#', '');
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16) || 0;
    const g = parseInt(h[1] + h[1], 16) || 0;
    const b = parseInt(h[2] + h[2], 16) || 0;
    return [r, g, b];
  }
  const r = parseInt(h.substring(0, 2), 16) || 0;
  const g = parseInt(h.substring(2, 4), 16) || 0;
  const b = parseInt(h.substring(4, 6), 16) || 0;
  return [r, g, b];
}

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
    aniverssario: 'cat-aniversarios',
    aniverssário: 'cat-aniversarios',
    aniverssarios: 'cat-aniversarios',
    aniverssários: 'cat-aniversarios',
    gestao: 'cat-gestao',
    gestão: 'cat-gestao',
  };

  if (legacyToId[termo]) {
    const canonical = categorias.find((c) => c.id === legacyToId[termo]);
    if (canonical) return canonical;
  }

  return {
    id: catIdOrName,
    nome: catIdOrName,
    cor_hex: '#2563EB',
    visivel_docentes: true,
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
 * - Filtra eventos que ocorrem no mês solicitado
 * - Mapeia os dias de ocorrência dentro do mês (diasDoMes)
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

  const eventosNoMes: EventoFormatadoPdf[] = [];

  for (const ev of eventos) {
    const catInfo = resolverCategoriaInfo(ev.categoria, categorias);

    // Mapeia todos os dias deste mês em que o evento ocorre
    const diasDoMes: number[] = [];
    let primeiraDataOcorrenciaNoMes: string | null = null;
    let ultimaDataOcorrenciaNoMes: string | null = null;

    for (let dia = 1; dia <= diasNoMes; dia++) {
      const dataString = `${ano}-${mesFormatado}-${String(dia).padStart(2, '0')}`;
      if (eventoOcorreNaData(ev, dataString, dia, mes + 1, ano)) {
        diasDoMes.push(dia);
        if (!primeiraDataOcorrenciaNoMes) {
          primeiraDataOcorrenciaNoMes = dataString;
        }
        ultimaDataOcorrenciaNoMes = dataString;
      }
    }

    // Se o evento não ocorre em nenhum dia deste mês, ignora
    if (diasDoMes.length === 0 || !primeiraDataOcorrenciaNoMes || !ultimaDataOcorrenciaNoMes) {
      continue;
    }

    // FORMATAÇÃO DAS DATAS E INTERVALOS:
    const iniStr = ev.data_inicio?.includes('T') ? ev.data_inicio.split('T')[0] : ev.data_inicio;
    const fimStr = (ev.data_fim || ev.data_inicio)?.includes('T')
      ? (ev.data_fim || ev.data_inicio).split('T')[0]
      : (ev.data_fim || ev.data_inicio);

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
      categoriaCor: ev.cor || catInfo.cor_hex || '#2563EB',
      local,
      descricao,
      chaveOrdenacao,
      diasDoMes,
    });
  }

  // Ordenação estritamente cronológica crescente
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
 * Converte imagem (logo) em Base64 Data URL no navegador com timeout de segurança
 */
async function carregarImagemBase64(url: string): Promise<string | null> {
  if (!url || typeof window === 'undefined') return null;

  return new Promise((resolve) => {
    let timer: any = null;
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    // Timeout de segurança (1500ms) para não travar geração do PDF se a imagem não carregar
    timer = setTimeout(() => {
      resolve(null);
    }, 1500);

    img.onload = () => {
      if (timer) clearTimeout(timer);
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
    img.onerror = () => {
      if (timer) clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Desenha o rodapé institucional em qualquer página do documento
 */
function desenharRodape(
  doc: any,
  pageWidth: number,
  pageHeight: number,
  marginX: number,
  pageNum: number,
  totalPages: number,
  dataHoraEmissao: string,
  nomeEscola: string
) {
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400

  const rodapeEsquerdo = `${nomeEscola}  •  Calendário Escolar Oficial  •  Emissão: ${dataHoraEmissao}`;
  doc.text(rodapeEsquerdo, marginX, pageHeight - 7);

  const rodapeDireito = `Página ${pageNum} de ${totalPages}`;
  doc.text(rodapeDireito, pageWidth - marginX, pageHeight - 7, { align: 'right' });
}

/**
 * Estrutura & Layout do PDF & Montagem do Documento
 * Gera e dispara o download do arquivo PDF A4 formatado e otimizado para impressão:
 * 1. Cabeçalho Institucional Timbrado Completo
 * 2. Banner de Mês e Ano em Destaque
 * 3. Grade Mensal Visual Completa (7 colunas Dom-Sáb, dias destacados e pílulas de eventos)
 * 4. Tabela Cronológica Detalhada de Todos os Eventos (autoTable com paginação inteligente)
 * 5. Rodapé com Numeração de Páginas e Assinatura Digital
 */
export async function gerarCalendarioMensalPdf({
  eventos,
  categorias,
  ano,
  mes,
  escolaConfig,
  categoriaFiltroNome,
}: GerarPdfCalendarioOpcoes): Promise<{ success: boolean; filename?: string; totalEventos?: number; error?: string }> {
  try {
    const { jsPDF } = await inicializarJsPdfEAutoTable();

    // 1. Filtragem e ordenação cronológica
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
    const contentWidth = pageWidth - marginX * 2; // 182mm

    const dataHoraEmissao = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const nomeEscola = (escolaConfig.nome_escola || 'PLUGUE - GESTÃO ESCOLAR INTEGRADA').toUpperCase();

    // 3. Cabeçalho Institucional Timbrado
    let cursorY = 12;

    const logoBase64 = await carregarImagemBase64(escolaConfig.logo_url || '/logo-plugue.png');

    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', marginX, cursorY, 20, 20, undefined, 'FAST');
      } catch (errLogo) {
        doc.setFillColor(30, 58, 138); // blue-900
        doc.roundedRect(marginX, cursorY, 20, 20, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('PLUGUE', marginX + 3.2, cursorY + 11.5);
      }
    } else {
      doc.setFillColor(30, 58, 138); // blue-900
      doc.roundedRect(marginX, cursorY, 20, 20, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('ESCOLA', marginX + 3.2, cursorY + 11.5);
    }

    // Identificação textual da escola ao lado do logotipo
    const textoX = marginX + 24;
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(nomeEscola, textoX, cursorY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
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
    doc.text(linhaContato, textoX, cursorY + 13.5);

    // Metadados discretos à direita no cabeçalho
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('SISTEMA DE GESTÃO ESCOLAR', pageWidth - marginX, cursorY + 5, { align: 'right' });
    doc.text(`Ano Letivo: ${escolaConfig.ano_letivo_ativo || ano}`, pageWidth - marginX, cursorY + 9.5, { align: 'right' });
    doc.text(`Emissão: ${dataHoraEmissao}`, pageWidth - marginX, cursorY + 13.5, { align: 'right' });

    cursorY += 21;

    // Linha divisória sutil
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.3);
    doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
    cursorY += 4;

    // 4. Banner com Título Principal em Destaque
    const bannerHeight = 13;
    doc.setFillColor(239, 246, 255); // blue-50 (#EFF6FF)
    doc.setDrawColor(191, 219, 254); // blue-200 (#BFDBFE)
    doc.roundedRect(marginX, cursorY, contentWidth, bannerHeight, 2, 2, 'FD');

    // Barra de acento lateral esquerda azul royal
    doc.setFillColor(37, 99, 235); // blue-600
    doc.rect(marginX, cursorY, 2.5, bannerHeight, 'F');

    // Título Principal
    doc.setTextColor(30, 58, 138); // blue-900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const tituloPrincipal = categoriaFiltroNome
      ? `Calendário Escolar - ${nomeMesCapitalizado} de ${ano} (${categoriaFiltroNome})`
      : `Calendário Escolar - ${nomeMesCapitalizado} de ${ano}`;
    doc.text(tituloPrincipal, marginX + 6, cursorY + 5.5);

    // Subtítulo e Resumo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const subinfo = `Visualização Oficial do Calendário Mensal  •  Total de eventos listados: ${eventosFiltrados.length} evento(s)`;
    doc.text(subinfo, marginX + 6, cursorY + 10);

    cursorY += bannerHeight + 4;

    // 5. GRADE VISUAL MENSAL DO CALENDÁRIO (7 Colunas: Domingo a Sábado)
    const primeiroDiaSemana = new Date(ano, mes, 1).getDay(); // 0 = Domingo
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    const colWidth = contentWidth / 7; // 26mm
    const headerRowHeight = 5.5;
    const dayRowHeight = 9.5;

    // Cabeçalho dos dias da semana
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(marginX, cursorY, contentWidth, headerRowHeight, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.rect(marginX, cursorY, contentWidth, headerRowHeight, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);

    for (let c = 0; c < 7; c++) {
      const x = marginX + c * colWidth;
      if (c === 0) doc.setTextColor(225, 29, 72); // Dom = red
      else if (c === 6) doc.setTextColor(100, 116, 139); // Sáb = slate
      else doc.setTextColor(30, 58, 138); // Seg-Sex = blue

      doc.text(DIAS_SEMANA_ABREV[c], x + colWidth / 2, cursorY + 3.8, { align: 'center' });

      if (c > 0) {
        doc.line(x, cursorY, x, cursorY + headerRowHeight);
      }
    }

    cursorY += headerRowHeight;

    // Mapa de eventos por dia (1..diasNoMes)
    const eventosPorDia = new Map<number, EventoFormatadoPdf[]>();
    for (const ev of eventosFiltrados) {
      const dias = ev.diasDoMes || [];
      for (const d of dias) {
        if (!eventosPorDia.has(d)) eventosPorDia.set(d, []);
        eventosPorDia.get(d)!.push(ev);
      }
    }

    // Renderização das células da grade
    let gridRow = 0;
    let gridCol = primeiroDiaSemana;
    const startGridY = cursorY;

    // Preenche células vazias antes do dia 1
    for (let empty = 0; empty < primeiroDiaSemana; empty++) {
      const cellX = marginX + empty * colWidth;
      const cellY = startGridY + gridRow * dayRowHeight;
      doc.setFillColor(248, 250, 252);
      doc.rect(cellX, cellY, colWidth, dayRowHeight, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(cellX, cellY, colWidth, dayRowHeight, 'S');
    }

    // Preenche dias 1..diasNoMes
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const cellX = marginX + gridCol * colWidth;
      const cellY = startGridY + gridRow * dayRowHeight;
      const isWeekend = gridCol === 0 || gridCol === 6;
      const evsNoDia = eventosPorDia.get(dia) || [];

      // Fundo da célula
      if (evsNoDia.length > 0) {
        doc.setFillColor(254, 243, 199); // yellow-100 suave para dias com eventos
      } else if (isWeekend) {
        doc.setFillColor(248, 250, 252); // slate-50
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(cellX, cellY, colWidth, dayRowHeight, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(cellX, cellY, colWidth, dayRowHeight, 'S');

      // Número do dia
      doc.setFont('helvetica', evsNoDia.length > 0 ? 'bold' : 'normal');
      doc.setFontSize(7.5);
      if (gridCol === 0) doc.setTextColor(225, 29, 72);
      else if (gridCol === 6) doc.setTextColor(100, 116, 139);
      else doc.setTextColor(15, 23, 42);

      doc.text(String(dia), cellX + 1.8, cellY + 3.5);

      // Pílulas indicadoras de eventos dentro do dia
      if (evsNoDia.length > 0) {
        const ev = evsNoDia[0];
        const [r, g, bl] = hexToRgb(ev.categoriaCor);
        const badgeY = cellY + 4.3;
        doc.setFillColor(r, g, bl);
        doc.roundedRect(cellX + 1.5, badgeY, colWidth - 3, 4, 0.8, 0.8, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        let tit = ev.titulo;
        if (tit.length > 15) tit = tit.substring(0, 14) + '…';
        doc.text(tit, cellX + colWidth / 2, badgeY + 2.8, { align: 'center' });

        if (evsNoDia.length > 1) {
          doc.setFontSize(5);
          doc.setTextColor(100, 116, 139);
          doc.text(`+${evsNoDia.length - 1}`, cellX + colWidth - 2, cellY + 3.5, { align: 'right' });
        }
      }

      gridCol++;
      if (gridCol === 7) {
        gridCol = 0;
        gridRow++;
      }
    }

    // Preenche células vazias ao final da última semana
    if (gridCol > 0) {
      while (gridCol < 7) {
        const cellX = marginX + gridCol * colWidth;
        const cellY = startGridY + gridRow * dayRowHeight;
        doc.setFillColor(248, 250, 252);
        doc.rect(cellX, cellY, colWidth, dayRowHeight, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(cellX, cellY, colWidth, dayRowHeight, 'S');
        gridCol++;
      }
      gridRow++;
    }

    cursorY = startGridY + gridRow * dayRowHeight + 5;

    // 6. TABELA DETALHADA DE CRONOGRAMA DE EVENTOS
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
      // Caixa elegante e harmoniosa quando o mês não possui eventos registrados
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(marginX, cursorY, contentWidth, 18, 2, 2, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(
        'Não há eventos letivos ou recessos registrados para este mês no calendário escolar.',
        pageWidth / 2,
        cursorY + 10.5,
        { align: 'center' }
      );
      cursorY += 24;
    } else {
      (doc as any).autoTable({
        startY: cursorY,
        margin: { top: 16, bottom: 18, left: marginX, right: marginX },
        columns: tableColumns,
        body: tableRows,
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 8,
          textColor: [15, 23, 42], // slate-900
          lineColor: [226, 232, 240], // slate-200
          lineWidth: 0.2,
          cellPadding: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 },
          overflow: 'linebreak',
          valign: 'top',
        },
        headStyles: {
          fillColor: [30, 58, 138], // Azul royal profundo (#1E3A8A)
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
          valign: 'middle',
          minCellHeight: 7,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252], // slate-50 (#F8FAFC)
        },
        columnStyles: {
          data: {
            cellWidth: 26,
            halign: 'center',
            fontStyle: 'bold',
            textColor: [30, 58, 138],
          },
          diaSemana: {
            cellWidth: 24,
            halign: 'center',
            textColor: [71, 85, 105],
          },
          titulo: {
            cellWidth: 46,
            fontStyle: 'bold',
            textColor: [15, 23, 42],
          },
          categoria: {
            cellWidth: 32,
            halign: 'center',
            fontStyle: 'bold',
            textColor: [30, 58, 138],
          },
          descricao: {
            cellWidth: 'auto',
            textColor: [51, 65, 85],
          },
        },
      });
    }

    // 7. Rodapé em todas as páginas geradas
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      desenharRodape(doc, pageWidth, pageHeight, marginX, i, totalPages, dataHoraEmissao, nomeEscola);
    }

    // 8. Download / Salvar Arquivo
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
