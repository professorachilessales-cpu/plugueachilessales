'use client';

import React, { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { 
  Quote as QuoteIcon, 
  RefreshCw, 
  GraduationCap, 
  Zap, 
  ShieldCheck, 
  Sparkles
} from 'lucide-react';
import LoginConstellationCanvas from './LoginConstellationCanvas';

export interface InspiringQuote {
  quote: string;
  author: string;
  role: string;
}

export const INSPIRING_QUOTES: InspiringQuote[] = [
  {
    quote: "A educação é a arma mais poderosa que você pode usar para mudar o mundo.",
    author: "Nelson Mandela",
    role: "Líder Humanitário & Prêmio Nobel da Paz"
  },
  {
    quote: "Se a educação sozinha não transforma a sociedade, sem ela tampouco a sociedade muda.",
    author: "Paulo Freire",
    role: "Patrono da Educação Brasileira"
  },
  {
    quote: "Investir em conhecimento rende sempre os melhores juros.",
    author: "Benjamin Franklin",
    role: "Cientista e Polímata"
  },
  {
    quote: "A educação tem raízes amargas, mas os seus frutos são doces.",
    author: "Aristóteles",
    role: "Filósofo da Grécia Antiga"
  },
  {
    quote: "O principal objetivo da educação é criar indivíduos capazes de fazer coisas novas, e não simplesmente repetir o que outras gerações fizeram.",
    author: "Jean Piaget",
    role: "Epistemólogo e Psicólogo do Desenvolvimento"
  },
  {
    quote: "Feliz aquele que transfere o que sabe e aprende o que ensina.",
    author: "Cora Coralina",
    role: "Poetisa e Contista Brasileira"
  },
  {
    quote: "Ensinar é um exercício de imortalidade. De alguma forma continuamos a viver naqueles cujos olhos aprenderam a ver o mundo pela magia da nossa palavra.",
    author: "Rubem Alves",
    role: "Educador, Escritor e Psicanalista"
  },
  {
    quote: "A educação não é uma preparação para a vida; a educação é a própria vida.",
    author: "John Dewey",
    role: "Filósofo e Reformador Pedagógico"
  }
];

interface LoginVisualShowcaseProps {
  nomeEscola?: string;
  theme?: 'light' | 'dark';
}

export default function LoginVisualShowcase({ 
  nomeEscola = 'Escola Técnica Estadual Professor Achiles Sales',
  theme = 'dark' 
}: LoginVisualShowcaseProps) {
  // Citação dinâmica
  const [citacaoIndex, setCitacaoIndex] = useState(() => Math.floor(Math.random() * INSPIRING_QUOTES.length));
  const [fadeCitacao, setFadeCitacao] = useState(true);
  const [isRotatingQuote, setIsRotatingQuote] = useState(false);

  // Efeito 3D Tilt interativo do Hero Card
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
  const cardRef = useRef<HTMLDivElement | null>(null);

  const handleCardMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Rotação suave entre -7deg e +7deg
    const rotateX = -((y - centerY) / centerY) * 7;
    const rotateY = ((x - centerX) / centerX) * 7;

    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setTilt({ x: rotateX, y: rotateY });
    setGlare({ x: glareX, y: glareY, opacity: 0.22 });
  }, []);

  const handleCardMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setGlare({ x: 50, y: 50, opacity: 0 });
  }, []);

  const trocarCitacao = () => {
    setIsRotatingQuote(true);
    setFadeCitacao(false);
    setTimeout(() => {
      setCitacaoIndex((prev) => (prev + 1) % INSPIRING_QUOTES.length);
      setFadeCitacao(true);
      setIsRotatingQuote(false);
    }, 220);
  };

  const citacaoAtual = INSPIRING_QUOTES[citacaoIndex];

  return (
    <section 
      className="hidden lg:flex relative lg:w-[52%] xl:w-[55%] flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-white/10 bg-gradient-to-br from-slate-100 dark:from-slate-950 via-blue-50 dark:via-school-blue-950 to-slate-200 dark:to-slate-900 select-none"
      aria-label="Painel visual e institucional animado da plataforma"
    >
      {/* ========================================================================= */}
      {/* 1. CAMADA INTERATIVA: REDE NEURAL DE CONSTELAÇÃO EM CANVAS                */}
      {/* ========================================================================= */}
      <LoginConstellationCanvas theme={theme} />

      {/* ========================================================================= */}
      {/* 2. AURORAS VOLUMÉTRICAS PULSANTES & ILUMINAÇÃO DE PROFUNDIDADE            */}
      {/* ========================================================================= */}
      <div 
        className="absolute -top-28 -left-28 h-[440px] w-[440px] rounded-full bg-gradient-to-br from-school-gold-400/25 to-amber-500/10 blur-[130px] pointer-events-none animate-aurora-1" 
        aria-hidden="true"
      />
      <div 
        className="absolute top-1/3 -right-24 h-[460px] w-[460px] rounded-full bg-gradient-to-br from-school-blue-500/25 via-blue-600/15 to-transparent blur-[140px] pointer-events-none animate-aurora-2" 
        aria-hidden="true"
      />
      <div 
        className="absolute -bottom-24 left-1/4 h-[380px] w-[380px] rounded-full bg-gradient-to-br from-cyan-500/15 via-school-gold-500/10 to-transparent blur-[120px] pointer-events-none animate-aurora-3" 
        aria-hidden="true"
      />

      {/* Malha sutil com máscara radial */}
      <div 
        className="absolute inset-0 opacity-[0.035] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" 
        aria-hidden="true"
      />

      {/* ========================================================================= */}
      {/* 3. TOPO: IDENTIDADE VISUAL & TÍTULO INSTITUCIONAL (ENTRANCE HEADER)       */}
      {/* ========================================================================= */}
      <div className="relative z-10 space-y-4 animate-entrance-header">
        <div className="flex items-center gap-3.5">
          {/* Logo da Aplicação com micro-glow interativo */}
          <div className="relative group">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-school-gold-400 to-amber-500 opacity-30 blur-sm group-hover:opacity-75 transition duration-500" />
            <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-school-gold-400/50 p-1.5 shadow-xl shadow-school-gold-500/15 flex items-center justify-center backdrop-blur-md transition-transform duration-300 group-hover:scale-105">
              <Image 
                src="/logo-plugue.png" 
                alt="Logo PLUGUE" 
                width={48} 
                height={48} 
                className="object-contain drop-shadow-md rounded-xl"
                priority
              />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                PLUGUE
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-school-gold-500/15 text-school-gold-700 dark:text-school-gold-400 border border-school-gold-400/30">
                <Sparkles className="h-2.5 w-2.5" /> OS 2.0
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
              Plataforma Unificada de Gestão Educacional
            </p>
          </div>
        </div>

        {/* Nome da Escola com Tipografia Imponente e Profissional */}
        <div className="pt-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-white text-balance leading-tight drop-shadow-sm">
            {nomeEscola}
          </h1>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. CENTRO VISUAL: COMPOSIÇÃO 3D ISOMÉTRICA COM PARALLAX E BADGES FLUTUANTES*/}
      {/* ========================================================================= */}
      <div 
        className="relative z-10 my-4 sm:my-6 lg:my-4 flex items-center justify-center [perspective:1200px] animate-entrance-hero"
      >
        <div
          ref={cardRef}
          onMouseMove={handleCardMouseMove}
          onMouseLeave={handleCardMouseLeave}
          style={{
            transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.01, 1.01, 1.01)`,
            transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="relative w-full max-w-lg group cursor-pointer"
        >
          {/* Anel de luz giratório (Border Beam) */}
          <div className="absolute -inset-[2px] rounded-3xl overflow-hidden pointer-events-none">
            <div 
              className="absolute -inset-[100%] animate-border-beam opacity-60 dark:opacity-80"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0deg, #f4b400 60deg, transparent 120deg, #3b82f6 240deg, transparent 300deg)',
              }}
            />
          </div>

          {/* Moldura do Card Glassmorphism */}
          <div className="relative rounded-3xl p-2.5 sm:p-3.5 bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/15 shadow-2xl backdrop-blur-2xl overflow-hidden">
            
            {/* Imagem Isométrica 3D */}
            <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden rounded-2xl bg-white/90 dark:bg-slate-900/90 shadow-inner">
              <Image 
                src="/login-isometric-3d.jpg" 
                alt="Composição Educacional e Tecnológica PLUGUE" 
                fill 
                className="object-cover object-center transform transition-transform duration-700 ease-out group-hover:scale-105"
                priority
              />

              {/* Vinheta atmosférica */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/15 to-transparent pointer-events-none" />

              {/* Reflexo Especular Dinâmico (Specular Glare) que segue o mouse */}
              <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                style={{
                  background: `radial-gradient(circle 280px at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, 0.35), transparent 70%)`,
                  opacity: glare.opacity,
                }}
              />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BADGES HOLOGRÁFICAS FLUTUANTES (ANTI-GRAVITY ORBITING CHIPS)               */}
          {/* ========================================================================= */}

          {/* Badge 1: Topo Direito — Gestão Pedagógica */}
          <div 
            className="absolute -top-4 -right-4 sm:-top-5 sm:-right-5 z-20 animate-entrance-badge-1 animate-desktop-float-1 pointer-events-none"
          >
            <div className="flex items-center gap-2.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-school-gold-400/40 p-2.5 sm:p-3 shadow-xl shadow-school-gold-500/10 backdrop-blur-xl">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-school-gold-400 to-amber-500 text-slate-950 shadow-md">
                <GraduationCap className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight">
                  Gestão Pedagógica
                </p>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-school-gold-500 animate-pulse-gold-ring" />
                  <span className="text-[9px] font-semibold text-school-gold-700 dark:text-school-gold-400 uppercase tracking-wider">
                    Ativa & Integrada
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Badge 2: Base Esquerda — Sincronização em Tempo Real */}
          <div 
            className="absolute -bottom-4 -left-4 sm:-bottom-5 sm:-left-5 z-20 animate-entrance-badge-2 animate-desktop-float-2 pointer-events-none"
          >
            <div className="flex items-center gap-2.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-emerald-400/40 p-2.5 sm:p-3 shadow-xl shadow-emerald-500/10 backdrop-blur-xl">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
                <Zap className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight">
                  Sincronização Ativa
                </p>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-ring" />
                  <span className="text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    Tempo Real • PWA
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Badge 3: Centro / Flutuante — Segurança 256-bit */}
          <div 
            className="hidden xl:flex absolute top-1/2 -left-8 -translate-y-1/2 z-20 animate-entrance-badge-3 animate-desktop-float-3 pointer-events-none items-center gap-2 rounded-xl bg-white/85 dark:bg-slate-900/85 border border-school-blue-400/30 px-3 py-1.5 shadow-lg backdrop-blur-lg"
          >
            <ShieldCheck className="h-4 w-4 text-school-blue-600 dark:text-school-blue-400" />
            <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">
              SSL / TLS 256-bit
            </span>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. RODAPÉ: CITAÇÕES INSPIRADORAS DINÂMICAS COM SHIMMER BEAM               */}
      {/* ========================================================================= */}
      <div className="relative z-10 pt-2 animate-entrance-quote">
        <div className="relative rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 p-4 sm:p-5 backdrop-blur-xl shadow-lg overflow-hidden">
          
          {/* Linha de brilho contínuo no topo do box (Shimmer Sweep) */}
          <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden pointer-events-none">
            <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-school-gold-400 to-transparent animate-shimmer-sweep" />
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-school-gold-700 dark:text-school-gold-400 text-xs font-bold uppercase tracking-wider">
              <QuoteIcon className="h-4 w-4 shrink-0 fill-school-gold-400/20" />
              <span>Citação Inspiradora</span>
            </div>

            {/* Botão de Alternar Citação com Giro e Fade */}
            <button
              type="button"
              onClick={trocarCitacao}
              title="Sortear outra citação inspiradora"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 transition-all"
              aria-label="Sortear outra frase de impacto sobre educação"
            >
              <RefreshCw className={`h-3 w-3 transition-transform duration-500 ${isRotatingQuote ? 'rotate-180' : ''}`} />
              <span className="hidden sm:inline">Nova Frase</span>
            </button>
          </div>

          {/* Texto da Citação com Transição Suave (Fade) */}
          <div 
            className={`mt-2.5 transition-all duration-300 transform ${
              fadeCitacao ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            <blockquote className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 italic font-medium leading-relaxed">
              &ldquo;{citacaoAtual.quote}&rdquo;
            </blockquote>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-school-gold-700 dark:text-school-gold-300">
                — {citacaoAtual.author}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                ({citacaoAtual.role})
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
