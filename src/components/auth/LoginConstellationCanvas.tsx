'use client';

import React, { useEffect, useRef } from 'react';

interface LoginConstellationCanvasProps {
  theme?: 'light' | 'dark';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  originX: number;
  originY: number;
  radius: number;
  baseAlpha: number;
  colorType: 'gold' | 'blue' | 'accent' | 'white';
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export default function LoginConstellationCanvas({ theme = 'dark' }: LoginConstellationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    // Redução de movimento por acessibilidade
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Mouse tracking relativo ao canvas
    const mouse = {
      x: -1000,
      y: -1000,
      active: false,
    };

    let particles: Particle[] = [];
    const ripples: Ripple[] = [];

    // Paleta de cores dinâmica conforme o tema
    const isDark = theme === 'dark';
    const colors = {
      gold: isDark ? '244, 180, 0' : '217, 119, 6',
      blue: isDark ? '96, 165, 250' : '37, 99, 235',
      accent: isDark ? '56, 189, 248' : '30, 58, 138',
      white: isDark ? '255, 255, 255' : '15, 23, 42',
    };

    const initParticles = () => {
      particles = [];
      // Quantidade calibrada para alta densidade e excelente taxa de quadros (60fps)
      const count = Math.min(Math.floor((width * height) / 11000), 55);

      for (let i = 0; i < count; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const colorRand = Math.random();
        let colorType: Particle['colorType'] = 'gold';

        if (colorRand < 0.45) colorType = 'blue';
        else if (colorRand < 0.75) colorType = 'gold';
        else if (colorRand < 0.90) colorType = 'accent';
        else colorType = 'white';

        particles.push({
          x,
          y,
          originX: x,
          originY: y,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          radius: Math.random() * 1.8 + 1.2,
          baseAlpha: Math.random() * 0.45 + (isDark ? 0.35 : 0.25),
          colorType,
        });
      }
    };

    const resize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      width = rect.width;
      height = rect.height;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      initParticles();
    };

    resize();

    const handlePointerMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };

    const handlePointerLeave = () => {
      mouse.active = false;
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      ripples.push({
        x: clickX,
        y: clickY,
        radius: 5,
        maxRadius: 180,
        alpha: 0.65,
      });

      // Efeito de impulso nas partículas próximas ao clique
      particles.forEach((p) => {
        const dx = p.x - clickX;
        const dy = p.y - clickY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180 && dist > 0) {
          const force = (1 - dist / 180) * 3.5;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
      });
    };

    // Anexar escutadores no contêiner pai
    const parent = canvas.parentElement || window;
    parent.addEventListener('mousemove', handlePointerMove as any);
    parent.addEventListener('mouseleave', handlePointerLeave as any);
    parent.addEventListener('click', handleClick as any);
    window.addEventListener('resize', resize);

    // Loop de animação
    const maxLineDist = 125;
    const maxMouseDist = 155;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Processar e desenhar anéis de impacto (ripples)
      for (let r = ripples.length - 1; r >= 0; r--) {
        const ripple = ripples[r];
        ripple.radius += 3.2;
        ripple.alpha *= 0.96;

        ctx.save();
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${colors.gold}, ${ripple.alpha})`;
        ctx.lineWidth = 1.8;
        ctx.shadowColor = `rgba(${colors.gold}, 0.8)`;
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();

        if (ripple.radius >= ripple.maxRadius || ripple.alpha < 0.02) {
          ripples.splice(r, 1);
        }
      }

      // 2. Traçar conexões neurais entre as partículas
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxLineDist) {
            const alpha = (1 - dist / maxLineDist) * (isDark ? 0.28 : 0.18);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${colors.blue}, ${alpha})`;
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }
        }
      }

      // 3. Conexão e filamentos de luz com o cursor do usuário
      if (mouse.active) {
        // Halo sutil no cursor
        const gradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, maxMouseDist);
        gradient.addColorStop(0, `rgba(${colors.gold}, ${isDark ? 0.22 : 0.15})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, maxMouseDist, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxMouseDist) {
            const alpha = (1 - dist / maxMouseDist) * (isDark ? 0.65 : 0.45);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(${colors.gold}, ${alpha})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Puxão elástico suave / dispersão do cursor
            const push = (1 - dist / maxMouseDist) * 0.45;
            p.vx += (dx / dist) * push * 0.15;
            p.vy += (dy / dist) * push * 0.15;
          }
        }
      }

      // 4. Atualizar e desenhar cada partícula
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!prefersReducedMotion) {
          p.x += p.vx;
          p.y += p.vy;

          // Amortecimento suave da velocidade após impulsos do cursor ou cliques
          p.vx *= 0.985;
          p.vy *= 0.985;

          // Limites da tela com retorno suave (bounce)
          if (p.x < 0) { p.x = 0; p.vx *= -1; }
          if (p.x > width) { p.x = width; p.vx *= -1; }
          if (p.y < 0) { p.y = 0; p.vy *= -1; }
          if (p.y > height) { p.y = height; p.vy *= -1; }
        }

        // Desenhar ponto luminoso com brilho focal
        const pColor = colors[p.colorType];
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${pColor}, ${p.baseAlpha})`;
        ctx.shadowColor = `rgba(${pColor}, ${isDark ? 0.8 : 0.4})`;
        ctx.shadowBlur = p.radius * 3.5;
        ctx.fill();
        ctx.restore();
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    if (prefersReducedMotion) {
      render();
    } else {
      animationFrameId = requestAnimationFrame(render);
    }

    // Pausar animação quando a aba não estiver visível para economia de bateria
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelAnimationFrame(animationFrameId);
      parent.removeEventListener('mousemove', handlePointerMove as any);
      parent.removeEventListener('mouseleave', handlePointerLeave as any);
      parent.removeEventListener('click', handleClick as any);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-[1] opacity-90 transition-opacity duration-700"
      aria-hidden="true"
    />
  );
}
