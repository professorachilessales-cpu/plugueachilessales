'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  RotateCw, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Check, 
  X, 
  RefreshCw, 
  Eye, 
  Maximize2,
  Sparkles,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface ModalRecorteFotoEstudanteProps {
  imagemSrc: string; // URL ou dataURL da imagem selecionada
  nomeEstudante: string;
  onConfirmar: (blob: Blob, previewUrl: string) => Promise<void> | void;
  onCancelar: () => void;
}

export function ModalRecorteFotoEstudante({
  imagemSrc,
  nomeEstudante,
  onConfirmar,
  onCancelar,
}: ModalRecorteFotoEstudanteProps) {
  // Configuração das dimensões do enquadramento (proporção estrita 3:4)
  const CROP_WIDTH = 270;
  const CROP_HEIGHT = 360; // 270 * 4 / 3 = 360 (exata proporção 3x4)
  const OUTPUT_WIDTH = 600;
  const OUTPUT_HEIGHT = 800; // 600 * 4 / 3 = 800px (alta definição oficial)

  const [zoom, setZoom] = useState<number>(1);
  const [rotacao, setRotacao] = useState<number>(0); // em graus (0, 90, 180, 270)
  const [posicao, setPosicao] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [arrastando, setArrastando] = useState<boolean>(false);
  const [pontoInicialArrasto, setPontoInicialArrasto] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [tipoMascara, setTipoMascara] = useState<'oval' | 'retangular'>('oval');
  const [carregandoImagem, setCarregandoImagem] = useState<boolean>(true);
  const [processandoEnvio, setProcessandoEnvio] = useState<boolean>(false);
  const [erroImagem, setErroImagem] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);

  // Carregar e validar a imagem
  useEffect(() => {
    setCarregandoImagem(true);
    setErroImagem(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageElementRef.current = img;
      setCarregandoImagem(false);
      // Auto-centralizar e ajustar zoom inicial para preencher a janela 3x4
      const aspectImg = img.naturalWidth / img.naturalHeight;
      const aspectCrop = CROP_WIDTH / CROP_HEIGHT; // 0.75
      let initialZoom = 1;
      if (aspectImg > aspectCrop) {
        // Imagem mais larga que 3x4: ajusta pela altura
        initialZoom = (CROP_HEIGHT / img.naturalHeight) * 1.05;
      } else {
        // Imagem mais alta ou quadrada: ajusta pela largura
        initialZoom = (CROP_WIDTH / img.naturalWidth) * 1.05;
      }
      setZoom(Math.max(0.5, Math.min(initialZoom, 2)));
      setPosicao({ x: 0, y: 0 });
      setRotacao(0);
    };
    img.onerror = () => {
      setCarregandoImagem(false);
      setErroImagem('Não foi possível carregar a imagem. Verifique o formato do arquivo.');
    };
    img.src = imagemSrc;
  }, [imagemSrc]);

  // Controles de Rotação
  const girarHorario = () => {
    setRotacao((prev) => (prev + 90) % 360);
  };

  const girarAntiHorario = () => {
    setRotacao((prev) => (prev - 90 + 360) % 360);
  };

  // Controles de Zoom
  const aumentarZoom = () => {
    setZoom((prev) => Math.min(prev + 0.15, 3.5));
  };

  const diminuirZoom = () => {
    setZoom((prev) => Math.max(prev - 0.15, 0.4));
  };

  const resetarAjustes = () => {
    setZoom(1);
    setRotacao(0);
    setPosicao({ x: 0, y: 0 });
  };

  // Suporte a Mouse Wheel para Zoom no enquadramento
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.max(0.4, Math.min(prev + delta, 3.5)));
  };

  // Manipulação de Arraste com Mouse
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setArrastando(true);
    setPontoInicialArrasto({
      x: e.clientX - posicao.x,
      y: e.clientY - posicao.y,
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!arrastando) return;
    setPosicao({
      x: e.clientX - pontoInicialArrasto.x,
      y: e.clientY - pontoInicialArrasto.y,
    });
  }, [arrastando, pontoInicialArrasto]);

  const handleMouseUp = useCallback(() => {
    setArrastando(false);
  }, []);

  // Manipulação de Arraste Touch (Mobile / Tablet)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setArrastando(true);
      const touch = e.touches[0];
      setPontoInicialArrasto({
        x: touch.clientX - posicao.x,
        y: touch.clientY - posicao.y,
      });
    }
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!arrastando || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPosicao({
      x: touch.clientX - pontoInicialArrasto.x,
      y: touch.clientY - pontoInicialArrasto.y,
    });
  }, [arrastando, pontoInicialArrasto]);

  const handleTouchEnd = useCallback(() => {
    setArrastando(false);
  }, []);

  // Ouvintes globais para arraste contínuo mesmo fora da viewport de corte
  useEffect(() => {
    if (arrastando) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [arrastando, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Função que executa o recorte exato 600x800px no canvas e gera o Blob JPEG com 85% de qualidade
  const handleConfirmarRecorte = async () => {
    if (!imageElementRef.current) return;
    setProcessandoEnvio(true);

    try {
      const img = imageElementRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_WIDTH;
      canvas.height = OUTPUT_HEIGHT;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Falha ao inicializar o motor de renderização gráfica 2D.');
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Fundo branco limpo para documentos oficiais
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

      // Fator de escala entre a tela de preview (270x360) e a saída de alta resolução (600x800)
      const scaleMultiplier = OUTPUT_WIDTH / CROP_WIDTH;

      ctx.save();

      // Move o ponto de origem para o centro da foto recortada
      ctx.translate(OUTPUT_WIDTH / 2, OUTPUT_HEIGHT / 2);

      // Aplica o deslocamento (pan) ajustado pela escala
      ctx.translate(posicao.x * scaleMultiplier, posicao.y * scaleMultiplier);

      // Aplica a rotação de 90°
      ctx.rotate((rotacao * Math.PI) / 180);

      // Aplica a escala combinada de zoom e resolução
      const renderScale = zoom * scaleMultiplier;
      ctx.scale(renderScale, renderScale);

      // Desenha a imagem centralizada
      ctx.drawImage(
        img,
        -img.naturalWidth / 2,
        -img.naturalHeight / 2,
        img.naturalWidth,
        img.naturalHeight
      );

      ctx.restore();

      // Exporta em image/jpeg a 85% de compressão conforme requisito estrito
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            setProcessandoEnvio(false);
            setErroImagem('Falha ao processar arquivo recortado.');
            return;
          }
          const previewUrl = URL.createObjectURL(blob);
          try {
            await onConfirmar(blob, previewUrl);
          } finally {
            setProcessandoEnvio(false);
          }
        },
        'image/jpeg',
        0.85
      );
    } catch (err: any) {
      setProcessandoEnvio(false);
      setErroImagem(err?.message || 'Erro durante a exportação da imagem recortada.');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-3 sm:p-5 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-school-blue-100 text-school-blue-700 dark:bg-school-blue-950 dark:text-school-blue-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Enquadramento & Recorte 3x4 Oficial
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {nomeEstudante || 'Estudante'} &bull; Proporção Estrita 3:4 (600x800px)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelar}
            disabled={processandoEnvio}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Área Visual de Corte Interativa */}
        <div className="relative flex-1 bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden select-none">
          {carregandoImagem ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-school-blue-500" />
              <span className="text-xs font-medium">Carregando imagem em alta resolução...</span>
            </div>
          ) : erroImagem ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center text-rose-400 gap-2">
              <AlertCircle className="h-10 w-10 text-rose-500" />
              <span className="text-xs font-semibold">{erroImagem}</span>
              <button
                type="button"
                onClick={onCancelar}
                className="mt-3 px-4 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-700"
              >
                Voltar
              </button>
            </div>
          ) : (
            <div
              ref={containerRef}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              className={`relative overflow-hidden rounded-2xl cursor-grab active:cursor-grabbing border-2 border-school-blue-400/80 shadow-[0_0_35px_rgba(59,130,246,0.3)] bg-slate-900 transition-all`}
              style={{
                width: `${CROP_WIDTH}px`,
                height: `${CROP_HEIGHT}px`,
              }}
            >
              {/* Imagem a ser recortada com transformações de Zoom, Rotação e Posição */}
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  transform: `translate(${posicao.x}px, ${posicao.y}px) rotate(${rotacao}deg) scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: arrastando ? 'none' : 'transform 0.05s ease-out',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagemSrc}
                  alt="Recorte da foto"
                  className="max-w-none select-none pointer-events-none"
                  draggable={false}
                />
              </div>

              {/* Guia Visual Sobreposta (Máscara Oval de Rosto ou Retangular de Documento) */}
              <div className="absolute inset-0 pointer-events-none">
                {tipoMascara === 'oval' ? (
                  <svg className="w-full h-full" viewBox={`0 0 ${CROP_WIDTH} ${CROP_HEIGHT}`}>
                    {/* Sombra de corte externa */}
                    <defs>
                      <mask id="face-crop-mask">
                        <rect width="100%" height="100%" fill="white" />
                        <ellipse
                          cx={CROP_WIDTH / 2}
                          cy={CROP_HEIGHT * 0.44}
                          rx={CROP_WIDTH * 0.38}
                          ry={CROP_HEIGHT * 0.33}
                          fill="black"
                        />
                      </mask>
                    </defs>
                    <rect
                      width="100%"
                      height="100%"
                      fill="rgba(2, 6, 23, 0.45)"
                      mask="url(#face-crop-mask)"
                    />

                    {/* Contorno sutil da cabeça */}
                    <ellipse
                      cx={CROP_WIDTH / 2}
                      cy={CROP_HEIGHT * 0.44}
                      rx={CROP_WIDTH * 0.38}
                      ry={CROP_HEIGHT * 0.33}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.7)"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                    />

                    {/* Guia da linha dos olhos */}
                    <line
                      x1={CROP_WIDTH * 0.22}
                      y1={CROP_HEIGHT * 0.41}
                      x2={CROP_WIDTH * 0.78}
                      y2={CROP_HEIGHT * 0.41}
                      stroke="rgba(59, 130, 246, 0.6)"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                    />

                    {/* Linha vertical central de simetria do rosto */}
                    <line
                      x1={CROP_WIDTH / 2}
                      y1={CROP_HEIGHT * 0.15}
                      x2={CROP_WIDTH / 2}
                      y2={CROP_HEIGHT * 0.75}
                      stroke="rgba(59, 130, 246, 0.4)"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                    />

                    {/* Guia do queixo / base da face */}
                    <line
                      x1={CROP_WIDTH * 0.35}
                      y1={CROP_HEIGHT * 0.74}
                      x2={CROP_WIDTH * 0.65}
                      y2={CROP_HEIGHT * 0.74}
                      stroke="rgba(255, 255, 255, 0.5)"
                      strokeWidth="1.2"
                      strokeDasharray="2 2"
                    />

                    {/* Marcadores de cantos da moldura 3x4 */}
                    <path
                      d={`M 10 25 L 10 10 L 25 10 M ${CROP_WIDTH - 10} 25 L ${CROP_WIDTH - 10} 10 L ${CROP_WIDTH - 25} 10 M 10 ${CROP_HEIGHT - 25} L 10 ${CROP_HEIGHT - 10} L 25 ${CROP_HEIGHT - 10} M ${CROP_WIDTH - 10} ${CROP_HEIGHT - 25} L ${CROP_WIDTH - 10} ${CROP_HEIGHT - 10} L ${CROP_WIDTH - 25} ${CROP_HEIGHT - 10}`}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.85)"
                      strokeWidth="2.5"
                    />
                  </svg>
                ) : (
                  <svg className="w-full h-full" viewBox={`0 0 ${CROP_WIDTH} ${CROP_HEIGHT}`}>
                    {/* Grade de terços para enquadramento retangular */}
                    <line
                      x1={CROP_WIDTH / 3}
                      y1={0}
                      x2={CROP_WIDTH / 3}
                      y2={CROP_HEIGHT}
                      stroke="rgba(255, 255, 255, 0.25)"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1={(CROP_WIDTH * 2) / 3}
                      y1={0}
                      x2={(CROP_WIDTH * 2) / 3}
                      y2={CROP_HEIGHT}
                      stroke="rgba(255, 255, 255, 0.25)"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1={0}
                      y1={CROP_HEIGHT / 3}
                      x2={CROP_WIDTH}
                      y2={CROP_HEIGHT / 3}
                      stroke="rgba(255, 255, 255, 0.25)"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1={0}
                      y1={(CROP_HEIGHT * 2) / 3}
                      x2={CROP_WIDTH}
                      y2={(CROP_HEIGHT * 2) / 3}
                      stroke="rgba(255, 255, 255, 0.25)"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                  </svg>
                )}

                {/* Badge de instrução de arraste */}
                <div className="absolute bottom-2 inset-x-0 flex justify-center pointer-events-none">
                  <span className="rounded-full bg-slate-900/80 px-2.5 py-0.5 text-[10px] font-medium text-slate-300 backdrop-blur-sm border border-slate-700/60 shadow">
                    Arraste para centralizar o rosto
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Dica de proporção oficial */}
          <div className="mt-3 flex items-center justify-between w-full max-w-[270px] text-[10px] text-slate-400">
            <span className="flex items-center gap-1 font-semibold text-slate-300">
              <Maximize2 className="h-3 w-3 text-school-blue-400" />
              Proporção 3x4
            </span>
            <button
              type="button"
              onClick={() => setTipoMascara(tipoMascara === 'oval' ? 'retangular' : 'oval')}
              className="text-school-blue-400 hover:text-school-blue-300 underline font-medium"
            >
              {tipoMascara === 'oval' ? 'Máscara Retangular' : 'Máscara Facial Oval'}
            </button>
          </div>
        </div>

        {/* Barra de Ferramentas & Controles de Edição */}
        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 space-y-4">
          {/* Controle de Zoom Slider & Botões */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={diminuirZoom}
              title="Diminuir Zoom"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <div className="flex-1 flex items-center gap-2">
              <input
                type="range"
                min="0.4"
                max="3.5"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-school-blue-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700"
              />
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 w-10 text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>
            <button
              type="button"
              onClick={aumentarZoom}
              title="Aumentar Zoom"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          {/* Controles de Rotação 90° e Redefinição */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={girarAntiHorario}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                title="Girar 90° anti-horário"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                -90°
              </button>
              <button
                type="button"
                onClick={girarHorario}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                title="Girar 90° horário"
              >
                <RotateCw className="h-3.5 w-3.5" />
                +90°
              </button>
            </div>

            <button
              type="button"
              onClick={resetarAjustes}
              className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <RefreshCw className="h-3 w-3" />
              Redefinir
            </button>
          </div>

          {/* Botões de Ação Final */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onCancelar}
              disabled={processandoEnvio}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirmarRecorte}
              disabled={processandoEnvio || carregandoImagem || Boolean(erroImagem)}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-school-blue-600 text-white text-xs font-bold hover:bg-school-blue-700 disabled:opacity-50 shadow-md shadow-school-blue-500/20 transition-all"
            >
              {processandoEnvio ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Enviando foto para o Google Drive...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Confirmar & Salvar Foto 3x4</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
